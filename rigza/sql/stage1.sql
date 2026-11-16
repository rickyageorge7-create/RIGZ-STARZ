-- RIGZA rebuild: stage 1 (profiles and private profile photos).
-- This migration is additive; it does not alter the existing rigza_workspaces data.

create table if not exists public.rigza_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  student_id text not null unique default ('RIGZA-' || upper(replace(gen_random_uuid()::text, '-', ''))),
  full_name text not null check (length(trim(full_name)) between 1 and 100),
  school_name text not null default 'Starz University' check (length(trim(school_name)) between 1 and 140),
  programme text not null check (length(trim(programme)) between 1 and 140),
  academic_level text not null check (academic_level in ('Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate', 'Other')),
  phone text check (phone is null or length(phone) <= 32),
  avatar_path text,
  onboarding_complete boolean not null default false,
  deactivated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rigza_profiles_avatar_path_owner check (avatar_path is null or split_part(avatar_path, '/', 1) = user_id::text)
);

create index if not exists rigza_profiles_active_student_id_idx
  on public.rigza_profiles (student_id)
  where deactivated_at is null;

alter table public.rigza_profiles enable row level security;
revoke all on public.rigza_profiles from anon, public;
grant select, insert, update on public.rigza_profiles to authenticated;

drop policy if exists "Students can read their own RIGZA profile" on public.rigza_profiles;
-- A student may read only the profile row whose owner is the active Supabase user.
create policy "Students can read their own RIGZA profile"
  on public.rigza_profiles for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Students can create their own RIGZA profile" on public.rigza_profiles;
-- A student may create a profile only for their own authenticated user ID.
create policy "Students can create their own RIGZA profile"
  on public.rigza_profiles for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Students can update their own RIGZA profile" on public.rigza_profiles;
-- A student may update only their own profile; identity triggers protect the ID and deactivation state.
create policy "Students can update their own RIGZA profile"
  on public.rigza_profiles for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.set_rigza_profile_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists rigza_profiles_updated_at on public.rigza_profiles;
create trigger rigza_profiles_updated_at
  before update on public.rigza_profiles
  for each row execute function public.set_rigza_profile_updated_at();

-- Student IDs are permanent. Once a student deactivates their RIGZA profile, that profile cannot be reactivated by editing a client-visible row.
create or replace function public.guard_rigza_profile_identity()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'RIGZA profile owner cannot be changed';
  end if;
  if new.student_id is distinct from old.student_id then
    raise exception 'RIGZA Student ID cannot be changed';
  end if;
  if old.deactivated_at is not null and new.deactivated_at is null then
    raise exception 'A deactivated RIGZA profile cannot be reactivated';
  end if;
  return new;
end;
$$;

drop trigger if exists rigza_profiles_identity_guard on public.rigza_profiles;
create trigger rigza_profiles_identity_guard
  before update on public.rigza_profiles
  for each row execute function public.guard_rigza_profile_identity();

-- Private bucket; each authenticated user may manage only objects under their UUID folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('rigza-private', 'rigza-private', false, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Students can read their own private RIGZA files" on storage.objects;
-- Private profile files can be read only from the authenticated user's UUID folder.
create policy "Students can read their own private RIGZA files"
  on storage.objects for select to authenticated
  using (bucket_id = 'rigza-private' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Students can upload their own private RIGZA files" on storage.objects;
-- Uploads are limited to the private bucket and the authenticated user's UUID folder.
create policy "Students can upload their own private RIGZA files"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'rigza-private' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Students can update their own private RIGZA files" on storage.objects;
-- Replacing a profile photo is limited to objects in the authenticated user's folder.
create policy "Students can update their own private RIGZA files"
  on storage.objects for update to authenticated
  using (bucket_id = 'rigza-private' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'rigza-private' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Students can delete their own private RIGZA files" on storage.objects;
-- File deletion is limited to objects in the authenticated user's folder.
create policy "Students can delete their own private RIGZA files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'rigza-private' and (storage.foldername(name))[1] = auth.uid()::text);
