-- ============================================================
-- SA'DA ONE — Migration 013: Sales analytics + role feature flags
-- 1. sales_records: per-branch raw sales rows (uploaded from the
--    Excel template) that power daily→yearly analytics.
-- 2. role_feature_flags: admin on/off switches per role per feature.
--    Stores OVERRIDES only — absence of a row means "enabled".
-- Safe to re-run.
-- ============================================================

-- 1. SALES RECORDS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_records (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch       TEXT NOT NULL,
  date         DATE NOT NULL,
  revenue      NUMERIC(14,2) NOT NULL DEFAULT 0,
  units        INTEGER NOT NULL DEFAULT 0,
  transactions INTEGER NOT NULL DEFAULT 0,
  category     TEXT,
  uploaded_by  UUID REFERENCES employees(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sales_date   ON sales_records(date);
CREATE INDEX IF NOT EXISTS idx_sales_branch ON sales_records(branch);

ALTER TABLE sales_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sales_read"  ON sales_records;
DROP POLICY IF EXISTS "sales_write" ON sales_records;
-- read: finance, admin, manager, hr_officer (the qualifying roles)
CREATE POLICY "sales_read" ON sales_records FOR SELECT TO authenticated
  USING (current_user_role() IN ('finance','admin','manager','hr_officer'));
-- write/upload/delete: finance + admin only
CREATE POLICY "sales_write" ON sales_records FOR ALL TO authenticated
  USING (current_user_role() IN ('finance','admin'))
  WITH CHECK (current_user_role() IN ('finance','admin'));

-- 2. ROLE FEATURE FLAGS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS role_feature_flags (
  role        user_role NOT NULL,
  feature_key TEXT NOT NULL,
  enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_by  UUID,
  PRIMARY KEY (role, feature_key)
);

ALTER TABLE role_feature_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rff_read"  ON role_feature_flags;
DROP POLICY IF EXISTS "rff_write" ON role_feature_flags;
-- everyone reads (client needs flags to render the right nav)
CREATE POLICY "rff_read" ON role_feature_flags FOR SELECT TO authenticated USING (true);
-- only admin changes
CREATE POLICY "rff_write" ON role_feature_flags FOR ALL TO authenticated
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

-- feature flag for the sales analytics module itself (so admin can hide it)
-- (no seed rows needed — everything defaults to enabled)
