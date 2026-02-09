-- Migration: CRM, Sales Pipeline & Reporting Foundation (Phase 2 - Block 1)
-- Created: 2026-02-09
-- Description: Establishes the core CRM schema with leads, meetings, visit reports, and summary tables.

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- Leads / Accounts Table
create table if not exists public.leads (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  client_type text check (client_type in ('Dealer', 'Architect', 'Builder', 'Retailer', 'Other')) default 'Retailer',
  status text not null default 'New Lead', -- Automation source
  expected_value numeric(12, 2) default 0,
  assigned_staff_id uuid references public.profiles(id),
  address text,
  contact_number text,
  last_visit_date timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Work Plan Meetings (Formal relationship instead of JSONB)
create table if not exists public.work_plan_meetings (
  id uuid default uuid_generate_v4() primary key,
  work_plan_id uuid references public.daily_work_plans(id) on delete cascade not null,
  lead_id uuid references public.leads(id) not null,
  sequence int not null,
  objective text default 'Intro',
  priority text check (priority in ('low', 'med', 'high')) default 'med',
  expected_value numeric(12, 2) default 0,
  status text check (status in ('pending', 'visited', 'missed')) default 'pending',
  created_at timestamp with time zone default now(),

  -- Rule: A lead can be planned once per work plan
  unique(work_plan_id, lead_id)
);

-- Visit Reports Table
create table if not exists public.visit_reports (
  id uuid default uuid_generate_v4() primary key,
  meeting_id uuid references public.work_plan_meetings(id) not null unique, -- Hard 1:1 constraint
  staff_id uuid references public.profiles(id) not null,
  
  status text check (status in ('Completed', 'Not Completed')) not null,
  discussion_summary text not null,
  outcome text check (outcome in ('Interested', 'Quotation Given', 'Order Confirmed', 'No Interest')),
  order_value numeric(12, 2) default 0,
  expected_order_date date,
  photo_url text,
  location geography(POINT), -- Captured ONLY on submission
  created_at timestamp with time zone default now()
);

-- Pipeline Analytics History
create table if not exists public.sales_pipeline_history (
  id uuid default uuid_generate_v4() primary key,
  lead_id uuid references public.leads(id) not null,
  old_status text,
  new_status text not null,
  old_value numeric(12, 2),
  new_value numeric(12, 2),
  changed_by uuid references public.profiles(id),
  changed_at timestamp with time zone default now()
);

-- Monthly Sales Summary (Aggregated Performance)
create table if not exists public.monthly_sales_summary (
  id uuid default uuid_generate_v4() primary key,
  staff_id uuid references public.profiles(id) not null,
  month date not null, -- First day of the month
  total_leads_tapped int default 0,
  total_orders_closed int default 0,
  total_order_value numeric(12, 2) default 0,
  updated_at timestamp with time zone default now(),

  unique(staff_id, month)
);

-- ============================================================================
-- 2. AUTOMATION LOGIC (TRIGGERS)
-- ============================================================================

-- Function to handle visit report outcomes
create or replace function public.handle_visit_report_submission()
returns trigger as $$
declare
  v_new_status text;
  v_old_status text;
  v_old_value numeric;
  v_month_start date;
begin
  -- 1. Determine new lead status
  v_new_status := case 
    when new.outcome = 'Order Confirmed' then 'Order Won'
    when new.outcome = 'No Interest' then 'Order Lost'
    when new.outcome = 'Quotation Given' then 'Quotation'
    when new.outcome = 'Interested' then 'Follow-up'
    else 'Follow-up'
  end;

  -- 2. Fetch current lead state for history
  select status, expected_value 
  into v_old_status, v_old_value 
  from public.leads where id = (select lead_id from public.work_plan_meetings where id = new.meeting_id);

  -- 3. Update the Lead
  update public.leads
  set 
    status = v_new_status,
    expected_value = case when new.outcome = 'Order Confirmed' then new.order_value else expected_value end,
    last_visit_date = new.created_at,
    updated_at = now()
  where id = (select lead_id from public.work_plan_meetings where id = new.meeting_id);

  -- 4. Mark meeting as visited
  update public.work_plan_meetings
  set status = 'visited'
  where id = new.meeting_id;

  -- 5. Log History
  insert into public.sales_pipeline_history (lead_id, old_status, new_status, old_value, new_value, changed_by)
  values (
    (select lead_id from public.work_plan_meetings where id = new.meeting_id),
    v_old_status,
    v_new_status,
    v_old_value,
    case when new.outcome = 'Order Confirmed' then new.order_value else v_old_value end,
    new.staff_id
  );

  -- 6. Update Monthly Summary
  v_month_start := date_trunc('month', new.created_at)::date;
  
  insert into public.monthly_sales_summary (staff_id, month, total_leads_tapped, total_orders_closed, total_order_value)
  values (
    new.staff_id, 
    v_month_start, 
    1, 
    case when new.outcome = 'Order Confirmed' then 1 else 0 end,
    case when new.outcome = 'Order Confirmed' then new.order_value else 0 end
  )
  on conflict (staff_id, month) do update
  set 
    total_leads_tapped = public.monthly_sales_summary.total_leads_tapped + 1,
    total_orders_closed = public.monthly_sales_summary.total_orders_closed + (case when new.outcome = 'Order Confirmed' then 1 else 0 end),
    total_order_value = public.monthly_sales_summary.total_order_value + (case when new.outcome = 'Order Confirmed' then new.order_value else 0 end),
    updated_at = now();

  return new;
end;
$$ language plpgsql security definer;

-- Trigger for lead automation
drop trigger if exists tr_after_visit_report on public.visit_reports;
create trigger tr_after_visit_report
  after insert on public.visit_reports
  for each row execute function public.handle_visit_report_submission();

-- Guard: Prevent manual lead editing by staff
create or replace function public.check_lead_edit_permissions()
returns trigger as $$
begin
  if (select role from public.profiles where id = auth.uid()) != 'admin' then
    if old.status != new.status or (old.expected_value != new.expected_value and new.status != 'Order Won') then
      raise exception 'Lead status and value are managed automatically via Visit Reports.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists tr_protect_lead_status on public.leads;
create trigger tr_protect_lead_status
  before update on public.leads
  for each row execute function public.check_lead_edit_permissions();

-- ============================================================================
-- 3. RLS POLICIES
-- ============================================================================

alter table public.leads enable row level security;
alter table public.work_plan_meetings enable row level security;
alter table public.visit_reports enable row level security;
alter table public.sales_pipeline_history enable row level security;
alter table public.monthly_sales_summary enable row level security;

-- Leads
create policy "Staff view assigned leads" on public.leads for select using (assigned_staff_id = auth.uid());
create policy "Admins view all leads" on public.leads for select using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Meetings
create policy "Staff view own meetings" on public.work_plan_meetings for select using (
  exists (select 1 from public.daily_work_plans where id = work_plan_id and staff_id = auth.uid())
);
create policy "Admins view all meetings" on public.work_plan_meetings for select using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Visit Reports
create policy "Staff insert visit reports" on public.visit_reports for insert with check (staff_id = auth.uid());
create policy "Staff view own visit reports" on public.visit_reports for select using (staff_id = auth.uid());
create policy "Admins view all visit reports" on public.visit_reports for select using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- History & Summary
create policy "Only admins view sales analytics" on public.sales_pipeline_history for select using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "Only admins view monthly summary" on public.monthly_sales_summary for select using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ============================================================================
-- 4. PERMISSIONS
-- ============================================================================

grant all on public.leads to authenticated;
grant all on public.work_plan_meetings to authenticated;
grant all on public.visit_reports to authenticated;
grant select on public.sales_pipeline_history to authenticated;
grant select on public.monthly_sales_summary to authenticated;
