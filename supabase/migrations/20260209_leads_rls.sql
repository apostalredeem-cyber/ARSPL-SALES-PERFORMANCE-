-- Migration: Leads RLS Policies
-- Created: 2026-02-09
-- Description: Enables RLS and configures access policies for the leads table.

-- 1. Enable RLS
alter table public.leads enable row level security;

-- 2. Clean up legacy policies (to avoid conflicts with new block requirements)
drop policy if exists "Staff view assigned leads" on public.leads;
drop policy if exists "Admins view all leads" on public.leads;
drop policy if exists "Staff can read leads" on public.leads;
drop policy if exists "Staff can create leads" on public.leads;

-- 3. Create New Policies
create policy "Staff can read leads"
  on public.leads for select
  to authenticated
  using (true);

create policy "Staff can create leads"
  on public.leads for insert
  to authenticated
  with check (auth.uid() = created_by);

-- 4. Admin Override (Recommended Security Layer)
create policy "Admins have full access to leads"
  on public.leads for all
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
