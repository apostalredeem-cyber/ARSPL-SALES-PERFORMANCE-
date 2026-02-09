-- Migration: Add Areas Master Table
-- Created: 2026-02-09
-- Description: Creates a master table for managing geographical areas/regions.

-- 1. Create Table
create table if not exists public.areas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  unique (name, city)
);

-- 2. Enable RLS
alter table public.areas enable row level security;

-- 3. RLS Policies
create policy "Authenticated users can view areas"
  on public.areas for select
  to authenticated
  using (true);

create policy "Admins can manage areas"
  on public.areas for all
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- 4. Permissions
grant all on public.areas to authenticated;
grant usage on nextval(pg_get_serial_sequence('public.areas', 'id')) to authenticated; -- Only if using auto-inc, but we use UUID
