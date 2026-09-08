-- ============================================================
-- SA'DA ONE — Migration 011: Attendance geofencing (work sites)
-- Adds work_sites (office locations + radius), a Haversine distance
-- function, and a BEFORE trigger that rejects check-in/out punches
-- whose GPS falls outside every active site's radius.
-- Enforcement is OFF until: (a) the 'attendance.geofence_enabled'
-- setting is true AND (b) at least one active work_site exists.
-- Safe to re-run.
-- ============================================================

-- 1． Sites table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS work_sites (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  city        TEXT,
  latitude    NUMERIC(10,7) NOT NULL,
  longitude   NUMERIC(10,7) NOT NULL,
  radius_m    INT NOT NULL DEFAULT 150 CHECK (radius_m BETWEEN 25 AND 100000),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE work_sites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "work_sites_read"  ON work_sites;
DROP POLICY IF EXISTS "work_sites_write" ON work_sites;
-- everyone authenticated reads (client needs sites to validate)
CREATE POLICY "work_sites_read" ON work_sites FOR SELECT TO authenticated USING (true);
-- only admins manage
CREATE POLICY "work_sites_write" ON work_sites FOR ALL TO authenticated
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

-- 2． Haversine distance in metres ───────────────────────────
CREATE OR REPLACE FUNCTION geo_distance_m(la1 NUMERIC, lo1 NUMERIC, la2 NUMERIC, lo2 NUMERIC)
RETURNS NUMERIC LANGUAGE sql IMMUTABLE AS $$
  SELECT 6371000 * 2 * asin(sqrt(
    power(sin(radians(la2 - la1) / 2), 2) +
    cos(radians(la1)) * cos(radians(la2)) * power(sin(radians(lo2 - lo1) / 2), 2)
  ));
$$;

-- 3． Geofence enforcement trigger ───────────────────────────
CREATE OR REPLACE FUNCTION enforce_geofence()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_enabled BOOLEAN;
  v_lat NUMERIC;
  v_lng NUMERIC;
BEGIN
  -- only gate the check-in punch (where coordinates are captured)
  IF NEW.check_in IS NULL THEN RETURN NEW; END IF;

  SELECT coalesce((value::text::boolean), false) INTO v_enabled
    FROM app_settings WHERE key = 'attendance.geofence_enabled';
  IF v_enabled IS NOT TRUE THEN RETURN NEW; END IF;

  -- no active sites configured → don't block
  IF NOT EXISTS (SELECT 1 FROM work_sites WHERE is_active) THEN RETURN NEW; END IF;

  v_lat := NEW.check_in_lat;
  v_lng := NEW.check_in_lng;

  -- coordinates required once geofencing is on
  IF v_lat IS NULL OR v_lng IS NULL THEN
    RAISE EXCEPTION 'GEO_REQUIRED' USING ERRCODE = 'check_violation';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM work_sites s
    WHERE s.is_active
      AND geo_distance_m(v_lat, v_lng, s.latitude, s.longitude) <= s.radius_m
  ) THEN
    RAISE EXCEPTION 'OUTSIDE_GEOFENCE' USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_geofence ON attendance_logs;
CREATE TRIGGER trg_geofence
  BEFORE INSERT OR UPDATE OF check_in ON attendance_logs
  FOR EACH ROW EXECUTE FUNCTION enforce_geofence();

-- 4． Settings toggle (default OFF) ──────────────────────────
INSERT INTO app_settings (key, value, category, label, description)
VALUES ('attendance.geofence_enabled', 'false', 'attendance',
        'Geofenced attendance',
        'Require check-in GPS to be within an active work site radius')
ON CONFLICT (key) DO NOTHING;

-- 5． Seed the company HQ as an example site (inactive) ──────
INSERT INTO work_sites (company_id, name, city, latitude, longitude, radius_m, is_active)
SELECT id, 'Head Office', 'Al Khobar', 26.2794000, 50.2083000, 150, false
FROM companies
WHERE NOT EXISTS (SELECT 1 FROM work_sites)
LIMIT 1;
