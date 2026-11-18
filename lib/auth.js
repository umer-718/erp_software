
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import pool from "@/lib/db";

const secretValue = process.env.JWT_SECRET;

if (!secretValue) {
  throw new Error("JWT_SECRET is not configured.");
}

const secret = new TextEncoder().encode(secretValue);

export const IDLE_TIMEOUT_MINUTES = 25;
export const MAX_SESSION_HOURS = 10;

const IDLE_TIMEOUT_MS = IDLE_TIMEOUT_MINUTES * 60 * 1000;
const MAX_SESSION_MS = MAX_SESSION_HOURS * 60 * 60 * 1000;

/**
 * Resolve the user's authoritative role for a company.
 */
export async function getCompanyMembership(userId, companyId) {
  if (!userId || !companyId) {
    return null;
  }

  const result = await pool.query(
    `
      SELECT
        uc.user_id,
        uc.company_id,
        uc.role_id,
        r.role_name,
        r.is_system_role
      FROM user_companies uc
      INNER JOIN roles r
        ON r.role_id = uc.role_id
      WHERE uc.user_id = $1
        AND uc.company_id = $2
        AND (
          r.company_id IS NULL
          OR r.company_id = uc.company_id
        )
      LIMIT 1
    `,
    [userId, companyId]
  );

  return result.rows[0] || null;
}

/**
 * Create a PostgreSQL session.
 */
export async function createSession(user, request) {
  const sessionId = randomUUID();

  const userId = user.userId ?? user.user_id;
  const companyId = user.companyId ?? user.company_id;

  if (!userId || !companyId) {
    throw new Error(
      "Cannot create session: user or company ID missing."
    );
  }

  const forwardedFor =
    request?.headers?.get("x-forwarded-for");

  const ipAddress = forwardedFor
    ? forwardedFor.split(",")[0].trim()
    : null;

  const userAgent =
    request?.headers?.get("user-agent") || null;

  const result = await pool.query(
    `
      WITH membership AS (
        SELECT
          uc.user_id,
          uc.company_id,
          uc.role_id,
          r.role_name
        FROM user_companies uc
        INNER JOIN roles r
          ON r.role_id = uc.role_id
        WHERE uc.user_id = $2
          AND uc.company_id = $3
          AND (
            r.company_id IS NULL
            OR r.company_id = uc.company_id
          )
        LIMIT 1
      ),
      inserted AS (
        INSERT INTO user_sessions (
          session_id,
          user_id,
          company_id,
          created_at,
          last_activity_at,
          expires_at,
          ip_address,
          user_agent
        )
        SELECT
          $1,
          m.user_id,
          m.company_id,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP + INTERVAL '10 hours',
          $4,
          $5
        FROM membership m
        RETURNING session_id
      )
      SELECT
        i.session_id,
        m.user_id,
        m.company_id,
        m.role_id,
        m.role_name
      FROM inserted i
      CROSS JOIN membership m
    `,
    [
      sessionId,
      userId,
      companyId,
      ipAddress,
      userAgent,
    ]
  );

  if (!result.rows || result.rows.length === 0) {
    throw new Error(
      "Cannot create session: company membership not found."
    );
  }

  const session = result.rows[0];

  if (!session.session_id) {
    throw new Error(
      "Session query returned a row without session_id."
    );
  }

  return session;
}

/**
 * Create authentication JWT.
 *
 * Role information is retained for compatibility.
 * Database role remains authoritative.
 */
export async function createToken(user, session) {
  const userId = user.userId ?? user.user_id;
  const username = user.username;

  if (
    !userId ||
    !username ||
    !session?.session_id ||
    Number(session.user_id) !== Number(userId)
  ) {
    throw new Error(
      "Cannot create authentication token: invalid session information."
    );
  }

  return new SignJWT({
    userId: session.user_id,
    username,
    roleId: session.role_id,
    roleName: session.role_name,
    companyId: session.company_id,
    sessionId: session.session_id,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10h")
    .sign(secret);
}

/**
 * Verify JWT and essential authentication claims.
 */
export async function verifyToken(token) {
  if (!token || typeof token !== "string") {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });

    if (
      !payload.userId ||
      !payload.username ||
      !payload.companyId ||
      !payload.sessionId ||
      !payload.iat ||
      !payload.exp
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Validate the authoritative PostgreSQL session.
 *
 * Kept as a separate exported function for compatibility.
 */
export async function isSessionActive(payload) {
  if (
    !payload?.sessionId ||
    !payload?.userId ||
    !payload?.companyId
  ) {
    return false;
  }

  const result = await pool.query(
    `
      SELECT
        (
          revoked_at IS NULL
          AND expires_at > CURRENT_TIMESTAMP
          AND created_at > CURRENT_TIMESTAMP - INTERVAL '10 hours'
          AND last_activity_at > CURRENT_TIMESTAMP - INTERVAL '25 minutes'
        ) AS is_active
      FROM user_sessions
      WHERE session_id = $1
        AND user_id = $2
        AND company_id = $3
      LIMIT 1
    `,
    [
      payload.sessionId,
      payload.userId,
      payload.companyId,
    ]
  );

  return result.rows[0]?.is_active === true;
}

/**
 * Validate session and company membership together.
 *
 * Optimization:
 * Previously this function executed:
 * 1. isSessionActive()
 * 2. getCompanyMembership()
 *
 * Now both checks are performed by one SQL query.
 */
export async function resolveAuthenticatedUser(payload) {
  if (
    !payload?.sessionId ||
    !payload?.userId ||
    !payload?.companyId
  ) {
    return null;
  }

  const result = await pool.query(
    `
      SELECT
        uc.user_id,
        uc.company_id,
        uc.role_id,
        r.role_name,
        r.is_system_role
      FROM user_sessions us

      INNER JOIN user_companies uc
        ON uc.user_id = us.user_id
       AND uc.company_id = us.company_id

      INNER JOIN roles r
        ON r.role_id = uc.role_id

      WHERE us.session_id = $1
        AND us.user_id = $2
        AND us.company_id = $3

        AND us.revoked_at IS NULL
        AND us.expires_at > CURRENT_TIMESTAMP
        AND us.created_at >
            CURRENT_TIMESTAMP - INTERVAL '10 hours'
        AND us.last_activity_at >
            CURRENT_TIMESTAMP - INTERVAL '25 minutes'

        AND (
          r.company_id IS NULL
          OR r.company_id = uc.company_id
        )

      LIMIT 1
    `,
    [
      payload.sessionId,
      payload.userId,
      payload.companyId,
    ]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const membership = result.rows[0];

  return {
    ...payload,

    userId: membership.user_id,
    companyId: membership.company_id,

    // Always use the current database role.
    roleId: membership.role_id,
    roleName: membership.role_name,
  };
}

/**
 * Get currently authenticated user from HTTP-only cookie.
 */
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("erp_token")?.value;

    if (!token) {
      return null;
    }

    const payload = await verifyToken(token);

    if (!payload) {
      return null;
    }

    return await resolveAuthenticatedUser(payload);
  } catch (error) {
    console.error(
      "Failed to validate authenticated user:",
      error
    );

    return null;
  }
}

/**
 * Revoke one session.
 */
export async function revokeSession(sessionId) {
  if (!sessionId) {
    return;
  }

  await pool.query(
    `
      UPDATE user_sessions
      SET revoked_at = COALESCE(
        revoked_at,
        CURRENT_TIMESTAMP
      )
      WHERE session_id = $1
    `,
    [sessionId]
  );
}

/**
 * Authenticate a supplied token.
 *
 * Useful in proxy.js.
 */
export async function getActiveUserFromToken(token) {
  try {
    const payload = await verifyToken(token);

    if (!payload) {
      return null;
    }

    return await resolveAuthenticatedUser(payload);
  } catch (error) {
    console.error(
      "Failed to validate token user:",
      error
    );

    return null;
  }
}

/**
 * Read token payload without requiring an active session.
 *
 * Useful during logout.
 */
export async function getTokenPayload() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("erp_token")?.value;

    return await verifyToken(token);
  } catch {
    return null;
  }
}
