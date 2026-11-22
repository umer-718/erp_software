import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import pool, { CENTRAL_DATABASE_NAME, provisionCompanyDatabase } from "@/lib/db";
import { companyDatabaseNameError } from "@/lib/tenant-tables";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public company sign-up (no login). Creates the company and its admin
// account in the central database, then provisions the company's own
// database (erp_company_NNN) with all tables and starter data.

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;

const attempts =
  globalThis.companySignupAttempts || new Map();
globalThis.companySignupAttempts = attempts;

function rateLimited(ip) {
  const now = Date.now();
  const recent = (attempts.get(ip) || []).filter(
    (time) => now - time < RATE_WINDOW_MS
  );

  recent.push(now);
  attempts.set(ip, recent);

  return recent.length > RATE_LIMIT;
}

function fail(message, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

function text(value, max) {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").slice(0, max)
    : "";
}

// Username is shown in the dashboard; email is the login. Use the email's
// local part, adding a short suffix only when that name is taken.
async function usernameFromEmail(client, email) {
  const base = (email
    .split("@")[0]
    .replace(/[^a-zA-Z0-9_.-]/g, "")
    .slice(0, 80) || "user").padEnd(3, "_");

  const taken = await client.query(
    "SELECT 1 FROM users WHERE lower(username) = lower($1) LIMIT 1",
    [base]
  );

  return taken.rows.length
    ? `${base}.${randomBytes(3).toString("hex")}`
    : base;
}

export async function POST(request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "local";

  if (rateLimited(ip)) {
    return fail("Too many sign-up attempts. Please try again later.", 429);
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return fail("Invalid request data.");
  }

  const companyName = text(body.companyName, 150);
  const currency = text(body.currency, 3).toUpperCase() || "PKR";
  const phone = text(body.phone, 50);
  const address = text(body.address, 500);
  const fullName = text(body.fullName, 150);
  const email = text(body.email, 150).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";

  if (!companyName) return fail("Company name is required.");

  // The company's database is named after it (erp_<name>).
  const nameError = companyDatabaseNameError(companyName, CENTRAL_DATABASE_NAME);
  if (nameError) return fail(nameError);
  if (!/^[A-Z]{3}$/.test(currency)) return fail("Currency must be a 3-letter code, e.g. PKR.");
  if (!fullName) return fail("Your full name is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Enter a valid email address.");
  if (password.length < 8 || password.length > 128) {
    return fail("Password must be 8 to 128 characters.");
  }

  const client = await pool.connect();
  let company;
  let newAccount = false;

  try {
    await client.query("BEGIN");

    const adminRole = await client.query(
      `SELECT role_id FROM roles
       WHERE company_id IS NULL AND upper(role_name) = 'ADMIN'
       LIMIT 1`
    );

    if (!adminRole.rows.length) {
      throw new Error("ADMIN role is missing. Run npm run db:setup.");
    }

    const adminRoleId = adminRole.rows[0].role_id;

    const companyResult = await client.query(
      `INSERT INTO companies (
         company_name, phone, email, address, currency, is_active,
         created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING company_id, company_name, currency`,
      [companyName, phone || null, email, address || null, currency]
    );

    company = companyResult.rows[0];

    // One account per email. An existing account may add a company only
    // with its own password, so nobody can attach companies to it.
    const existing = await client.query(
      `SELECT user_id, password_hash, is_active
       FROM users
       WHERE lower(email) = $1
       LIMIT 1
       FOR UPDATE`,
      [email]
    );

    let userId;
    let passwordHash;

    if (existing.rows.length) {
      const user = existing.rows[0];
      const matches =
        user.is_active === true &&
        user.password_hash &&
        (await bcrypt.compare(password, user.password_hash));

      if (!matches) {
        await client.query("ROLLBACK");
        return fail(
          "This email already has an account. Enter that account's password to add another company.",
          409
        );
      }

      userId = user.user_id;
      passwordHash = user.password_hash;
    } else {
      passwordHash = await bcrypt.hash(password, 12);

      const userResult = await client.query(
        `INSERT INTO users (
           full_name, username, email, password_hash, role_id, company_id,
           is_active, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING user_id`,
        [
          fullName,
          await usernameFromEmail(client, email),
          email,
          passwordHash,
          adminRoleId,
          company.company_id,
        ]
      );

      userId = userResult.rows[0].user_id;
      newAccount = true;
    }

    await client.query(
      `INSERT INTO user_companies (user_id, company_id, role_id, company_password_hash)
       VALUES ($1, $2, $3, $4)`,
      [userId, company.company_id, adminRoleId, passwordHash]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});

    if (error.code === "23505") {
      return fail(
        error.constraint === "companies_company_name_unique_idx" ||
          error.constraint === "companies_database_slug_unique_idx"
          ? "A company with this name (or a very similar one) is already registered."
          : "This account could not be created. Try a different email.",
        409
      );
    }

    console.error("COMPANY SIGNUP ERROR:", error);
    return fail("Company sign-up failed. Please try again.", 500);
  } finally {
    client.release();
  }

  // The company is committed; now create its own database.
  try {
    await provisionCompanyDatabase(company.company_id);
  } catch (error) {
    console.error("COMPANY SIGNUP PROVISIONING ERROR:", {
      companyId: company.company_id,
      message: error.message,
    });

    return fail(
      "Your company was created, but its database could not be set up yet. Please contact support before signing up again.",
      500
    );
  }

  return NextResponse.json(
    {
      success: true,
      message: newAccount
        ? "Company registered. You can now sign in with your email and password."
        : "Company added to your account. Sign in and choose it from the company list.",
      company: {
        companyId: company.company_id,
        companyName: company.company_name,
      },
    },
    { status: 201 }
  );
}
