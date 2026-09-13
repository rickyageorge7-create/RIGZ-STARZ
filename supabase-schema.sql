create table if not exists public.rigza_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile jsonb not null default '{}'::jsonb,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.set_rigza_workspace_updated_at()
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

drop trigger if exists rigza_workspaces_updated_at
  on public.rigza_workspaces;

create trigger rigza_workspaces_updated_at
  before update on public.rigza_workspaces
  for each row
  execute function public.set_rigza_workspace_updated_at();

alter table public.rigza_workspaces enable row level security;

grant select, insert, update, delete
  on public.rigza_workspaces
  to authenticated;

create policy "Users can read their own workspace"
  on public.rigza_workspaces for select
  using (auth.uid() = user_id);

create policy "Users can create their own workspace"
  on public.rigza_workspaces for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own workspace"
  on public.rigza_workspaces for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own workspace"
  on public.rigza_workspaces for delete
  using (auth.uid() = user_id);
