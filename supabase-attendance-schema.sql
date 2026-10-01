create table if not exists public.rigza_course_instructors (
  instructor_user_id uuid not null references auth.users(id) on delete cascade,
  course_code text not null check (length(trim(course_code)) > 0),
  approved_at timestamptz not null default now(),
  primary key (instructor_user_id, course_code)
);

create table if not exists public.rigza_attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  course_code text not null check (length(trim(course_code)) > 0),
  session_date date not null default current_date,
  instructor_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (course_code, session_date)
);

create table if not exists public.rigza_attendance_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.rigza_attendance_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_code text not null,
  session_date date not null,
  scanned_at timestamptz not null default now(),
  unique (session_id, user_id)
);

create unique index if not exists rigza_workspaces_student_id_unique
  on public.rigza_workspaces ((profile->>'studentId'))
  where profile ? 'studentId' and profile->>'studentId' <> '';

create index if not exists rigza_attendance_records_user_course_idx
  on public.rigza_attendance_records (user_id, course_code);

alter table public.rigza_course_instructors enable row level security;
alter table public.rigza_attendance_sessions enable row level security;
alter table public.rigza_attendance_records enable row level security;

revoke all on public.rigza_course_instructors from public, anon, authenticated;
revoke all on public.rigza_attendance_sessions from public, anon, authenticated;
revoke all on public.rigza_attendance_records from public, anon, authenticated;
grant select on public.rigza_attendance_records to authenticated;
grant all on public.rigza_course_instructors to service_role;
grant all on public.rigza_attendance_sessions to service_role;
grant all on public.rigza_attendance_records to service_role;

drop policy if exists "Students can read their own attendance records"
  on public.rigza_attendance_records;
create policy "Students can read their own attendance records"
  on public.rigza_attendance_records for select
  to authenticated
  using (auth.uid() = user_id);
