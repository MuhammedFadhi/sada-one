-- 018_fix_hard_delete_grant.sql
-- Fix: the earlier REVOKE ... FROM public also removed service_role's access,
-- so the delete-user edge function (service role) got "permission denied".
-- Grant execute back to service_role only.
grant execute on function admin_hard_delete_employee(uuid) to service_role;
