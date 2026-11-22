// Creates/updates the central erp_system database: applies sql/central/*.sql
// (schema, roles, permissions). Safe to run repeatedly.
// Usage: npm run db:setup

import pg from "pg";
import { applyMigrations, CENTRAL_MIGRATIONS_DIR } from "../lib/tenant-migrations.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is missing. Create .env.local first.");
  process.exit(1);
}

const client = new pg.Client({ connectionString });

try {
  await client.connect();
  const result = await applyMigrations(client, CENTRAL_MIGRATIONS_DIR);

  console.info(
    `erp_system: v${result.fromVersion} -> v${result.toVersion}` +
      (result.applied.length ? ` (${result.applied.join(", ")})` : " (up to date)")
  );
} catch (error) {
  console.error(`Central setup FAILED - ${error.message}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
