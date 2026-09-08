-- 024_enable_rls_open_tables.sql
-- QA finding: several tables have RLS declared in 001 but NOT actually enforced in
-- the live DB (verified: a non-HR user could INSERT into onboarding_checklists, and
-- plain employees could read these tables). They are currently empty, so there is no
-- active data leak, but they are wide open to any authenticated user. Enable RLS so
-- access is actually enforced.
--
-- Note: the sensitive per-employee tables (payslips, leave_requests, loans,
-- expense_claims, attendance_logs, hr_requests, performance_reviews) were verified to
-- be correctly RLS-scoped already — this migration does NOT touch them.
--
-- invite_tokens is intentionally NOT enabled here: it is read client-side by the
-- invite/join flow, so enabling RLS without a policy would break invites. It should
-- instead be redesigned behind a SECURITY DEFINER token-validation RPC (tracked
-- separately) so anon users can validate a token without the table being world-readable.

-- (1) Activate the scoped policies added in 023 by turning RLS on for these tables.
--     With RLS on: employees see only their own rows; HR/admin/manager manage all.
alter table onboarding_checklists  enable row level security;
alter table offboarding_checklists enable row level security;
alter table performance_goals      enable row level security;

-- (2) Lock down tables that are written only by triggers / the service role and are
--     never queried from the client. Enabling RLS with no policy denies all direct
--     client access; triggers and the service role bypass RLS, so existing writes
--     keep working. Add scoped policies later if/when these features get a UI.
alter table loan_repayments    enable row level security;
alter table recognition_points enable row level security;
alter table overtime_requests  enable row level security;
alter table asset_history      enable row level security;
alter table ticket_comments    enable row level security;
