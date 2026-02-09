-- Migration: CRM, Sales Pipeline & Visit Reporting (Phase 2)
-- Created: 2026-02-09
-- Description: Adds leads, visit_reports, and sales_pipeline tables with automation triggers.

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- Leads / Accounts Table
create table if not exists public.leads (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  client_type text check (client_type in ('Dealer', 'Architect', 'Builder', 'Retailer', 'Other')) default 'Retailer',
  status text not null default 'New Lead', -- Controlled by triggers
  expected_value numeric(12, 2) default 0,
  assigned_staff_id uuid references public.profiles(id),
  address text,
  contact_number text,
  last_visit_date timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Visit Reports Table
create table if not exists public.visit_reports (
  id uuid default uuid_generate_v4() primary key,
  lead_id uuid references public.leads(id) not null,
  work_plan_id uuid references public.daily_work_plans(id) not null,
  meeting_sequence int not null, -- Links to the sequence in planned_leads
  staff_id uuid references public.profiles(id) not null,
  
  status text check (status in ('Completed', 'Not Completed')) not null,
  discussion_summary text,
  outcome text check (outcome in ('Interested', 'Quotation Given', 'Order Confirmed', 'No Interest')),
  order_value numeric(12, 2) default 0,
  expected_order_date date,
  photo_url text,
  location geography(POINT), -- Captured ONLY on submission
  created_at timestamp with time zone default now(),

  -- Rule: Exactly ONE report per meeting in a work plan
  unique(work_plan_id, meeting_sequence)
);

-- Pipeline Analytics (Optional, but leads status is source of truth)
create table if not exists public.sales_pipeline_history (
  id uuid default uuid_generate_v4() primary key,
  lead_id uuid references public.leads(id) not null,
  old_status text,
  new_status text not null,
  changed_at timestamp with time zone default now()
);

-- ============================================================================
-- 2. AUTOMATION (TRIGGERS & FUNCTIONS)
-- ============================================================================

-- Function to update lead status from visit report
create or replace function public.handle_visit_report_submission()
returns trigger as $$
declare
  v_new_status text;
begin
  -- 1. Determine new status based on outcome
  v_new_status := case 
    when new.outcome = 'Order Confirmed' then 'Order Won'
    when new.outcome = 'No Interest' then 'Order Lost'
    when new.outcome = 'Quotation Given' then 'Quotation'
    when new.outcome = 'Interested' then 'Follow-up'
    else 'Follow-up'
  end;

  -- 2. Update the Lead
  update public.leads
  set 
    status = v_new_status,
    last_visit_date = new.created_at,
    updated_at = now()
  where id = new.lead_id;

  -- 3. Log History
  insert into public.sales_pipeline_history (lead_id, old_status, new_status)
  select new.lead_id, status, v_new_status
  from public.leads where id = new.lead_id;

  return new;
end;
$$ language plpgsql security definer;

-- Trigger: After Visit Report
drop trigger if exists tr_after_visit_report on public.visit_reports;
create trigger tr_after_visit_report
  after insert on public.visit_reports
  for each row execute function public.handle_visit_report_submission();

-- Function to prevent lead status manual editing by non-admins
create or replace function public.check_lead_edit_permissions()
returns trigger as $$
begin
  if (select role from public.profiles where id = auth.uid()) != 'admin' then
    if old.status != new.status or old.expected_value != new.expected_value then
      raise exception 'Lead status and value are managed automatically via Visit Reports.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

-- Trigger: Prevent manual status changes
drop trigger if exists tr_protect_lead_status on public.leads;
create trigger tr_protect_lead_status
  before update on public.leads
  for each row execute function public.check_lead_edit_permissions();

-- ============================================================================
-- 3. RLS POLICIES
-- ============================================================================

alter table public.leads enable row level security;
alter table public.visit_reports enable row level security;
alter table public.sales_pipeline_history enable row level security;

-- Leads
create policy "Staff view assigned leads" on public.leads for select using (assigned_staff_id = auth.uid());
create policy "Admins view all leads" on public.leads for select using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Visit Reports (Read-only after submission)
create policy "Staff insert visit reports" on public.visit_reports for insert with check (staff_id = auth.uid());
create policy "Staff view own visit reports" on public.visit_reports for select using (staff_id = auth.uid());
create policy "Admins view all visit reports" on public.visit_reports for select using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Pipeline History
create policy "Admins view history" on public.sales_pipeline_history for select using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ============================================================================
-- 4. PERMISSIONS
-- ============================================================================

grant all on public.leads to authenticated;
grant all on public.visit_reports to authenticated;
grant select on public.sales_pipeline_history to authenticated;
