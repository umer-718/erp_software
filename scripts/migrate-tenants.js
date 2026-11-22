// Applies pending sql/tenant/*.sql migrations to every ACTIVE company database.
// Safe to run repeatedly. Usage: npm run migrate:tenants

import pg from "pg";
import { applyTenantMigrations, pinCompanyId } from "../lib/tenant-migrations.js";
import { COMPANY_DATABASE_PATTERN } from "../lib/tenant-tables.js";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is missing.");
  process.exit(1);
}

const central = new Pool({ connectionString, max: 1 });
let failures = 0;

try {
  const { rows } = await central.query(
    `SELECT company_id, database_name
     FROM company_databases
     WHERE status = 'ACTIVE'
     ORDER BY company_id`
  );

  for (const row of rows) {
    if (!COMPANY_DATABASE_PATTERN.test(row.database_name)) {
      console.error(`Skipping invalid database name: ${row.database_name}`);
      failures += 1;
      continue;
    }

    const url = new URL(process.env.TENANT_DATABASE_URL || connectionString);
    url.pathname = `/${row.database_name}`;
    const client = new pg.Client({ connectionString: url.toString() });

    try {
      await client.connect();
      const result = await applyTenantMigrations(client);
      await pinCompanyId(client, row.company_id);

      await central.query(
        `UPDATE company_databases
         SET schema_version = $2, updated_at = CURRENT_TIMESTAMP
         WHERE company_id = $1`,
        [row.company_id, result.toVersion]
      );

      console.info(
        `${row.database_name}: v${result.fromVersion} -> v${result.toVersion}` +
          (result.applied.length ? ` (${result.applied.join(", ")})` : " (up to date)")
      );
    } catch (error) {
      failures += 1;
      console.error(`${row.database_name}: FAILED - ${error.message}`);
    } finally {
      await client.end().catch(() => {});
    }
  }

  console.info(`Done. ${rows.length} company database(s), ${failures} failure(s).`);
} finally {
  await central.end();
}

process.exit(failures ? 1 : 0);
