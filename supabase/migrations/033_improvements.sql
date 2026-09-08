-- ============================================================
-- 033 — IMPROVEMENTS (run whole file in Supabase SQL editor)
--   A. Chat: auto-join new employees to company + division channels (+ backfill)
--   B. Notifications: SMS delivery for approvals (graceful; needs send-sms fn)
--   C. Notifications: Web Push subscriptions table + delivery (graceful; needs send-push fn)
-- Safe to re-run. Touches NO auth.users rows.
-- ============================================================

-- ── A. CHAT AUTO-JOIN ────────────────────────────────────────
-- New hires get zero chat memberships otherwise, so they can see channels
-- but get 403 when posting. Company channels are matched by shape
-- (division_id IS NULL AND type <> 'direct') so this is robust to naming.

-- A0. Guarantee every company has at least one company-wide channel to join.
--     (Migration 002 only created 'general' when employees already existed,
--      which on a fresh install they didn't — so it may be missing.)
INSERT INTO chat_channels (company_id, name, description, type, created_by)
SELECT co.id, 'general', 'Company-wide channel', 'announcement',
       (SELECT e.id FROM employees e WHERE e.company_id = co.id ORDER BY e.created_at LIMIT 1)
FROM companies co
WHERE EXISTS (SELECT 1 FROM employees e WHERE e.company_id = co.id)
  AND NOT EXISTS (
    SELECT 1 FROM chat_channels c
    WHERE c.company_id = co.id AND c.division_id IS NULL AND c.type <> 'direct'
  );

CREATE OR REPLACE FUNCTION trg_employee_channels()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- company-wide channels (any non-direct channel with no division)
  INSERT INTO chat_channel_members (channel_id, employee_id)
  SELECT c.id, NEW.id FROM chat_channels c
  WHERE c.company_id = NEW.company_id AND c.division_id IS NULL AND c.type <> 'direct'
  ON CONFLICT (channel_id, employee_id) DO NOTHING;

  -- division channel (if the employee has a division and a channel exists for it)
  IF NEW.division_id IS NOT NULL THEN
    INSERT INTO chat_channel_members (channel_id, employee_id)
    SELECT c.id, NEW.id FROM chat_channels c
    WHERE c.company_id = NEW.company_id AND c.division_id = NEW.division_id
    ON CONFLICT (channel_id, employee_id) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW; -- never block employee creation on chat setup
END $$;

DROP TRIGGER IF EXISTS employee_channels ON employees;
CREATE TRIGGER employee_channels AFTER INSERT ON employees
  FOR EACH ROW EXECUTE FUNCTION trg_employee_channels();

-- Backfill: add all existing employees to their company + division channels.
INSERT INTO chat_channel_members (channel_id, employee_id)
SELECT c.id, e.id
FROM employees e
JOIN chat_channels c ON c.company_id = e.company_id AND c.division_id IS NULL AND c.type <> 'direct'
ON CONFLICT (channel_id, employee_id) DO NOTHING;

INSERT INTO chat_channel_members (channel_id, employee_id)
SELECT c.id, e.id
FROM employees e
JOIN chat_channels c ON c.company_id = e.company_id AND c.division_id = e.division_id
WHERE e.division_id IS NOT NULL
ON CONFLICT (channel_id, employee_id) DO NOTHING;

-- ── B. SMS DELIVERY (approvals only — keeps volume low) ──────
-- Fires only for type='approval' (action-needed / final-approval-needed),
-- and only when the recipient has a mobile number. Graceful no-op until the
-- send-sms function + relay are configured.
DO $enet$ BEGIN CREATE EXTENSION IF NOT EXISTS pg_net;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'pg_net not available — SMS/push will no-op'; END $enet$;

CREATE OR REPLACE FUNCTION trg_notification_sms()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_mobile TEXT;
BEGIN
  IF NEW.type <> 'approval' THEN RETURN NEW; END IF;
  SELECT e.mobile INTO v_mobile
  FROM user_profiles up JOIN employees e ON e.id = up.employee_id
  WHERE up.id = NEW.user_id;
  IF v_mobile IS NULL OR length(trim(v_mobile)) < 6 THEN RETURN NEW; END IF;
  PERFORM net.http_post(
    url     := 'https://psjcmitxouzwtljrlucv.supabase.co/functions/v1/send-sms',
    headers := jsonb_build_object('Content-Type','application/json','x-hook-secret','sada-one-sms-2026'),
    body    := jsonb_build_object('to', v_mobile, 'message', NEW.title || ' — ' || COALESCE(NEW.body,''))
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS notification_sms ON notifications;
CREATE TRIGGER notification_sms AFTER INSERT ON notifications
  FOR EACH ROW EXECUTE FUNCTION trg_notification_sms();

-- ── C. WEB PUSH ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "push_own" ON push_subscriptions;
CREATE POLICY "push_own" ON push_subscriptions FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Deliver push for every non-chat notification (chat has its own realtime UI).
CREATE OR REPLACE FUNCTION trg_notification_push()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.type = 'chat_message' THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM push_subscriptions WHERE user_id = NEW.user_id) THEN RETURN NEW; END IF;
  PERFORM net.http_post(
    url     := 'https://psjcmitxouzwtljrlucv.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type','application/json','x-hook-secret','sada-one-push-2026'),
    body    := jsonb_build_object('user_id', NEW.user_id, 'title', NEW.title,
                                  'body', COALESCE(NEW.body,''), 'link', COALESCE(NEW.data->>'link','/'))
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS notification_push ON notifications;
CREATE TRIGGER notification_push AFTER INSERT ON notifications
  FOR EACH ROW EXECUTE FUNCTION trg_notification_push();

-- ── SUCCESS CHECK (prints only if the whole file ran) ────────
SELECT
  '033 applied ✓'                                                             AS status,
  (SELECT count(*) FROM pg_trigger WHERE tgname = 'employee_channels')        AS autojoin_trigger,   -- 1
  (SELECT count(*) FROM chat_channel_members)                                 AS total_memberships,  -- grew after backfill
  (SELECT count(*) FROM pg_trigger WHERE tgname IN ('notification_sms','notification_push')) AS delivery_triggers, -- 2
  (SELECT count(*) FROM information_schema.tables WHERE table_name = 'push_subscriptions')  AS push_table;         -- 1
