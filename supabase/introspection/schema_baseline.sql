-- ============================================================
-- SA'DA ONE — SCHEMA BASELINE / INTROSPECTION
-- Run in: Supabase Dashboard → SQL Editor  (project psjcmitxouzwtljrlucv)
-- ------------------------------------------------------------
-- PURPOSE
--   Capture the CURRENT live schema of the `public` schema as a
--   committable baseline, so future changes are diffable and drift
--   is visible. Run the whole file; each section returns a result set.
--
--   Section Z (last) returns ONE JSON row = the full structural
--   snapshot. Export that row and commit it as
--       supabase/baseline/schema-snapshot-YYYY-MM-DD.json
--   Re-run monthly (or after any schema change) and diff the JSON to
--   see exactly what moved.
--
-- SCOPE / HONEST LIMIT
--   This introspects structure: tables, columns, types, constraints,
--   RLS policies, indexes, functions, triggers, enums. It is NOT a
--   full `pg_dump` — it does not emit sequence values, grants, row
--   data, or Supabase-managed `auth`/`storage` internals. For a true
--   portable dump you need DB credentials (Dashboard → Project
--   Settings → Database → Connection string, then `pg_dump`, or
--   `supabase db pull` once you have CLI access). See PHASE-1-README.
-- ============================================================


-- ── SECTION A · Tables & columns ─────────────────────────
select
  c.table_name,
  c.ordinal_position                              as pos,
  c.column_name,
  c.data_type
    || coalesce('(' || c.character_maximum_length || ')', '')
    || case when c.udt_name in ('jsonb','json','uuid','numeric') then ' ['||c.udt_name||']' else '' end
                                                  as type,
  c.is_nullable                                   as nullable,
  c.column_default                                as default_val
from information_schema.columns c
join information_schema.tables t
  on t.table_schema = c.table_schema and t.table_name = c.table_name
where c.table_schema = 'public'
  and t.table_type = 'BASE TABLE'
order by c.table_name, c.ordinal_position;


-- ── SECTION B · Constraints (PK / FK / UNIQUE / CHECK) ───
select
  tc.table_name,
  tc.constraint_type,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name  as ref_table,
  ccu.column_name as ref_column,
  cc.check_clause
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on kcu.constraint_name = tc.constraint_name and kcu.table_schema = tc.table_schema
left join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name and tc.constraint_type = 'FOREIGN KEY'
left join information_schema.check_constraints cc
  on cc.constraint_name = tc.constraint_name and cc.constraint_schema = tc.table_schema
where tc.table_schema = 'public'
order by tc.table_name, tc.constraint_type, tc.constraint_name;


-- ── SECTION C1 · RLS enabled per table ───────────────────
select
  n.nspname            as schema,
  c.relname            as table_name,
  c.relrowsecurity     as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;


-- ── SECTION C2 · RLS policies (the security surface) ─────
select
  schemaname,
  tablename,
  policyname,
  cmd            as command,
  permissive,
  roles,
  qual           as using_expr,
  with_check     as with_check_expr
from pg_policies
where schemaname = 'public'
order by tablename, cmd, policyname;


-- ── SECTION D · Indexes ──────────────────────────────────
select
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;


-- ── SECTION E · Functions & procedures ───────────────────
select
  p.proname                                   as name,
  pg_get_function_identity_arguments(p.oid)   as args,
  t.typname                                   as returns,
  case p.prosecdef when true then 'SECURITY DEFINER' else 'SECURITY INVOKER' end as security,
  l.lanname                                   as language
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join pg_type t      on t.oid = p.prorettype
join pg_language l  on l.oid = p.prolang
where n.nspname = 'public'
order by p.proname;


-- ── SECTION F · Custom types / enums ─────────────────────
select
  t.typname                              as enum_type,
  string_agg(e.enumlabel, ', ' order by e.enumsortorder) as values
from pg_type t
join pg_enum e     on e.enumtypid = t.oid
join pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'public'
group by t.typname
order by t.typname;


-- ── SECTION G · Triggers ─────────────────────────────────
select
  event_object_table as table_name,
  trigger_name,
  action_timing      as timing,
  event_manipulation as event,
  action_statement   as action
from information_schema.triggers
where trigger_schema = 'public'
order by event_object_table, trigger_name;


-- ============================================================
-- ── SECTION Z · SINGLE-ROW JSON SNAPSHOT (commit this) ───
-- Export the one row this returns → schema-snapshot-<date>.json
-- ============================================================
with cols as (
  select table_name,
         json_agg(json_build_object(
           'pos', ordinal_position, 'column', column_name,
           'type', data_type, 'udt', udt_name,
           'nullable', is_nullable, 'default', column_default
         ) order by ordinal_position) as columns
  from information_schema.columns
  where table_schema = 'public'
  group by table_name
),
cons as (
  select tc.table_name,
         json_agg(distinct jsonb_build_object(
           'type', tc.constraint_type, 'name', tc.constraint_name
         )) as constraints
  from information_schema.table_constraints tc
  where tc.table_schema = 'public'
  group by tc.table_name
),
pol as (
  select tablename as table_name,
         json_agg(json_build_object(
           'policy', policyname, 'cmd', cmd,
           'roles', roles, 'using', qual, 'with_check', with_check
         ) order by policyname) as policies
  from pg_policies where schemaname = 'public'
  group by tablename
),
rls as (
  select c.relname as table_name, c.relrowsecurity as rls_enabled
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
)
select json_build_object(
  'captured_at', now(),
  'database',    current_database(),
  'schema',      'public',
  'tables', (
    select json_agg(json_build_object(
      'table',       r.table_name,
      'rls_enabled', r.rls_enabled,
      'columns',     coalesce(c.columns, '[]'::json),
      'constraints', coalesce(k.constraints, '[]'::json),
      'policies',    coalesce(p.policies, '[]'::json)
    ) order by r.table_name)
    from rls r
    left join cols c on c.table_name = r.table_name
    left join cons k on k.table_name = r.table_name
    left join pol  p on p.table_name = r.table_name
  )
) as schema_snapshot;
