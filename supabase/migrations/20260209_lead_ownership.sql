-- Migration: Lead Ownership Automation
-- Created: 2026-02-09
-- Description: Adds created_by tracking and automatic population trigger for leads.

-- 1. Ensure created_by column exists
alter table public.leads
add column if not exists created_by uuid references public.profiles(id);

-- 2. Create Trigger Function
create or replace function public.handle_lead_created_by()
returns trigger as $$
begin
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- 3. Create Trigger
drop trigger if exists tr_set_lead_creator on public.leads;
create trigger tr_set_lead_creator
  before insert on public.leads
  for each row execute function public.handle_lead_created_by();

-- 4. Comment for documentation
comment on column public.leads.created_by is 'Reference to the staff member who originally created the lead record.';
