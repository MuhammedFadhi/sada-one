-- ============================================================
-- SA'DA ONE — 043  Presence, read receipts, and their privacy controls
--
--   • last_seen_at        heartbeat, drives "online" / "last seen"
--   • read_receipts_enabled   user can switch blue ticks off
--   • show_online_status      user can hide presence from colleagues
--
-- HR, Finance and Admin always see presence regardless of the user's
-- privacy switches — that is a deliberate management requirement, and it
-- is enforced INSIDE the security-definer function below rather than in
-- the UI, so it cannot be bypassed from the client.
--
-- Read state needs no new table: chat_channel_members.last_read_at
-- already exists. A message is read by a member when their last_read_at
-- is at or after the message timestamp.
--
-- Idempotent. Safe to re-run.
-- ============================================================

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_seen_at          TIMESTAMPTZ;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS read_receipts_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS show_online_status    BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_user_profiles_last_seen ON user_profiles(last_seen_at DESC);


-- ── Heartbeat ───────────────────────────────────────────────
-- Called by the client every ~60s while the app is open. Only ever
-- updates the caller's own row.
CREATE OR REPLACE FUNCTION touch_presence()
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE user_profiles SET last_seen_at = NOW() WHERE id = auth.uid();
$$;
REVOKE ALL ON FUNCTION touch_presence() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION touch_presence() TO authenticated;


-- ── Presence lookup, privacy applied server-side ────────────
-- Returns one row per requested employee.
--   is_online     : seen within the last 2 minutes
--   last_seen_at  : NULL when the viewer isn't allowed to see it
-- Elevated roles (hr_officer, finance, admin) always get the real value.
-- Everyone else gets it only if that person left show_online_status on.
CREATE OR REPLACE FUNCTION get_presence(p_employee_ids UUID[])
RETURNS TABLE (employee_id UUID, is_online BOOLEAN, last_seen_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  viewer_role TEXT := current_user_role();
  privileged  BOOLEAN := viewer_role IN ('hr_officer', 'finance', 'admin');
BEGIN
  RETURN QUERY
  SELECT p.employee_id,
         CASE WHEN privileged OR p.show_online_status
              THEN (p.last_seen_at > NOW() - INTERVAL '2 minutes')
              ELSE FALSE END,
         CASE WHEN privileged OR p.show_online_status
              THEN p.last_seen_at
              ELSE NULL END
  FROM   user_profiles p
  WHERE  p.employee_id = ANY(p_employee_ids);
END $$;
REVOKE ALL ON FUNCTION get_presence(UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_presence(UUID[]) TO authenticated;


-- ── Directory for HR / Finance / Admin ──────────────────────
-- One call returning every user with their presence and login history.
-- Restricted to elevated roles; anyone else gets an empty set.
CREATE OR REPLACE FUNCTION get_user_directory()
RETURNS TABLE (
  employee_id   UUID,
  full_name_en  TEXT,
  job_title_en  TEXT,
  work_email    TEXT,
  mobile        TEXT,
  role          TEXT,
  is_active     BOOLEAN,
  is_online     BOOLEAN,
  last_seen_at  TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  onboarded     BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_user_role() NOT IN ('hr_officer', 'finance', 'admin') THEN
    RETURN;                       -- not authorised: empty result, not an error
  END IF;
  RETURN QUERY
  SELECT e.id, e.full_name_en, e.job_title_en, e.work_email, e.mobile,
         p.role::TEXT, p.is_active,
         (p.last_seen_at > NOW() - INTERVAL '2 minutes'),
         p.last_seen_at, p.last_login_at,
         COALESCE(p.profile_completed, FALSE)
  FROM   employees e
  LEFT   JOIN user_profiles p ON p.employee_id = e.id
  ORDER  BY (p.last_seen_at > NOW() - INTERVAL '2 minutes') DESC NULLS LAST,
           p.last_seen_at DESC NULLS LAST,
           e.full_name_en;
END $$;
REVOKE ALL ON FUNCTION get_user_directory() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_user_directory() TO authenticated;


-- ── Read receipts for a conversation ────────────────────────
-- For each message the caller sent in a channel, reports how many other
-- members have read it. A member's read is only counted when they have
-- read receipts switched on — matching WhatsApp, where disabling the
-- setting hides your reads from others.
CREATE OR REPLACE FUNCTION get_message_receipts(p_channel UUID)
RETURNS TABLE (message_id UUID, delivered_count INT, read_count INT, total_recipients INT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me UUID := current_employee_id();
BEGIN
  -- only members of the channel may ask
  IF NOT EXISTS (SELECT 1 FROM chat_channel_members m
                 WHERE m.channel_id = p_channel AND m.employee_id = me) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT msg.id,
         COUNT(*) FILTER (
           WHERE up.last_seen_at >= msg.created_at
         )::INT,
         COUNT(*) FILTER (
           WHERE mem.last_read_at >= msg.created_at
             AND COALESCE(up.read_receipts_enabled, TRUE)
         )::INT,
         COUNT(*)::INT
  FROM   chat_messages msg
  JOIN   chat_channel_members mem
         ON mem.channel_id = msg.channel_id AND mem.employee_id <> msg.sender_id
  LEFT   JOIN user_profiles up ON up.employee_id = mem.employee_id
  WHERE  msg.channel_id = p_channel
    AND  msg.sender_id  = me
    AND  msg.is_deleted = FALSE
  GROUP  BY msg.id;
END $$;
REVOKE ALL ON FUNCTION get_message_receipts(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_message_receipts(UUID) TO authenticated;


-- ── SUCCESS CHECK ───────────────────────────────────────────
SELECT '043 applied ✓'                                                  AS status,
       (SELECT count(*) FROM information_schema.columns
          WHERE table_name='user_profiles'
            AND column_name IN ('last_seen_at','read_receipts_enabled','show_online_status')) AS new_columns,  -- 3
       (SELECT count(*) FROM pg_proc
          WHERE proname IN ('touch_presence','get_presence',
                            'get_user_directory','get_message_receipts'))  AS new_functions;  -- 4
