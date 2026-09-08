-- ============================================================
-- SA'DA ONE — Migration 006: App Settings (Admin Customization)
-- Key/value settings store so admins can customize the app live
-- without code changes. Safe to re-run.
-- ============================================================

-- New HR request type for leave encashment (vacation pay)
ALTER TYPE hr_request_type ADD VALUE IF NOT EXISTS 'leave_encashment';

CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  category    TEXT NOT NULL DEFAULT 'general',
  label       TEXT,
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_by  UUID
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated may READ settings (needed for branding, feature flags).
DROP POLICY IF EXISTS "settings_read" ON app_settings;
CREATE POLICY "settings_read" ON app_settings FOR SELECT TO authenticated USING (true);

-- Only admins may WRITE.
DROP POLICY IF EXISTS "settings_write" ON app_settings;
CREATE POLICY "settings_write" ON app_settings FOR ALL TO authenticated
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

-- ── DEFAULT SETTINGS (only inserted if missing) ─────────────
INSERT INTO app_settings (key, value, category, label, description) VALUES
  ('branding.app_name',        '"SA''DA ONE"',                      'branding', 'App Name',            'Shown in the header and PWA'),
  ('branding.company_name',    '"SA''DA Group"',                    'branding', 'Company Name',        'Legal/display company name'),
  ('branding.tagline',         '"Integrated Employee Experience Platform"', 'branding', 'Tagline', 'Subtitle under the logo'),
  ('branding.primary_color',   '"#17B8D0"',                         'branding', 'Primary Color',       'Main accent (teal)'),
  ('branding.accent_color',    '"#C8A96E"',                         'branding', 'Accent Color',        'Premium accent (gold)'),

  ('leave.encashment_enabled', 'true',                              'leave',    'Leave Encashment',    'Allow employees to cash out unused annual leave'),
  ('leave.encashment_basis',   '"basic_salary"',                    'leave',    'Encashment Basis',    'basic_salary | custom'),
  ('leave.encashment_divisor', '30',                                'leave',    'Daily Rate Divisor',  'Daily pay = basic salary ÷ this (KSA standard = 30)'),
  ('leave.annual_default',     '30',                                'leave',    'Default Annual Days', 'Annual leave entitlement for new employees'),
  ('leave.sick_default',       '30',                                'leave',    'Default Sick Days',   'Sick leave entitlement for new employees'),

  ('features.tasks',           'true',                              'features', 'Tasks Module',        'Enable the task manager'),
  ('features.chat',            'true',                              'features', 'Chat Module',         'Enable in-app chat'),
  ('features.recognition',     'true',                              'features', 'Recognition',         'Enable kudos/recognition'),
  ('features.suggestions',     'true',                              'features', 'Suggestions Box',     'Enable anonymous suggestions'),

  ('company.work_days',        '["sunday","monday","tuesday","wednesday","thursday"]', 'company', 'Work Week', 'Working days'),
  ('company.timezone',         '"Asia/Riyadh"',                     'company',  'Timezone',            'Company timezone')
ON CONFLICT (key) DO NOTHING;

-- Touch updated_at on write
CREATE OR REPLACE FUNCTION set_settings_updated_at()
RETURNS trigger AS $$
BEGIN NEW.updated_at := NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_settings_updated ON app_settings;
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION set_settings_updated_at();

SELECT key, value, category FROM app_settings ORDER BY category, key;
