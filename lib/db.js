
// import { Pool } from "pg";

// const connectionString = process.env.DATABASE_URL;

// if (!connectionString) {
//   throw new Error(
//     "DATABASE_URL is missing. Configure it in your deployment environment."
//   );
// }

// const globalForPostgres = globalThis;

// const configuredPoolMax = Number(
//   process.env.PG_POOL_MAX || 5
// );

// const poolMax =
//   Number.isInteger(configuredPoolMax) &&
//   configuredPoolMax >= 1 &&
//   configuredPoolMax <= 30
//     ? configuredPoolMax
//     : 5;

// const pool =
//   globalForPostgres.pgPool ||
//   new Pool({
//     connectionString,

//     ssl:
//       process.env.NODE_ENV === "production"
//         ? { rejectUnauthorized: false }
//         : false,

//     max: poolMax,
//     min: 0,

//     idleTimeoutMillis: 30000,
//     connectionTimeoutMillis: 10000,

//     allowExitOnIdle: false,
//     keepAlive: true,
//     keepAliveInitialDelayMillis: 10000,

//     application_name: "GoldenLakeERP",
//   });

// globalForPostgres.pgPool = pool;

// pool.on("connect", () => {
//   console.info(
//     "[DATABASE] PostgreSQL connection established."
//   );
// });

// pool.on("error", (error) => {
//   console.error(
//     "[DATABASE] Unexpected PostgreSQL pool error:",
//     error.message
//   );
// });

// export default pool;



import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is missing. Configure it in your deployment environment."
  );
}

const globalForPostgres = globalThis;

const configuredPoolMax = Number(process.env.PG_POOL_MAX || 5);

const poolMax =
  Number.isInteger(configuredPoolMax) &&
  configuredPoolMax >= 1 &&
  configuredPoolMax <= 30
    ? configuredPoolMax
    : 5;

const ssl =
  process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false;

// --------------------------------------------------
// CENTRAL DATABASE: erp_system
// Existing ERP APIs continue using this pool.
// --------------------------------------------------

const pool =
  globalForPostgres.pgPool ||
  new Pool({
    connectionString,
    ssl,
    max: poolMax,
    min: 0,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    allowExitOnIdle: false,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    application_name: "GoldenLakeERP",
  });

globalForPostgres.pgPool = pool;

// --------------------------------------------------
// COMPANY DATABASE POOLS
// --------------------------------------------------

const companyPools =
  globalForPostgres.pgCompanyPools ||
  new Map();

globalForPostgres.pgCompanyPools = companyPools;

/**
 * Get the PostgreSQL connection pool for a company.
 *
 * The company database name is retrieved from the
 * central erp_system.company_databases table.
 *
 * Only ACTIVE databases are returned.
 */
export async function getCompanyPool(companyId) {
  const id = Number(companyId);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("Invalid company ID.");
  }

  // Resolve database name from central database.
  const result = await pool.query(
    `SELECT database_name
     FROM company_databases
     WHERE company_id = $1
       AND status = 'ACTIVE'
     LIMIT 1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new Error(
      `No active database is configured for company ${id}.`
    );
  }

  const databaseName = result.rows[0].database_name;

  // Reuse an existing connection pool.
  if (companyPools.has(databaseName)) {
    return companyPools.get(databaseName);
  }

  // Use the same PostgreSQL server and credentials,
  // changing only the database name.
  const companyUrl = new URL(connectionString);
  companyUrl.pathname = `/${databaseName}`;

  const companyPool = new Pool({
    connectionString: companyUrl.toString(),
    ssl,
    max: poolMax,
    min: 0,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    allowExitOnIdle: false,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    application_name: `GoldenLakeERP-Company-${id}`,
  });

  companyPool.on("error", (error) => {
    console.error(
      `[DATABASE] Company ${id} pool error:`,
      error.message
    );
  });

  companyPools.set(databaseName, companyPool);

  return companyPool;
}

// --------------------------------------------------
// DATABASE CONNECTION EVENTS
// --------------------------------------------------

pool.on("connect", () => {
  console.info(
    "[DATABASE] Central PostgreSQL connection established."
  );
});

pool.on("error", (error) => {
  console.error(
    "[DATABASE] Unexpected central pool error:",
    error.message
  );
});


/**
 * Create an empty PostgreSQL database for a newly registered company.
 * The company record must already be committed in erp_system.
 */

export async function provisionCompanyDatabase(companyId) {
  const id = Number(companyId);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("Invalid company ID for database provisioning.");
  }

  const databaseName = `erp_company_${String(id).padStart(3, "0")}`;

  if (!/^erp_company_[0-9]{3,}$/.test(databaseName)) {
    throw new Error("Invalid generated database name.");
  }

  try {
    // Verify that the company exists in the central database.
    const companyResult = await pool.query(
      `SELECT company_id FROM companies WHERE company_id = $1`,
      [id]
    );

    if (!companyResult.rows.length) {
      throw new Error(`Company ${id} does not exist.`);
    }

    // Check for an existing mapping.
    const existingMapping = await pool.query(
      `
      SELECT database_name, status
      FROM company_databases
      WHERE company_id = $1
      `,
      [id]
    );

    if (
      existingMapping.rows.length &&
      existingMapping.rows[0].database_name !== databaseName
    ) {
      throw new Error(
        `Company ${id} already has a different database mapping.`
      );
    }

    // Save or refresh the central database mapping.
    await pool.query(
      `
      INSERT INTO company_databases (
        company_id,
        database_name,
        status,
        schema_version,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2, 'PROVISIONING', 0,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      ON CONFLICT (company_id)
      DO UPDATE SET
        status = 'PROVISIONING',
        updated_at = CURRENT_TIMESTAMP
      `,
      [id, databaseName]
    );

    // Check whether the separate PostgreSQL database exists.
    const existingDatabase = await pool.query(
      `
      SELECT 1
      FROM pg_database
      WHERE datname = $1
      `,
      [databaseName]
    );

    // Create the database if it does not exist.
    if (!existingDatabase.rows.length) {
      try {
        await pool.query(`CREATE DATABASE "${databaseName}"`);
      } catch (error) {
        // Another simultaneous registration/retry may have created it.
        if (error.code !== "42P04") {
          throw error;
        }
      }
    }

    // Verify physical database creation.
    const verification = await pool.query(
      `
      SELECT datname
      FROM pg_database
      WHERE datname = $1
      `,
      [databaseName]
    );

    if (!verification.rows.length) {
      throw new Error(
        `Database ${databaseName} was not found after creation.`
      );
    }

    // Mark the mapping ACTIVE only after verification.
    const activation = await pool.query(
      `
      UPDATE company_databases
      SET status = 'ACTIVE',
          updated_at = CURRENT_TIMESTAMP
      WHERE company_id = $1
        AND database_name = $2
      RETURNING company_id, database_name, status
      `,
      [id, databaseName]
    );

    if (!activation.rows.length) {
      throw new Error(
        "Database exists, but its central mapping could not be activated."
      );
    }

    console.info("[DATABASE PROVISIONING] Successful:", {
      companyId: id,
      databaseName,
      status: "ACTIVE",
    });

    return {
      databaseName,
      status: "ACTIVE",
    };
  } catch (error) {
    console.error("[DATABASE PROVISIONING] Failed:", {
      companyId: id,
      databaseName,
      message: error.message,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint,
      table: error.table,
      schema: error.schema,
      where: error.where,
    });

    await pool.query(
      `
      UPDATE company_databases
      SET status = 'FAILED',
          updated_at = CURRENT_TIMESTAMP
      WHERE company_id = $1
        AND database_name = $2
      `,
      [id, databaseName]
    ).catch((updateError) => {
      console.error(
        "[DATABASE PROVISIONING] Failed to update mapping:",
        updateError.message
      );
    });

    throw error;
  }
}

/**
 * Get the operational database for an authenticated company.
 *
 * Existing companies without a mapping continue using erp_system.
 * Companies with an ACTIVE mapping use their separate database.
 * PROVISIONING and FAILED mappings never fall back to erp_system.
 */
export async function getOperationalPool(companyId) {
  const id = Number(companyId);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("Invalid company ID.");
  }

  // Always check the central database for the mapping.
  const result = await pool.query(
    `
      SELECT database_name, status
      FROM company_databases
      WHERE company_id = $1
      LIMIT 1
    `,
    [id]
  );

  // Compatibility for existing companies.
  if (result.rows.length === 0) {
    return pool;
  }

  const mapping = result.rows[0];

  if (mapping.status !== "ACTIVE") {
    throw new Error(
      `Company database is not ready. Current status: ${mapping.status}.`
    );
  }

  return getCompanyPool(id);
}

export default pool;
