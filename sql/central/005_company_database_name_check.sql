-- Allow erp_<company name> database names (was erp_company_NNN only).
-- MUST match COMPANY_DATABASE_PATTERN in lib/tenant-tables.js.
ALTER TABLE public.company_databases
  DROP CONSTRAINT IF EXISTS company_databases_name_check;
ALTER TABLE public.company_databases
  ADD CONSTRAINT company_databases_name_check
  CHECK (database_name::text ~ '^erp_[a-z0-9_]{1,55}$' AND database_name::text <> 'erp_system');
