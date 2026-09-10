-- StudyBuddy — F10: pannello di amministrazione.
-- Un admin verifica i titoli di studio dei tutor, marca i tutor come "verificati"
-- e consulta metriche di piattaforma e l'elenco utenti.
--
-- Il flag `profiles.is_admin` NON è impostabile dal client (un trigger lo blocca):
-- si concede solo da SQL editor / service role, come già avviene per
-- `tutor_credentials.verification_status = 'verified'`.

-- ============================================================================
-- Flag admin sul profilo
-- ============================================================================
alter table public.profiles add column if not exists is_admin boolean not null default false;
create index if not exists profiles_is_admin_idx on public.profiles (is_admin) where is_admin;

-- Impedisce l'auto-promozione: la policy `profiles_update_own` permette all'utente
-- di scrivere la propria riga, quindi qui riportiamo `is_admin` al valore
-- precedente per chiunque non sia il service role.
create or replace function public.protect_admin_flag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin and auth.role() <> 'service_role' then
    new.is_admin := old.is_admin;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_admin_flag on public.profiles;
create trigger profiles_protect_admin_flag
  before update on public.profiles
  for each row execute function public.protect_admin_flag();

-- ============================================================================
-- Helper: l'utente corrente è admin?
-- security definer => bypassa la RLS "own row only" senza ricorsione di policy.
-- ============================================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;
grant execute on function public.is_admin() to authenticated;

-- ============================================================================
-- admin_overview() — metriche di piattaforma (una riga)
-- ============================================================================
create or replace function public.admin_overview()
returns table (
  users_total bigint,
  students_total bigint,
  tutors_total bigint,
  tutors_verified bigint,
  tutors_pending bigint,
  credentials_pending bigint,
  bookings_total bigint,
  bookings_upcoming bigint,
  gmv_cents bigint,
  commission_cents bigint,
  emergencies_open bigint,
  groups_total bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select
    (select count(*) from public.profiles),
    (select count(*) from public.profiles where role = 'student'),
    (select count(*) from public.profiles where role = 'tutor'),
    (select count(*) from public.tutor_profiles where verified),
    (select count(*) from public.tutor_profiles where not verified),
    (select count(*) from public.tutor_credentials where verification_status = 'requested'),
    (select count(*) from public.bookings),
    (select count(*) from public.bookings b where b.status = 'confirmed' and b.ends_at > now()),
    (select coalesce(sum(b.price_cents), 0) from public.bookings b where b.status in ('confirmed', 'completed')),
    (select coalesce(sum(b.commission_cents), 0) from public.bookings b where b.status in ('confirmed', 'completed')),
    (select count(*) from public.emergency_requests where status = 'open'),
    (select count(*) from public.study_groups);
end;
$$;
grant execute on function public.admin_overview() to authenticated;

-- ============================================================================
-- admin_pending_credentials() — coda dei titoli da verificare
-- ============================================================================
create or replace function public.admin_pending_credentials()
returns table (
  id uuid,
  tutor_id uuid,
  tutor_name text,
  tutor_avatar_url text,
  tutor_verified boolean,
  title text,
  institution text,
  year int,
  document_url text,
  requested_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select
    c.id,
    c.tutor_id,
    trim(p.first_name || ' ' || p.last_name),
    p.avatar_url,
    coalesce(tp.verified, false),
    c.title,
    c.institution,
    c.year,
    c.document_url,
    c.requested_at
  from public.tutor_credentials c
  join public.profiles p on p.id = c.tutor_id
  left join public.tutor_profiles tp on tp.profile_id = c.tutor_id
  where c.verification_status = 'requested'
  order by c.requested_at asc nulls last, c.created_at asc;
end;
$$;
grant execute on function public.admin_pending_credentials() to authenticated;

-- ============================================================================
-- admin_review_credential() — approva / rifiuta un titolo
-- Approvazione => il tutor diventa "verificato". Notifica sempre il tutor.
-- ============================================================================
create or replace function public.admin_review_credential(
  p_id uuid,
  p_approve boolean,
  p_note text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tutor uuid;
  v_title text;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.tutor_credentials
    set verification_status = case when p_approve then 'verified' else 'rejected' end::verification_status,
        reviewed_at = now(),
        reviewer_note = coalesce(p_note, '')
    where id = p_id
    returning tutor_id, title into v_tutor, v_title;

  if v_tutor is null then
    raise exception 'credential not found' using errcode = 'P0002';
  end if;

  if p_approve then
    update public.tutor_profiles set verified = true where profile_id = v_tutor;
    perform public.notify(
      v_tutor, 'credential_verified', 'Titolo verificato',
      '"' || v_title || '" è stato verificato. Il tuo profilo ora mostra il badge Verificato.',
      '/(app)/profilo'
    );
  else
    perform public.notify(
      v_tutor, 'credential_rejected', 'Titolo non verificato',
      case when coalesce(p_note, '') <> ''
        then 'Verifica di "' || v_title || '" non riuscita: ' || p_note
        else 'La verifica di "' || v_title || '" non è andata a buon fine. Controlla i dati e il documento.' end,
      '/(app)/profilo'
    );
  end if;
end;
$$;
grant execute on function public.admin_review_credential(uuid, boolean, text) to authenticated;

-- ============================================================================
-- admin_set_tutor_verified() — forza / revoca lo stato "verificato" di un tutor
-- ============================================================================
create or replace function public.admin_set_tutor_verified(
  p_tutor_id uuid,
  p_verified boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.tutor_profiles set verified = p_verified where profile_id = p_tutor_id;

  perform public.notify(
    p_tutor_id,
    case when p_verified then 'tutor_verified' else 'tutor_unverified' end,
    case when p_verified then 'Profilo verificato' else 'Verifica revocata' end,
    case when p_verified
      then 'Un amministratore ha verificato il tuo profilo.'
      else 'Lo stato "verificato" del tuo profilo è stato revocato. Contatta il supporto per chiarimenti.' end,
    '/(app)/profilo'
  );
end;
$$;
grant execute on function public.admin_set_tutor_verified(uuid, boolean) to authenticated;

-- ============================================================================
-- admin_list_users() — elenco utenti con ricerca e filtro ruolo
-- ============================================================================
create or replace function public.admin_list_users(
  p_query text default '',
  p_role text default 'all',
  p_limit int default 100
)
returns table (
  id uuid,
  first_name text,
  last_name text,
  avatar_url text,
  role user_role,
  is_admin boolean,
  verified boolean,
  location_label text,
  onboarding_completed boolean,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select
    p.id,
    p.first_name,
    p.last_name,
    p.avatar_url,
    p.role,
    p.is_admin,
    coalesce(tp.verified, false),
    p.location_label,
    p.onboarding_completed_at is not null,
    p.created_at
  from public.profiles p
  left join public.tutor_profiles tp on tp.profile_id = p.id
  where (p_role = 'all' or p.role::text = p_role)
    and (
      coalesce(p_query, '') = ''
      or trim(p.first_name || ' ' || p.last_name) ilike '%' || p_query || '%'
      or p.location_label ilike '%' || p_query || '%'
    )
  order by p.created_at desc
  limit greatest(1, least(coalesce(p_limit, 100), 500));
end;
$$;
grant execute on function public.admin_list_users(text, text, int) to authenticated;
