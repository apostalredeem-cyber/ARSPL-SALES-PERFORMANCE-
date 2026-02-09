-- Migration: Enhance Leads Table Schema
-- Created: 2026-02-09
-- Description: Adds metadata columns for contact, location, and regional categorization.

alter table public.leads
add column if not exists phone_number text,
add column if not exists area_id uuid references public.areas(id),
add column if not exists latitude numeric,
add column if not exists longitude numeric,
add column if not exists address text; -- Note: 'address' may already exist from previous blocks

-- Optional: Comments for clarity
comment on column public.leads.phone_number is 'Primary contact number for the lead';
comment on column public.leads.area_id is 'Relational link to the areas master table';
comment on column public.leads.latitude is 'GPS latitude for the lead location';
comment on column public.leads.longitude is 'GPS longitude for the lead location';

-- 5. Data Integrity Constraints (Phase 2 - Validation)
-- Make contact and regional info mandatory
alter table public.leads
alter column phone_number set not null,
alter column area_id set not null;

-- Prevent duplicate party by phone
create unique index if not exists idx_leads_phone_unique
on public.leads(phone_number);
