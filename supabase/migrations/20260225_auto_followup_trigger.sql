-- Migration: Auto Follow-up Scheduling Trigger
-- Created: 2026-02-25
-- Purpose: When a visit report is submitted with outcome = 'Interested' (follow-up)
--          and next_action_date is set, automatically add the lead to that
--          employee's daily_work_plans for that date.
--          This replaces the broken generate-daily-plan Edge Function.

-- ============================================================================
-- FUNCTION: auto_schedule_followup
-- ============================================================================
CREATE OR REPLACE FUNCTION public.auto_schedule_followup()
RETURNS TRIGGER AS $$
DECLARE
  v_lead_name    text;
  v_existing_plan uuid;
  v_existing_leads jsonb;
  v_new_lead_entry jsonb;
  v_max_seq      int;
BEGIN
  -- Only trigger when outcome requires follow-up AND next_action_date is set
  IF NEW.next_action_date IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.outcome NOT IN ('follow-up', 'interested', 'Interested', 'follow_up') THEN
    RETURN NEW;
  END IF;

  -- Get lead name for the work plan entry
  SELECT name INTO v_lead_name FROM leads WHERE id = NEW.lead_id;

  -- Check if a work plan already exists for this staff + date
  SELECT id, planned_leads
  INTO v_existing_plan, v_existing_leads
  FROM daily_work_plans
  WHERE staff_id = NEW.staff_id
    AND date = NEW.next_action_date;

  -- Build the new lead entry for planned_leads jsonb array
  -- Get current max sequence in existing plan (or 0)
  IF v_existing_leads IS NOT NULL THEN
    SELECT COALESCE(MAX((elem->>'sequence')::int), 0)
    INTO v_max_seq
    FROM jsonb_array_elements(v_existing_leads) AS elem;
  ELSE
    v_max_seq := 0;
  END IF;

  -- Check if this lead is already in the plan to avoid duplicates
  IF v_existing_leads IS NOT NULL AND
     EXISTS (
       SELECT 1 FROM jsonb_array_elements(v_existing_leads) AS elem
       WHERE elem->>'lead_id' = NEW.lead_id::text
     ) THEN
    -- Lead already scheduled, skip
    RETURN NEW;
  END IF;

  v_new_lead_entry := jsonb_build_object(
    'lead_id',        NEW.lead_id,
    'lead_name',      COALESCE(v_lead_name, 'Unknown Party'),
    'sequence',       v_max_seq + 1,
    'is_followup',    true,
    'source_report',  NEW.id,
    'note',           'Auto-scheduled follow-up from visit report dated ' || NEW.timestamp::date::text
  );

  IF v_existing_plan IS NOT NULL THEN
    -- Append to existing plan's planned_leads
    UPDATE daily_work_plans
    SET planned_leads = COALESCE(v_existing_leads, '[]'::jsonb) || jsonb_build_array(v_new_lead_entry),
        status = CASE WHEN status = 'completed' THEN 'draft' ELSE status END
    WHERE id = v_existing_plan;
  ELSE
    -- Create a new draft work plan for that date
    INSERT INTO daily_work_plans (staff_id, date, planned_leads, status)
    VALUES (
      NEW.staff_id,
      NEW.next_action_date,
      jsonb_build_array(v_new_lead_entry),
      'draft'
    )
    ON CONFLICT (staff_id, date) DO UPDATE
      SET planned_leads = COALESCE(daily_work_plans.planned_leads, '[]'::jsonb)
                          || jsonb_build_array(v_new_lead_entry);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER: fire after each visit_report insert
-- ============================================================================
DROP TRIGGER IF EXISTS tr_auto_schedule_followup ON visit_reports;

CREATE TRIGGER tr_auto_schedule_followup
  AFTER INSERT ON visit_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_schedule_followup();

-- ============================================================================
-- Also add next_action_date column to visit_reports if not already present
-- (schema.sql has it, but safety check)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'visit_reports' AND column_name = 'next_action_date'
  ) THEN
    ALTER TABLE visit_reports ADD COLUMN next_action_date date;
  END IF;
END $$;
