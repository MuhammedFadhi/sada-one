-- ============================================================
-- SA'DA ONE — 042  Stop self-approval and post-submission tampering
--
-- FOUND BY LIVE TEST, as employee1 against their own records:
--   • set their own leave request  status → 'approved'   (succeeded)
--   • set their own expense claim  status → 'approved'   (succeeded)
--   • changed a submitted claim's amount to 99,999       (succeeded)
-- Approving someone ELSE's request was correctly blocked, so the hole is
-- specifically "my own row", where the existing owner-update policy lets
-- the submitter change any column — including status and amount.
--
-- Financial impact is direct: an employee could approve their own expense
-- claim and set its value.
--
-- Fix: a trigger on each request table. Submitters may still edit a request
-- while it is pending, and may cancel it, but they cannot move it through
-- the approval workflow or alter the money after submission.
--
-- Idempotent. Safe to re-run.
-- ============================================================

CREATE OR REPLACE FUNCTION trg_block_self_approval()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  is_own     BOOLEAN := (NEW.employee_id = current_employee_id());
  is_admin   BOOLEAN := (current_user_role() = 'admin');
BEGIN
  IF is_own AND NOT is_admin THEN
    -- You may withdraw your own request, never advance it.
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'cancelled' THEN
      RAISE EXCEPTION 'You cannot change the status of your own request (%, → %)', OLD.status, NEW.status
        USING ERRCODE = 'check_violation';
    END IF;

    -- Once it has left 'pending' the submitter can no longer edit the content.
    IF OLD.status <> 'pending' AND NEW.status = OLD.status THEN
      RAISE EXCEPTION 'This request is already being processed and can no longer be edited'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;

-- Amounts must not move after submission, whoever is editing — approvers
-- act on the figure that was submitted.
CREATE OR REPLACE FUNCTION trg_freeze_submitted_amount()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status <> 'pending' AND NEW.amount IS DISTINCT FROM OLD.amount
     AND current_user_role() <> 'admin' THEN
    NEW.amount := OLD.amount;
  END IF;
  RETURN NEW;
END $$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['leave_requests','loans','expense_claims','exit_reentry'] LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_schema='public' AND table_name=t) THEN CONTINUE; END IF;
    EXECUTE format('DROP TRIGGER IF EXISTS block_self_approval ON %I', t);
    EXECUTE format(
      'CREATE TRIGGER block_self_approval BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION trg_block_self_approval()', t);
  END LOOP;

  -- amount freeze only where an `amount` column exists
  FOREACH t IN ARRAY ARRAY['expense_claims','loans'] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name=t AND column_name='amount') THEN
      EXECUTE format('DROP TRIGGER IF EXISTS freeze_submitted_amount ON %I', t);
      EXECUTE format(
        'CREATE TRIGGER freeze_submitted_amount BEFORE UPDATE ON %I
           FOR EACH ROW EXECUTE FUNCTION trg_freeze_submitted_amount()', t);
    END IF;
  END LOOP;
END $$;


-- ── SUCCESS CHECK ────────────────────────────────────────────
SELECT '042 applied ✓'                                             AS status,
       (SELECT count(*) FROM pg_trigger
          WHERE tgname = 'block_self_approval')                     AS self_approval_guards,   -- 4
       (SELECT count(*) FROM pg_trigger
          WHERE tgname = 'freeze_submitted_amount')                 AS amount_guards;
