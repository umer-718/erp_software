-- Central erp_system migration: scope audit logs to a company.
-- Applied by npm run db:setup.
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS company_id INTEGER;
CREATE INDEX IF NOT EXISTS audit_logs_company_created_idx
  ON audit_logs (company_id, created_at DESC);
