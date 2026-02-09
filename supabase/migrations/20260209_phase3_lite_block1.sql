-- Phase 3 Lite: Block 1 - Manual Lead Creation (Database Foundation)
-- Created: 2026-02-09
-- Description: Consolidates Areas master, Lead extensions, and RLS for manual entries.

-- ============================================================================
-- 1. AREAS MASTER TABLE
-- ============================================================================
create table if not exists public.areas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  unique (name, city)
);

-- ============================================================================
-- 2. LEADS ENHANCEMENTS (MANUAL CREATION SUPPORT)
-- ============================================================================
alter table public.leads
add column if not exists phone_number text,
add column if not exists area_id uuid references public.areas(id),
add column if not exists latitude numeric,
add column if not exists longitude numeric,
add column if not exists address text;

-- Data Integrity: Prevent duplicates & enforce mandatory fields
-- Note: These constraints are separate to allow graceful migration if data exists
create unique index if not exists idx_leads_phone_unique on public.leads(phone_number);

-- Apply NOT NULL constraints (Requires existing data to be sanitized)
-- alter table public.leads alter column phone_number set not null;
-- alter table public.leads alter column area_id set not null;

-- ============================================================================
-- 3. OWNERSHIP AUTOMATION (TRIGGERS)
-- ============================================================================

-- Generic creator tracking function
create or replace function public.handle_record_created_by()
returns trigger as $$
begin
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for Areas
drop trigger if exists tr_set_area_creator on public.areas;
create trigger tr_set_area_creator
  before insert on public.areas
  for each row execute function public.handle_record_created_by();

-- Trigger for Leads
drop trigger if exists tr_set_lead_creator on public.leads;
create trigger tr_set_lead_creator
  before insert on public.leads
  for each row execute function public.handle_record_created_by();

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
alter table public.areas enable row level security;
alter table public.leads enable row level security;

-- AREAS POLICIES
drop policy if exists "Staff can read areas" on public.areas;
create policy "Staff can read areas"
  on public.areas for select
  to authenticated
  using (true);

drop policy if exists "Staff can create areas" on public.areas;
create policy "Staff can create areas"
  on public.areas for insert
  to authenticated
  with check (auth.uid() = created_by);

-- LEADS POLICIES (Consolidated for Phase 3 Lite)
drop policy if exists "Staff can read leads" on public.leads;
create policy "Staff can read leads"
  on public.leads for select
  to authenticated
  using (true);

drop policy if exists "Staff can create leads" on public.leads;
create policy "Staff can create leads"
  on public.leads for insert
  to authenticated
  with check (auth.uid() = created_by);

-- Admin Overrides
drop policy if exists "Admins manage areas" on public.areas;
create policy "Admins manage areas"
  on public.areas for all
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ============================================================================
-- 5. PERMISSIONS
-- ============================================================================
grant all on public.areas to authenticated;
grant all on public.leads to authenticated;
