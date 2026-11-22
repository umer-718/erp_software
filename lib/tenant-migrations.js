// Applies numbered SQL migrations (NNN_name.sql) to one database.
//
//   sql/central/*  -> the central erp_system database
//   sql/tenant/*   -> every company database (erp_company_NNN)
//
// Each database records what it has applied in its own schema_migrations
// table, which is the source of truth. For company databases the central
// company_databases.schema_version column only mirrors it for reporting.
//
// No "@/..." imports here: scripts/*.js load this file directly with Node.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export const TENANT_MIGRATIONS_DIR = path.join(process.cwd(), "sql", "tenant");
export const CENTRAL_MIGRATIONS_DIR = path.join(process.cwd(), "sql", "central");

const FILE_PATTERN = /^(\d{3,})_[a-z0-9_-]+\.sql$/i;
const MIGRATION_LOCK_KEY = 724501;

export async function listMigrations(dir = TENANT_MIGRATIONS_DIR) {
  const files = await readdir(dir);

  return files
    .map((file) => {
      const match = file.match(FILE_PATTERN);
      return match ? { version: Number(match[1]), file } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.version - b.version);
}

/**
 * Apply all pending migrations in `dir` in ONE transaction.
 * `client` must be a dedicated connection to the target database.
 * Returns { fromVersion, toVersion, applied: [file, ...] }.
 */
export async function applyMigrations(client, dir = TENANT_MIGRATIONS_DIR) {
  const migrations = await listMigrations(dir);

  await client.query("BEGIN");

  try {
    // Serialise concurrent runs (registration retry + migrate script).
    await client.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK_KEY]);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.schema_migrations (
        version INTEGER PRIMARY KEY,
        file_name TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const current = await client.query(
      "SELECT COALESCE(MAX(version), 0)::int AS version FROM public.schema_migrations"
    );

    const fromVersion = current.rows[0].version;
    let toVersion = fromVersion;
    const applied = [];

    for (const migration of migrations) {
      if (migration.version <= fromVersion) {
        continue;
      }

      const sql = await readFile(path.join(dir, migration.file), "utf8");

      try {
        await client.query(sql);
      } catch (error) {
        error.message = `Migration ${migration.file} failed: ${error.message}`;
        throw error;
      }

      await client.query(
        "INSERT INTO public.schema_migrations (version, file_name) VALUES ($1, $2)",
        [migration.version, migration.file]
      );

      applied.push(migration.file);
      toVersion = migration.version;
    }

    await client.query("COMMIT");

    return { fromVersion, toVersion, applied };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  }
}

export function applyTenantMigrations(client) {
  return applyMigrations(client, TENANT_MIGRATIONS_DIR);
}

/**
 * A company database holds exactly one company, so every company_id column
 * defaults to that company's id. Inserts that omit company_id and filters
 * like "WHERE company_id = $1" then behave as they did in the shared DB.
 * Idempotent; run after every migration pass.
 */
export async function pinCompanyId(client, companyId) {
  const id = Number(companyId);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("Invalid company ID for pinning.");
  }

  const { rows } = await client.query(`
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'company_id'
      AND t.table_type = 'BASE TABLE'
    ORDER BY c.table_name
  `);

  await client.query("BEGIN");

  try {
    for (const { table_name: table } of rows) {
      if (!/^[a-z0-9_]+$/.test(table)) {
        continue;
      }

      // `id` is a validated integer, so inlining it is safe.
      await client.query(
        `ALTER TABLE public."${table}" ALTER COLUMN company_id SET DEFAULT ${id}`
      );
      await client.query(
        `UPDATE public."${table}" SET company_id = ${id} WHERE company_id IS NULL`
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  }

  return rows.length;
}
