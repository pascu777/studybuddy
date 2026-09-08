-- Study Up — schema iniziale (Fase 1: accesso + onboarding + profilo)
-- Le tabelle sono già modellate sulla visione completa; calendario, chat, classi,
-- lezioni d'emergenza e catalogo esami universitari arrivano in migrazioni successive.

-- Su Supabase le estensioni vivono nello schema `extensions` (già nel search_path).
create schema if not exists extensions;
create extension if not exists postgis with schema extensions;

-- ============================================================================
-- ENUM
-- ============================================================================
create type user_role as enum ('tutor', 'student');
create type school_context as enum ('high_school', 'university');
create type verification_status as enum ('none', 'requested', 'verified', 'rejected');
-- Regime fiscale del tutor: 'occasional' = prestazione occasionale (< 5.000 €/anno),
-- 'vat' = con Partita IVA. Vincolato realmente in fase Pagamenti (F12).
create type fiscal_regime as enum ('occasional', 'vat');

-- ============================================================================
-- Helper: updated_at
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- profiles (1-1 con auth.users)
-- ============================================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  avatar_url text,
  role user_role,
  location_label text,
  location_lat double precision,
  location_lng double precision,
  location_geog extensions.geography(Point, 4326),
  school_context school_context,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_location_geog_idx on public.profiles using gist (location_geog);
create index profiles_role_idx on public.profiles (role);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Crea automaticamente la riga profiles alla registrazione, con i metadati passati
-- da supabase.auth.signUp({ options: { data: { first_name, last_name } } }).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- tutor_profiles (1-1 con profiles dove role = 'tutor')
-- ============================================================================
create table public.tutor_profiles (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  bio text not null default '',
  university_name text not null default '',
  degree_course text not null default '',
  teaches_high_school boolean not null default false,
  teaches_university boolean not null default false,
  delivery_in_person boolean not null default true,
  delivery_online boolean not null default true,
  verified boolean not null default false,
  accepting_students boolean not null default true,
  -- Predisposizione fiscale (vincoli applicati in F12 — Pagamenti).
  fiscal_regime fiscal_regime not null default 'occasional',
  partita_iva text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger tutor_profiles_set_updated_at
  before update on public.tutor_profiles
  for each row execute function public.set_updated_at();

-- ============================================================================
-- tutor_credentials (n per tutor) — titoli di studio, verificati su richiesta
-- ============================================================================
create table public.tutor_credentials (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  institution text not null default '',
  year int,
  document_url text,
  verification_status verification_status not null default 'none',
  requested_at timestamptz,
  reviewed_at timestamptz,
  reviewer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tutor_credentials_tutor_id_idx on public.tutor_credentials (tutor_id);

create trigger tutor_credentials_set_updated_at
  before update on public.tutor_credentials
  for each row execute function public.set_updated_at();

-- ============================================================================
-- student_profiles (1-1 con profiles dove role = 'student')
-- ============================================================================
create table public.student_profiles (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  school_type school_context not null,
  school_name text not null default '',
  -- Predisposizione modalità Università (F7): ateneo + corso di laurea.
  -- Il catalogo esami/insegnamenti/docenti sarà in una migrazione dedicata.
  university_name text not null default '',
  degree_course text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger student_profiles_set_updated_at
  before update on public.student_profiles
  for each row execute function public.set_updated_at();

-- ============================================================================
-- subjects (catalogo di riferimento, popolato da seed.sql)
-- ============================================================================
create table public.subjects (
  id text primary key,
  name text not null,
  area text not null,
  accent text not null default 'mint',
  applies_high_school boolean not null default true,
  applies_university boolean not null default true,
  sort_order int not null default 100
);

-- ============================================================================
-- tutor_subjects / student_subjects
-- ============================================================================
create table public.tutor_subjects (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.profiles (id) on delete cascade,
  subject_id text not null references public.subjects (id) on delete cascade,
  school_context school_context not null,
  level_from int not null default 1,
  level_to int not null default 5,
  created_at timestamptz not null default now(),
  unique (tutor_id, subject_id, school_context)
);

create index tutor_subjects_tutor_id_idx on public.tutor_subjects (tutor_id);
create index tutor_subjects_subject_id_idx on public.tutor_subjects (subject_id);

create table public.student_subjects (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  subject_id text not null references public.subjects (id) on delete cascade,
  school_context school_context not null,
  level int not null default 1,
  created_at timestamptz not null default now(),
  unique (student_id, subject_id)
);

create index student_subjects_student_id_idx on public.student_subjects (student_id);

-- ============================================================================
-- public_profiles — proiezione pubblica (campi non sensibili) per ricerca/chat
-- future. Gira come owner (security definer di default per le view), quindi
-- espone solo le colonne elencate qui.
-- ============================================================================
create view public.public_profiles as
select
  p.id,
  p.first_name,
  p.last_name,
  p.avatar_url,
  p.role,
  p.location_label,
  p.school_context,
  tp.verified as tutor_verified,
  tp.bio as tutor_bio,
  tp.university_name as tutor_university_name,
  tp.degree_course as tutor_degree_course,
  tp.teaches_high_school,
  tp.teaches_university,
  tp.delivery_in_person,
  tp.delivery_online,
  tp.accepting_students
from public.profiles p
left join public.tutor_profiles tp on tp.profile_id = p.id
where p.onboarding_completed_at is not null;

revoke all on public.public_profiles from anon;
grant select on public.public_profiles to authenticated;

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.tutor_profiles enable row level security;
alter table public.tutor_credentials enable row level security;
alter table public.student_profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.tutor_subjects enable row level security;
alter table public.student_subjects enable row level security;

-- profiles: ogni utente vede/gestisce solo la propria riga
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- tutor_profiles / student_profiles: legati al proprio profile_id
create policy "tutor_profiles_rw_own" on public.tutor_profiles
  for all to authenticated using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create policy "student_profiles_rw_own" on public.student_profiles
  for all to authenticated using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- tutor_credentials: solo il proprietario; da client non si può auto-verificare
create policy "tutor_credentials_select_own" on public.tutor_credentials
  for select to authenticated using (auth.uid() = tutor_id);
create policy "tutor_credentials_insert_own" on public.tutor_credentials
  for insert to authenticated
  with check (auth.uid() = tutor_id and verification_status in ('none', 'requested'));
create policy "tutor_credentials_update_own" on public.tutor_credentials
  for update to authenticated
  using (auth.uid() = tutor_id)
  with check (auth.uid() = tutor_id and verification_status in ('none', 'requested'));
create policy "tutor_credentials_delete_own" on public.tutor_credentials
  for delete to authenticated using (auth.uid() = tutor_id);

-- tutor_subjects / student_subjects
create policy "tutor_subjects_rw_own" on public.tutor_subjects
  for all to authenticated using (auth.uid() = tutor_id) with check (auth.uid() = tutor_id);
create policy "student_subjects_rw_own" on public.student_subjects
  for all to authenticated using (auth.uid() = student_id) with check (auth.uid() = student_id);

-- subjects: catalogo in sola lettura per gli autenticati
create policy "subjects_select_all" on public.subjects
  for select to authenticated using (true);

-- ============================================================================
-- Storage buckets: avatars (pubblico) e credentials (privato)
-- Le foto sono salvate sotto una cartella = auth.uid() del proprietario.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('credentials', 'credentials', false)
on conflict (id) do nothing;

create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "avatars_owner_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "credentials_owner_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'credentials' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "credentials_owner_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'credentials' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "credentials_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'credentials' and (storage.foldername(name))[1] = auth.uid()::text);
