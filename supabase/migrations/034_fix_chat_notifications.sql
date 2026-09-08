-- ============================================================
-- 034 — FIX CHAT NOTIFICATIONS
-- The old trg_chat_notify referenced NEW.attachment_type / NEW.attachment_url,
-- columns added in a later migration. Depending on schema drift the trigger
-- either errored at runtime or was never installed cleanly on production, so
-- chat messages created NO notifications.
--
-- This version uses only base-schema columns that always exist (type, content,
-- file_url), never produces a NULL body (notifications.body is NOT NULL), and is
-- wrapped so a notification failure can NEVER block sending a message.
-- Safe to re-run.
-- ============================================================

CREATE OR REPLACE FUNCTION trg_chat_notify()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_sender TEXT;
BEGIN
  IF COALESCE(NEW.is_deleted, false) THEN RETURN NEW; END IF;

  SELECT full_name_en INTO v_sender FROM employees WHERE id = NEW.sender_id;

  INSERT INTO notifications (user_id, type, title, body, data)
  SELECT
    up.id,
    'chat_message',
    COALESCE(v_sender, 'New message'),
    -- text preview, else attachment marker, else a safe non-null fallback
    COALESCE(
      NULLIF(left(COALESCE(NEW.content, ''), 80), ''),
      CASE WHEN NEW.file_url IS NOT NULL THEN '📎 Attachment' ELSE 'New message' END
    ),
    jsonb_build_object('link', '/chat/' || NEW.channel_id, 'channel_id', NEW.channel_id)
  FROM chat_channel_members m
  JOIN user_profiles up ON up.employee_id = m.employee_id
  WHERE m.channel_id = NEW.channel_id
    AND m.employee_id <> NEW.sender_id
    AND COALESCE(m.is_muted, false) = false;   -- respect per-channel mute

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;  -- never block message delivery on a notification error
END $$;

DROP TRIGGER IF EXISTS notify_chat ON chat_messages;
CREATE TRIGGER notify_chat AFTER INSERT ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION trg_chat_notify();

-- ── SUCCESS CHECK ────────────────────────────────────────────
SELECT
  '034 applied ✓'                                                     AS status,
  (SELECT count(*) FROM pg_trigger WHERE tgname = 'notify_chat')      AS chat_trigger;   -- expect 1
