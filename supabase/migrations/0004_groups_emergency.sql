-- StudyBuddy — F5 (classi di gruppo) + F6 (lezioni d'emergenza)

create type group_member_status as enum ('invited', 'active', 'removed');
create type emergency_status as enum ('open', 'matched', 'cancelled');
create type offer_status as enum ('offered', 'accepted', 'declined');

-- ============================================================================
-- Classi di gruppo
-- ============================================================================
create table public.study_groups (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  subject_id text references public.subjects (id) on delete set null,
  description text not null default '',
  created_at timestamptz not null default now()
);
create index study_groups_tutor_idx on public.study_groups (tutor_id);

create table public.group_members (
  group_id uuid not null references public.study_groups (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  status group_member_status not null default 'active',
  invited_external boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (group_id, student_id)
);
create index group_members_student_idx on public.group_members (student_id);

create table public.group_sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  mode slot_mode not null default 'online',
  topic text not null default '',
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index group_sessions_group_idx on public.group_sessions (group_id, starts_at);

alter table public.study_groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_sessions enable row level security;

create policy "groups_owner_all" on public.study_groups
  for all to authenticated using (auth.uid() = tutor_id) with check (auth.uid() = tutor_id);
create policy "groups_member_read" on public.study_groups
  for select to authenticated using (
    exists (select 1 from public.group_members m
      where m.group_id = id and m.student_id = auth.uid() and m.status = 'active')
  );

create policy "group_members_owner_all" on public.group_members
  for all to authenticated using (
    exists (select 1 from public.study_groups g where g.id = group_id and g.tutor_id = auth.uid())
  ) with check (
    exists (select 1 from public.study_groups g where g.id = group_id and g.tutor_id = auth.uid())
  );
create policy "group_members_self_read" on public.group_members
  for select to authenticated using (auth.uid() = student_id);

create policy "group_sessions_owner_all" on public.group_sessions
  for all to authenticated using (
    exists (select 1 from public.study_groups g where g.id = group_id and g.tutor_id = auth.uid())
  ) with check (
    exists (select 1 from public.study_groups g where g.id = group_id and g.tutor_id = auth.uid())
  );
create policy "group_sessions_member_read" on public.group_sessions
  for select to authenticated using (
    exists (select 1 from public.group_members m
      where m.group_id = group_id and m.student_id = auth.uid() and m.status = 'active')
  );

create or replace function public.my_groups()
returns table (
  id uuid, name text, subject_name text, is_owner boolean,
  members_count bigint, next_session_at timestamptz, next_session_topic text
)
language sql stable security definer set search_path = public as $$
  select g.id, g.name, s.name, g.tutor_id = auth.uid(),
    (select count(*) from public.group_members m where m.group_id = g.id and m.status = 'active'),
    ns.starts_at, ns.topic
  from public.study_groups g
  left join public.subjects s on s.id = g.subject_id
  left join lateral (
    select se.starts_at, se.topic from public.group_sessions se
    where se.group_id = g.id and se.ends_at > now()
    order by se.starts_at limit 1
  ) ns on true
  where g.tutor_id = auth.uid()
     or exists (select 1 from public.group_members m
        where m.group_id = g.id and m.student_id = auth.uid() and m.status = 'active')
  order by ns.starts_at nulls last, g.created_at desc;
$$;
grant execute on function public.my_groups to authenticated;

create or replace function public.group_detail(p_id uuid)
returns table (
  id uuid, name text, description text, subject_name text, is_owner boolean, tutor_name text,
  members jsonb, sessions jsonb
)
language sql stable security definer set search_path = public as $$
  select g.id, g.name, g.description, s.name, g.tutor_id = auth.uid(),
    (select tp.first_name || ' ' || tp.last_name from public.profiles tp where tp.id = g.tutor_id),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'student_id', m.student_id,
        'first_name', p.first_name, 'last_name', p.last_name,
        'avatar_url', p.avatar_url, 'external', m.invited_external))
      from public.group_members m join public.profiles p on p.id = m.student_id
      where m.group_id = g.id and m.status = 'active'
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', se.id, 'starts_at', se.starts_at, 'ends_at', se.ends_at,
        'mode', se.mode, 'topic', se.topic) order by se.starts_at)
      from public.group_sessions se where se.group_id = g.id
    ), '[]'::jsonb)
  from public.study_groups g
  left join public.subjects s on s.id = g.subject_id
  where g.id = p_id
    and (g.tutor_id = auth.uid()
      or exists (select 1 from public.group_members m
        where m.group_id = g.id and m.student_id = auth.uid() and m.status = 'active'));
$$;
grant execute on function public.group_detail to authenticated;

-- ============================================================================
-- Lezioni d'emergenza
-- ============================================================================
create table public.emergency_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  subject_id text references public.subjects (id) on delete set null,
  note text not null default '',
  mode booking_mode not null default 'online',
  when_pref text not null default '',
  broadcast boolean not null default true,
  target_tutor_id uuid references public.profiles (id) on delete set null,
  status emergency_status not null default 'open',
  created_at timestamptz not null default now()
);
create index emergency_requests_status_idx on public.emergency_requests (status, created_at);

create table public.emergency_offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.emergency_requests (id) on delete cascade,
  tutor_id uuid not null references public.profiles (id) on delete cascade,
  proposed_at timestamptz not null,
  note text not null default '',
  status offer_status not null default 'offered',
  created_at timestamptz not null default now(),
  unique (request_id, tutor_id)
);

alter table public.emergency_requests enable row level security;
alter table public.emergency_offers enable row level security;

create policy "emergency_student_all" on public.emergency_requests
  for all to authenticated using (auth.uid() = student_id) with check (auth.uid() = student_id);
-- i tutor leggono le richieste aperte (broadcast o a loro rivolte) — filtrate via RPC
create policy "emergency_tutor_read" on public.emergency_requests
  for select to authenticated using (
    status = 'open' and (broadcast or target_tutor_id = auth.uid())
  );

create policy "emergency_offers_tutor_all" on public.emergency_offers
  for all to authenticated using (auth.uid() = tutor_id) with check (auth.uid() = tutor_id);
create policy "emergency_offers_student_read" on public.emergency_offers
  for select to authenticated using (
    exists (select 1 from public.emergency_requests r where r.id = request_id and r.student_id = auth.uid())
  );
-- lo studente aggiorna lo stato dell'offerta (accetta/rifiuta)
create policy "emergency_offers_student_update" on public.emergency_offers
  for update to authenticated using (
    exists (select 1 from public.emergency_requests r where r.id = request_id and r.student_id = auth.uid())
  );

-- accettando un'offerta si crea una prenotazione d'emergenza confermata
create or replace function public.on_emergency_offer_accepted()
returns trigger language plpgsql security definer set search_path = public as $$
declare req public.emergency_requests;
begin
  if new.status = 'accepted' and new.status is distinct from old.status then
    select * into req from public.emergency_requests where id = new.request_id;
    update public.emergency_requests set status = 'matched' where id = new.request_id;
    update public.emergency_offers set status = 'declined'
      where request_id = new.request_id and id <> new.id;
    insert into public.bookings (
      tutor_id, student_id, subject_id, starts_at, ends_at, mode, status, is_emergency, message
    ) values (
      new.tutor_id, req.student_id, req.subject_id,
      new.proposed_at, new.proposed_at + interval '1 hour', req.mode, 'confirmed', true, req.note
    );
  end if;
  return new;
end;
$$;
create trigger emergency_offer_accepted
  after update on public.emergency_offers
  for each row execute function public.on_emergency_offer_accepted();

create or replace function public.open_emergencies()
returns table (id uuid, student_name text, subject_name text, note text, mode booking_mode, when_pref text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select e.id, p.first_name || ' ' || p.last_name, s.name, e.note, e.mode, e.when_pref, e.created_at
  from public.emergency_requests e
  join public.profiles p on p.id = e.student_id
  left join public.subjects s on s.id = e.subject_id
  where e.status = 'open'
    and e.student_id <> auth.uid()
    and (e.broadcast or e.target_tutor_id = auth.uid())
    and not exists (select 1 from public.emergency_offers o where o.request_id = e.id and o.tutor_id = auth.uid())
    and exists (select 1 from public.tutor_profiles tp where tp.profile_id = auth.uid())
  order by e.created_at desc;
$$;
grant execute on function public.open_emergencies to authenticated;

create or replace function public.my_emergencies()
returns table (
  id uuid, role text, status emergency_status, subject_name text, note text,
  mode booking_mode, when_pref text, created_at timestamptz, offers jsonb
)
language sql stable security definer set search_path = public as $$
  select e.id,
    case when e.student_id = auth.uid() then 'student' else 'tutor' end,
    e.status, s.name, e.note, e.mode, e.when_pref, e.created_at,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', o.id, 'tutor_id', o.tutor_id,
        'tutor_name', (select first_name || ' ' || last_name from public.profiles where id = o.tutor_id),
        'proposed_at', o.proposed_at, 'status', o.status, 'note', o.note))
      from public.emergency_offers o where o.request_id = e.id
    ), '[]'::jsonb)
  from public.emergency_requests e
  left join public.subjects s on s.id = e.subject_id
  where e.student_id = auth.uid()
     or exists (select 1 from public.emergency_offers o where o.request_id = e.id and o.tutor_id = auth.uid())
  order by e.created_at desc;
$$;
grant execute on function public.my_emergencies to authenticated;
