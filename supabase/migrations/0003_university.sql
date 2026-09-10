-- StudyBuddy — F7: modalità Università integrata (catalogo ateneo → corso di laurea
-- → esame/insegnamento → docente) e ricerca per esame.

create type degree_level as enum ('triennale', 'magistrale', 'ciclo_unico');

create table public.universities (
  id text primary key,
  name text not null,
  city text not null default ''
);

create table public.degree_courses (
  id text primary key,
  university_id text not null references public.universities (id) on delete cascade,
  name text not null,
  level degree_level not null default 'triennale'
);

create table public.professors (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  degree_course_id text not null references public.degree_courses (id) on delete cascade,
  name text not null,
  year int not null default 1,
  professor_id uuid references public.professors (id) on delete set null,
  subject_id text references public.subjects (id) on delete set null
);
create index courses_dc_idx on public.courses (degree_course_id);

create table public.tutor_courses (
  tutor_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (tutor_id, course_id)
);
create index tutor_courses_course_idx on public.tutor_courses (course_id);

create table public.student_courses (
  student_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (student_id, course_id)
);

alter table public.student_profiles add column degree_course_id text references public.degree_courses (id);
alter table public.tutor_profiles add column degree_course_id text references public.degree_courses (id);

-- Tariffa oraria del tutor (usata anche dai pagamenti, F12).
create table public.tutor_rates (
  tutor_id uuid primary key references public.profiles (id) on delete cascade,
  hourly_rate_cents int not null default 1500,
  currency text not null default 'EUR',
  updated_at timestamptz not null default now()
);
alter table public.tutor_rates enable row level security;
create policy "tutor_rates_owner_all" on public.tutor_rates
  for all to authenticated using (auth.uid() = tutor_id) with check (auth.uid() = tutor_id);
create policy "tutor_rates_read" on public.tutor_rates
  for select to authenticated using (true);

alter table public.universities enable row level security;
alter table public.degree_courses enable row level security;
alter table public.professors enable row level security;
alter table public.courses enable row level security;
alter table public.tutor_courses enable row level security;
alter table public.student_courses enable row level security;

create policy "cat_uni_read" on public.universities for select to authenticated using (true);
create policy "cat_dc_read" on public.degree_courses for select to authenticated using (true);
create policy "cat_prof_read" on public.professors for select to authenticated using (true);
create policy "cat_courses_read" on public.courses for select to authenticated using (true);
create policy "tutor_courses_rw_own" on public.tutor_courses
  for all to authenticated using (auth.uid() = tutor_id) with check (auth.uid() = tutor_id);
create policy "student_courses_rw_own" on public.student_courses
  for all to authenticated using (auth.uid() = student_id) with check (auth.uid() = student_id);

create or replace function public.list_degree_courses()
returns table (id text, name text, level degree_level, university_name text)
language sql stable security definer set search_path = public as $$
  select dc.id, dc.name, dc.level, u.name
  from public.degree_courses dc
  join public.universities u on u.id = dc.university_id
  order by u.name, dc.name;
$$;
grant execute on function public.list_degree_courses to authenticated;

create or replace function public.search_courses(
  p_query text default null,
  p_degree_course_id text default null
)
returns table (
  id uuid, name text, year int, degree_course_id text, degree_course_name text,
  university_name text, professor_name text, subject_id text, tutors_count bigint
)
language sql stable security definer set search_path = public as $$
  select
    c.id, c.name, c.year, c.degree_course_id, dc.name, u.name,
    coalesce(pr.name, ''), c.subject_id,
    (select count(*) from public.tutor_courses tc where tc.course_id = c.id)
  from public.courses c
  join public.degree_courses dc on dc.id = c.degree_course_id
  join public.universities u on u.id = dc.university_id
  left join public.professors pr on pr.id = c.professor_id
  where (p_degree_course_id is null or c.degree_course_id = p_degree_course_id)
    and (p_query is null or c.name ilike '%' || p_query || '%')
  order by c.year, c.name;
$$;
grant execute on function public.search_courses to authenticated;

-- Ricerca tutor per esame specifico (modalità università).
create or replace function public.search_tutors_by_course(
  p_course_id uuid,
  p_query text default null
)
returns table (
  id uuid, first_name text, last_name text, avatar_url text, location_label text,
  distance_km double precision, verified boolean, bio text,
  university_name text, degree_course text,
  delivery_in_person boolean, delivery_online boolean,
  teaches_high_school boolean, teaches_university boolean,
  subjects text[]
)
language sql stable security definer set search_path = public as $$
  select
    p.id, p.first_name, p.last_name, p.avatar_url, p.location_label,
    null::double precision as distance_km,
    tp.verified, tp.bio, tp.university_name, tp.degree_course,
    tp.delivery_in_person, tp.delivery_online, tp.teaches_high_school, tp.teaches_university,
    coalesce((
      select array_agg(distinct s.name)
      from public.tutor_courses tc2
      join public.courses c2 on c2.id = tc2.course_id
      left join public.subjects s on s.id = c2.subject_id
      where tc2.tutor_id = p.id and s.name is not null
    ), '{}')
  from public.tutor_courses tc
  join public.profiles p on p.id = tc.tutor_id
  join public.tutor_profiles tp on tp.profile_id = p.id
  where tc.course_id = p_course_id
    and p.onboarding_completed_at is not null
    and tp.accepting_students
    and p.id <> auth.uid()
    and (p_query is null or (p.first_name || ' ' || p.last_name) ilike '%' || p_query || '%')
  order by tp.verified desc, p.first_name;
$$;
grant execute on function public.search_tutors_by_course to authenticated;

-- Estende la scheda pubblica del tutor con gli esami coperti e la tariffa oraria.
-- Il set di colonne di ritorno cambia rispetto a 0002: va ricreata da zero.
drop function if exists public.get_tutor(uuid);
create or replace function public.get_tutor(p_id uuid)
returns table (
  id uuid, first_name text, last_name text, avatar_url text, location_label text,
  verified boolean, bio text, university_name text, degree_course text,
  delivery_in_person boolean, delivery_online boolean,
  teaches_high_school boolean, teaches_university boolean, accepting_students boolean,
  subjects text[], credentials text[], courses text[], free_slots bigint,
  hourly_rate_cents int
)
language sql stable security definer set search_path = public as $$
  select
    p.id, p.first_name, p.last_name, p.avatar_url, p.location_label,
    tp.verified, tp.bio, tp.university_name, tp.degree_course,
    tp.delivery_in_person, tp.delivery_online, tp.teaches_high_school,
    tp.teaches_university, tp.accepting_students,
    coalesce((select array_agg(distinct s.name)
      from public.tutor_subjects ts join public.subjects s on s.id = ts.subject_id
      where ts.tutor_id = p.id), '{}'),
    coalesce((select array_agg(
        c.title || case when c.institution <> '' then ' — ' || c.institution else '' end)
      from public.tutor_credentials c
      where c.tutor_id = p.id and c.verification_status = 'verified'), '{}'),
    coalesce((select array_agg(
        crs.name || coalesce(' · ' || pr.name, ''))
      from public.tutor_courses tc
      join public.courses crs on crs.id = tc.course_id
      left join public.professors pr on pr.id = crs.professor_id
      where tc.tutor_id = p.id), '{}'),
    (select count(*) from public.tutor_availability a
      where a.tutor_id = p.id and a.ends_at > now()
        and not exists (select 1 from public.bookings b
          where b.slot_id = a.id and b.status in ('pending', 'confirmed'))),
    (select tr.hourly_rate_cents from public.tutor_rates tr where tr.tutor_id = p.id)
  from public.profiles p
  join public.tutor_profiles tp on tp.profile_id = p.id
  where p.id = p_id and p.role = 'tutor' and p.onboarding_completed_at is not null;
$$;
grant execute on function public.get_tutor to authenticated;
