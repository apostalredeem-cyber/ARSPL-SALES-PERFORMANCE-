-- Migration: Add Daily Work Plan, GPS Tracking, and Expense Management Features
-- Created: 2026-02-08
-- Description: Adds daily_work_plans table, enhances expenses table with validation,
--              creates daily_travel_summary for auto-calculated travel allowances,
--              and adds supporting functions and RLS policies.

-- ============================================================================
-- 1. CREATE NEW TABLE: daily_work_plans
-- ============================================================================
-- Enhanced work plan table with route planning and activation status
create table if not exists daily_work_plans (
  id uuid default uuid_generate_v4() primary key,
  staff_id uuid references profiles(id) not null,
  date date not null,
  planned_leads jsonb, -- Array of lead objects with sequence
  planned_route geography(LINESTRING), -- Expected route path
  expected_start_time time,
  expected_end_time time,
  status text check (status in ('draft', 'active', 'completed')) default 'draft',
  created_at timestamp with time zone default now(),
  activated_at timestamp with time zone,
  completed_at timestamp with time zone,
  
  -- Ensure one active plan per staff per day
  unique(staff_id, date)
);

-- Index for faster queries
create index idx_daily_work_plans_staff_date on daily_work_plans(staff_id, date);
create index idx_daily_work_plans_status on daily_work_plans(status);

-- ============================================================================
-- 2. MODIFY EXISTING TABLE: gps_logs
-- ============================================================================
-- Add distance_from_last_point column if it doesn't exist
do $$ 
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'gps_logs' and column_name = 'distance_from_last_point'
  ) then
    alter table gps_logs add column distance_from_last_point float;
  end if;
end $$;

-- ============================================================================
-- 3. CREATE NEW TABLE: daily_travel_summary
-- ============================================================================
-- Aggregated daily travel data with auto-calculated allowance
create table if not exists daily_travel_summary (
  id uuid default uuid_generate_v4() primary key,
  staff_id uuid references profiles(id) not null,
  date date not null,
  total_km numeric(10, 2) not null default 0,
  travel_amount numeric(10, 2) not null default 0, -- total_km * 3.25
  gps_log_count int default 0,
  status text check (status in ('pending', 'approved', 'rejected')) default 'pending',
  created_at timestamp with time zone default now(),
  approved_at timestamp with time zone,
  approved_by uuid references profiles(id),
  
  -- Ensure one summary per staff per day
  unique(staff_id, date)
);

-- Index for faster queries
create index idx_daily_travel_summary_staff_date on daily_travel_summary(staff_id, date);
create index idx_daily_travel_summary_status on daily_travel_summary(status);

-- ============================================================================
-- 4. MODIFY EXISTING TABLE: expenses
-- ============================================================================
-- Add new columns and constraints for expense management

-- Add expense_type column
do $$ 
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'expenses' and column_name = 'expense_type'
  ) then
    alter table expenses add column expense_type text check (expense_type in ('travel', 'food', 'hotel', 'fuel', 'other'));
  end if;
end $$;

-- Add expense_date column
do $$ 
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'expenses' and column_name = 'expense_date'
  ) then
    alter table expenses add column expense_date date;
  end if;
end $$;

-- Add bill_url column
do $$ 
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'expenses' and column_name = 'bill_url'
  ) then
    alter table expenses add column bill_url text;
  end if;
end $$;

-- Add linked_travel_date column
do $$ 
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'expenses' and column_name = 'linked_travel_date'
  ) then
    alter table expenses add column linked_travel_date date;
  end if;
end $$;

-- Add is_auto_generated column to track auto-generated travel expenses
do $$ 
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'expenses' and column_name = 'is_auto_generated'
  ) then
    alter table expenses add column is_auto_generated boolean default false;
  end if;
end $$;

-- Update existing NULL values before adding NOT NULL constraints
update expenses set expense_date = created_at::date where expense_date is null;
update expenses set expense_type = 'other' where expense_type is null;

-- Add NOT NULL constraints (only if columns exist and are populated)
do $$ 
begin
  -- Make user_id NOT NULL if not already
  if exists (
    select 1 from information_schema.columns 
    where table_name = 'expenses' and column_name = 'user_id' and is_nullable = 'YES'
  ) then
    alter table expenses alter column user_id set not null;
  end if;
  
  -- Make amount NOT NULL if not already
  if exists (
    select 1 from information_schema.columns 
    where table_name = 'expenses' and column_name = 'amount' and is_nullable = 'YES'
  ) then
    alter table expenses alter column amount set not null;
  end if;
  
  -- Make expense_date NOT NULL
  if exists (
    select 1 from information_schema.columns 
    where table_name = 'expenses' and column_name = 'expense_date' and is_nullable = 'YES'
  ) then
    alter table expenses alter column expense_date set not null;
  end if;
  
  -- Make expense_type NOT NULL
  if exists (
    select 1 from information_schema.columns 
    where table_name = 'expenses' and column_name = 'expense_type' and is_nullable = 'YES'
  ) then
    alter table expenses alter column expense_type set not null;
  end if;
end $$;

-- ============================================================================
-- 5. FUNCTIONS: Distance Calculation and Travel Expense Generation
-- ============================================================================

-- Function to calculate daily distance from GPS logs
create or replace function calculate_daily_distance(p_staff_id uuid, p_date date)
returns numeric as $$
declare
  total_distance numeric := 0;
begin
  select coalesce(sum(distance_from_last_point), 0) / 1000.0 -- Convert meters to km
  into total_distance
  from gps_logs
  where user_id = p_staff_id
    and timestamp::date = p_date
    and distance_from_last_point is not null;
  
  return round(total_distance, 2);
end;
$$ language plpgsql;

-- Function to auto-generate or update daily travel summary
create or replace function update_daily_travel_summary(p_staff_id uuid, p_date date)
returns void as $$
declare
  v_total_km numeric;
  v_travel_amount numeric;
  v_log_count int;
begin
  -- Calculate total distance
  v_total_km := calculate_daily_distance(p_staff_id, p_date);
  
  -- Calculate travel allowance (₹3.25 per km)
  v_travel_amount := round(v_total_km * 3.25, 2);
  
  -- Count GPS logs
  select count(*) into v_log_count
  from gps_logs
  where user_id = p_staff_id and timestamp::date = p_date;
  
  -- Insert or update summary
  insert into daily_travel_summary (staff_id, date, total_km, travel_amount, gps_log_count)
  values (p_staff_id, p_date, v_total_km, v_travel_amount, v_log_count)
  on conflict (staff_id, date) 
  do update set 
    total_km = excluded.total_km,
    travel_amount = excluded.travel_amount,
    gps_log_count = excluded.gps_log_count;
end;
$$ language plpgsql;

-- Function to get weekly travel summary
create or replace function get_weekly_travel_summary(p_staff_id uuid, p_week_start date)
returns table (
  week_start date,
  week_end date,
  total_km numeric,
  total_amount numeric,
  days_count int,
  approved_count int,
  pending_count int
) as $$
begin
  return query
  select 
    p_week_start as week_start,
    (p_week_start + interval '6 days')::date as week_end,
    coalesce(sum(dts.total_km), 0) as total_km,
    coalesce(sum(dts.travel_amount), 0) as total_amount,
    count(*)::int as days_count,
    count(*) filter (where dts.status = 'approved')::int as approved_count,
    count(*) filter (where dts.status = 'pending')::int as pending_count
  from daily_travel_summary dts
  where dts.staff_id = p_staff_id
    and dts.date >= p_week_start
    and dts.date <= (p_week_start + interval '6 days')::date;
end;
$$ language plpgsql;

-- ============================================================================
-- 6. TRIGGERS: Auto-update travel summary and prevent manual travel expenses
-- ============================================================================

-- Trigger to calculate distance_from_last_point on GPS log insert
create or replace function calculate_gps_distance()
returns trigger as $$
declare
  last_location geography(POINT);
  distance_meters float;
begin
  -- Get the last GPS location for this user
  select location into last_location
  from gps_logs
  where user_id = new.user_id
    and timestamp < new.timestamp
  order by timestamp desc
  limit 1;
  
  -- Calculate distance if there's a previous point
  if last_location is not null then
    distance_meters := st_distance(last_location, new.location);
    new.distance_from_last_point := distance_meters;
  else
    new.distance_from_last_point := 0;
  end if;
  
  return new;
end;
$$ language plpgsql;

-- Drop trigger if exists and recreate
drop trigger if exists tr_calculate_gps_distance on gps_logs;
create trigger tr_calculate_gps_distance
  before insert on gps_logs
  for each row execute function calculate_gps_distance();

-- Trigger to update daily travel summary when GPS log is inserted
create or replace function trigger_update_travel_summary()
returns trigger as $$
begin
  perform update_daily_travel_summary(new.user_id, new.timestamp::date);
  return new;
end;
$$ language plpgsql;

-- Drop trigger if exists and recreate
drop trigger if exists tr_update_travel_summary on gps_logs;
create trigger tr_update_travel_summary
  after insert on gps_logs
  for each row execute function trigger_update_travel_summary();

-- Trigger to prevent manual travel expense creation
create or replace function prevent_manual_travel_expense()
returns trigger as $$
begin
  -- Only allow auto-generated travel expenses
  if new.expense_type = 'travel' and (new.is_auto_generated is null or new.is_auto_generated = false) then
    raise exception 'Travel expenses are auto-generated from GPS tracking. Please use other expense types for manual entries.';
  end if;
  
  -- Prevent backdating (more than 7 days old)
  if new.expense_date < (current_date - interval '7 days')::date then
    raise exception 'Cannot create expenses older than 7 days.';
  end if;
  
  return new;
end;
$$ language plpgsql;

-- Drop trigger if exists and recreate
drop trigger if exists tr_prevent_manual_travel_expense on expenses;
create trigger tr_prevent_manual_travel_expense
  before insert or update on expenses
  for each row execute function prevent_manual_travel_expense();

-- ============================================================================
-- 7. RLS POLICIES
-- ============================================================================

-- Enable RLS on new tables
alter table daily_work_plans enable row level security;
alter table daily_travel_summary enable row level security;

-- Policies for daily_work_plans
create policy "Staff can view own work plans"
  on daily_work_plans for select
  using (auth.uid() = staff_id);

create policy "Staff can insert own work plans"
  on daily_work_plans for insert
  with check (auth.uid() = staff_id);

create policy "Staff can update own draft work plans"
  on daily_work_plans for update
  using (auth.uid() = staff_id and status = 'draft');

create policy "Admins can view all work plans"
  on daily_work_plans for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can update all work plans"
  on daily_work_plans for update
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Policies for daily_travel_summary
create policy "Staff can view own travel summary"
  on daily_travel_summary for select
  using (auth.uid() = staff_id);

create policy "Admins can view all travel summaries"
  on daily_travel_summary for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can update travel summary status"
  on daily_travel_summary for update
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Update expenses policies to prevent staff from editing travel expenses
drop policy if exists "Users manage own expenses" on expenses;

create policy "Staff can view own expenses"
  on expenses for select
  using (auth.uid() = user_id);

create policy "Staff can insert non-travel expenses"
  on expenses for insert
  with check (auth.uid() = user_id and expense_type != 'travel');

create policy "Staff can update own non-travel expenses"
  on expenses for update
  using (auth.uid() = user_id and expense_type != 'travel' and is_auto_generated = false);

create policy "Admins can manage all expenses"
  on expenses for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on tables to authenticated users
grant usage on schema public to authenticated;
grant all on daily_work_plans to authenticated;
grant all on daily_travel_summary to authenticated;
grant all on expenses to authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Add comment to track migration
comment on table daily_work_plans is 'Daily work plans with route planning - Added 2026-02-08';
comment on table daily_travel_summary is 'Aggregated daily travel data with auto-calculated allowance - Added 2026-02-08';

-- Trigger to auto-populate staff_id from auth.uid() if not provided
CREATE OR REPLACE FUNCTION public.handle_work_plan_staff_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.staff_id IS NULL THEN
    NEW.staff_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER tr_set_work_plan_staff_id
  BEFORE INSERT ON public.daily_work_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_work_plan_staff_id();
