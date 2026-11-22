-- Each company's database is named erp_<slug of company name>, so the slug
-- must be unique as well as the name ("Alpha-Traders" and "Alpha Traders"
-- would otherwise share erp_alpha_traders).
-- MUST match companyDatabaseSlug() in lib/tenant-tables.js.
CREATE UNIQUE INDEX IF NOT EXISTS companies_database_slug_unique_idx
  ON public.companies (
    rtrim(left(btrim(regexp_replace(lower(company_name::text), '[^a-z0-9]+', '_', 'g'), '_'), 50), '_')
  )
  WHERE rtrim(left(btrim(regexp_replace(lower(company_name::text), '[^a-z0-9]+', '_', 'g'), '_'), 50), '_') <> '';
