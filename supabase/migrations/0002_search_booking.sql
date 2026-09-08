-- StudyBuddy — Fase 2 (disponibilità, prenotazioni, portfolio) + Fase 3 (ricerca tutor)
-- Le letture cross-utente passano da funzioni SECURITY DEFINER: la RLS resta
-- "solo la propria riga" su tutte le tabelle.

create type slot_mode as enum ('in_person', 'online', 'both');
create type booking_mode as enum ('in_person', 'online');
create type booking_status as enum ('pending', 'confirmed', 'declined', 'cancelled', 'completed');
create type portfolio_status as enum ('active', 'removed');

-- ============================================================================
-- tutor_availability — slot concreti pubblicati dal tutor
-- ============================================================================
create table public.tutor_availability (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.profiles (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  mode slot_mode not null default 'both',
  note text not null default '',
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index tutor_availability_tutor_idx on public.tutor_availability (tutor_id, starts_at);

-- ============================================================================
-- bookings — richieste/lezioni tra studente e tutor
-- ============================================================================
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid references public.tutor_availability (id) on delete set null,
  tutor_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  subject_id text references public.subjects (id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  mode booking_mode not null,
  status booking_status not null default 'pending',
  is_emergency boolean not null default false,
  message text not null default '',
  tutor_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index bookings_tutor_idx on public.bookings (tutor_id, starts_at);
create index bookings_student_idx on public.bookings (student_id, starts_at);
-- al massimo una prenotazione "viva" per slot
create unique index bookings_active_slot_uniq on public.bookings (slot_id)
  where slot_id is not null and status in ('pending', 'confirmed');

create trigger bookings_set_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

-- ============================================================================
-- tutor_students — portfolio del tutor
-- ============================================================================
create table public.tutor_students (
  tutor_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  status portfolio_status not null default 'active',
  created_at timestamptz not null default now(),
  primary key (tutor_id, student_id)
);
create index tutor_students_student_idx on public.tutor_students (student_id);

-- alla conferma di una prenotazione lo studente entra nel portfolio
create or replace function public.on_booking_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'confirmed' and new.status is distinct from old.status then
    insert into public.tutor_students (tutor_id, student_id, status)
    values (new.tutor_id, new.student_id, 'active')
    on conflict (tutor_id, student_id) do update set status = 'active';
  end if;
  return new;
end;
$$;

create trigger bookings_confirmed_portfolio
  after update on public.bookings
  for each row execute function public.on_booking_confirmed();

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.tutor_availability enable row level security;
alter table public.bookings enable row level security;
alter table public.tutor_students enable row level security;

-- disponibilità: il tutor gestisce la propria; la lettura diretta è consentita
-- agli autenticati (l'identità di chi prenota vive in `bookings`, non qui).
create policy "availability_owner_all" on public.tutor_availability
  for all to authenticated using (auth.uid() = tutor_id) with check (auth.uid() = tutor_id);
create policy "availability_read" on public.tutor_availability
  for select to authenticated using (true);

-- bookings: visibili e modificabili solo alle due parti
create policy "bookings_parties_select" on public.bookings
  for select to authenticated using (auth.uid() = student_id or auth.uid() = tutor_id);
create policy "bookings_student_insert" on public.bookings
  for insert to authenticated
  with check (auth.uid() = student_id and status = 'pending');
create policy "bookings_student_cancel" on public.bookings
  for update to authenticated
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id and status = 'cancelled');
create policy "bookings_tutor_update" on public.bookings
  for update to authenticated
  using (auth.uid() = tutor_id)
  with check (auth.uid() = tutor_id);

-- portfolio: il tutor gestisce, lo studente legge le proprie righe
create policy "portfolio_tutor_all" on public.tutor_students
  for all to authenticated using (auth.uid() = tutor_id) with check (auth.uid() = tutor_id);
create policy "portfolio_student_select" on public.tutor_students
  for select to authenticated using (auth.uid() = student_id);

-- ============================================================================
-- Funzioni SECURITY DEFINER (letture cross-utente controllate)
-- ============================================================================

-- Ricerca tutor. p_mode: 'any' | 'in_person' | 'online'.
create or replace function public.search_tutors(
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_km int default 30,
  p_subject_id text default null,
  p_school_context school_context default null,
  p_level int default null,
  p_mode text default 'any',
  p_query text default null
)
returns table (
  id uuid,
  first_name text,
  last_name text,
  avatar_url text,
  location_label text,
  distance_km double precision,
  verified boolean,
  bio text,
  university_name text,
  degree_course text,
  delivery_in_person boolean,
  delivery_online boolean,
  teaches_high_school boolean,
  teaches_university boolean,
  subjects text[]
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with me as (
    select case
      when p_lat is not null and p_lng is not null
      then extensions.st_point(p_lng, p_lat, 4326)::extensions.geography
    end as pt
  ),
  base as (
    select
      p.id, p.first_name, p.last_name, p.avatar_url, p.location_label, p.location_geog,
      tp.verified, tp.bio, tp.university_name, tp.degree_course,
      tp.delivery_in_person, tp.delivery_online, tp.teaches_high_school, tp.teaches_university,
      coalesce(
        array_agg(distinct s.name) filter (
          where s.name is not null
          and (p_school_context is null or ts.school_context = p_school_context)
        ),
        '{}'
      ) as subjects
    from public.profiles p
    join public.tutor_profiles tp on tp.profile_id = p.id
    left join public.tutor_subjects ts on ts.tutor_id = p.id
    left join public.subjects s on s.id = ts.subject_id
    where p.role = 'tutor'
      and p.onboarding_completed_at is not null
      and tp.accepting_students
      and p.id <> auth.uid()
      and (
        p_school_context is null
        or (p_school_context = 'high_school' and tp.teaches_high_school)
        or (p_school_context = 'university' and tp.teaches_university)
      )
      and (p_mode <> 'online' or tp.delivery_online)
      and (p_mode <> 'in_person' or tp.delivery_in_person)
      and (
        p_subject_id is null
        or exists (
          select 1 from public.tutor_subjects x
          where x.tutor_id = p.id
            and x.subject_id = p_subject_id
            and (p_school_context is null or x.school_context = p_school_context)
            and (p_level is null or p_level between x.level_from and x.level_to)
        )
      )
      and (
        p_query is null
        or (p.first_name || ' ' || p.last_name) ilike '%' || p_query || '%'
      )
    group by p.id, tp.profile_id
  )
  select
    b.id, b.first_name, b.last_name, b.avatar_url, b.location_label,
    case
      when me.pt is not null and b.location_geog is not null
      then round((extensions.st_distance(b.location_geog, me.pt) / 1000)::numeric, 1)::double precision
    end as distance_km,
    b.verified, b.bio, b.university_name, b.degree_course,
    b.delivery_in_person, b.delivery_online, b.teaches_high_school, b.teaches_university,
    b.subjects
  from base b
  cross join me
  where (
    p_mode = 'online'
    or me.pt is null
    or b.location_geog is null
    or extensions.st_dwithin(b.location_geog, me.pt, p_radius_km * 1000)
    or (p_mode = 'any' and b.delivery_online)
  )
  order by b.verified desc, distance_km asc nulls last, b.first_name;
$$;
grant execute on function public.search_tutors to authenticated;

-- Scheda pubblica di un tutor (materie, titoli verificati, slot liberi).
create or replace function public.get_tutor(p_id uuid)
returns table (
  id uuid,
  first_name text,
  last_name text,
  avatar_url text,
  location_label text,
  verified boolean,
  bio text,
  university_name text,
  degree_course text,
  delivery_in_person boolean,
  delivery_online boolean,
  teaches_high_school boolean,
  teaches_university boolean,
  accepting_students boolean,
  subjects text[],
  credentials text[],
  free_slots bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id, p.first_name, p.last_name, p.avatar_url, p.location_label,
    tp.verified, tp.bio, tp.university_name, tp.degree_course,
    tp.delivery_in_person, tp.delivery_online, tp.teaches_high_school,
    tp.teaches_university, tp.accepting_students,
    coalesce((
      select array_agg(distinct s.name)
      from public.tutor_subjects ts
      join public.subjects s on s.id = ts.subject_id
      where ts.tutor_id = p.id
    ), '{}'),
    coalesce((
      select array_agg(
        c.title || case when c.institution <> '' then ' — ' || c.institution else '' end
      )
      from public.tutor_credentials c
      where c.tutor_id = p.id and c.verification_status = 'verified'
    ), '{}'),
    (
      select count(*)
      from public.tutor_availability a
      where a.tutor_id = p.id
        and a.ends_at > now()
        and not exists (
          select 1 from public.bookings b
          where b.slot_id = a.id and b.status in ('pending', 'confirmed')
        )
    )
  from public.profiles p
  join public.tutor_profiles tp on tp.profile_id = p.id
  where p.id = p_id
    and p.role = 'tutor'
    and p.onboarding_completed_at is not null;
$$;
grant execute on function public.get_tutor to authenticated;

-- Slot di un tutor visti da chi prenota: free / held / booked, senza identità.
create or replace function public.get_tutor_slots(p_tutor_id uuid)
returns table (
  id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  mode slot_mode,
  status text,
  mine boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id, a.starts_at, a.ends_at, a.mode,
    case
      when exists (select 1 from public.bookings b where b.slot_id = a.id and b.status = 'confirmed') then 'booked'
      when exists (select 1 from public.bookings b where b.slot_id = a.id and b.status = 'pending') then 'held'
      else 'free'
    end as status,
    exists (
      select 1 from public.bookings b
      where b.slot_id = a.id and b.student_id = auth.uid() and b.status in ('pending', 'confirmed')
    ) as mine
  from public.tutor_availability a
  where a.tutor_id = p_tutor_id and a.ends_at > now()
  order by a.starts_at;
$$;
grant execute on function public.get_tutor_slots to authenticated;

-- Prenotazioni dell'utente (studente o tutor), arricchite con la controparte.
create or replace function public.my_bookings()
returns table (
  id uuid,
  role text,
  status booking_status,
  mode booking_mode,
  starts_at timestamptz,
  ends_at timestamptz,
  is_emergency boolean,
  message text,
  tutor_note text,
  subject_name text,
  counterpart_id uuid,
  counterpart_first_name text,
  counterpart_last_name text,
  counterpart_avatar_url text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    b.id,
    case when b.student_id = auth.uid() then 'student' else 'tutor' end as role,
    b.status, b.mode, b.starts_at, b.ends_at, b.is_emergency, b.message, b.tutor_note,
    s.name as subject_name,
    cp.id, cp.first_name, cp.last_name, cp.avatar_url,
    b.created_at
  from public.bookings b
  left join public.subjects s on s.id = b.subject_id
  join public.profiles cp
    on cp.id = case when b.student_id = auth.uid() then b.tutor_id else b.student_id end
  where b.student_id = auth.uid() or b.tutor_id = auth.uid()
  order by b.starts_at;
$$;
grant execute on function public.my_bookings to authenticated;

-- Portfolio del tutor.
create or replace function public.my_students()
returns table (
  student_id uuid,
  first_name text,
  last_name text,
  avatar_url text,
  location_label text,
  since timestamptz,
  lessons_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ts.student_id, p.first_name, p.last_name, p.avatar_url, p.location_label, ts.created_at,
    (
      select count(*) from public.bookings b
      where b.tutor_id = auth.uid() and b.student_id = ts.student_id
        and b.status in ('confirmed', 'completed')
    )
  from public.tutor_students ts
  join public.profiles p on p.id = ts.student_id
  where ts.tutor_id = auth.uid() and ts.status = 'active'
  order by p.first_name;
$$;
grant execute on function public.my_students to authenticated;

-- Tutor a cui lo studente è iscritto.
create or replace function public.my_tutors()
returns table (
  tutor_id uuid,
  first_name text,
  last_name text,
  avatar_url text,
  verified boolean,
  since timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ts.tutor_id, p.first_name, p.last_name, p.avatar_url,
    coalesce(tp.verified, false), ts.created_at
  from public.tutor_students ts
  join public.profiles p on p.id = ts.tutor_id
  left join public.tutor_profiles tp on tp.profile_id = ts.tutor_id
  where ts.student_id = auth.uid() and ts.status = 'active'
  order by p.first_name;
$$;
grant execute on function public.my_tutors to authenticated;
