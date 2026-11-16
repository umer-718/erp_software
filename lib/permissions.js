// import pool from "@/lib/db";

// export async function hasPermission(
//   roleId,
//   permissionKey,
//   action = "view"
// ) {
//   const result = await pool.query(
//     `
//     SELECT
//       CASE
//         WHEN $2 = 'view' THEN rp.can_view
//         WHEN $2 = 'create' THEN rp.can_create
//         WHEN $2 = 'update' THEN rp.can_update
//         WHEN $2 = 'delete' THEN rp.can_delete
//         ELSE FALSE
//       END AS allowed

//     FROM role_permissions rp

//     INNER JOIN permissions p
//       ON p.permission_id = rp.permission_id

//     WHERE rp.role_id = $1
//       AND p.permission_key = $3
//     `,
//     [
//       roleId,
//       action,
//       permissionKey,
//     ]
//   );

//   return result.rows[0]?.allowed === true;
// }


// export async function requirePermission(
//   user,
//   permissionKey,
//   action = "view"
// ) {
//   if (!user) {
//     throw new Error("UNAUTHORIZED");
//   }

//   const allowed = await hasPermission(
//     user.roleId,
//     permissionKey,
//     action
//   );

//   if (!allowed) {
//     throw new Error("FORBIDDEN");
//   }

//   return true;
// }



import pool from "@/lib/db";

/**
 * Allowed permission actions and their database columns.
 * Never interpolate an unvalidated column name into SQL.
 */
const PERMISSION_COLUMNS = Object.freeze({
  view: "can_view",
  create: "can_create",
  update: "can_update",
  delete: "can_delete",
});

/**
 * Check a role's permission directly.
 *
 * IMPORTANT:
 * This function checks a role only.
 * It does not authenticate a user or verify company membership.
 */
export async function hasPermission(
  roleId,
  permissionKey,
  action = "view"
) {
  const permissionColumn = PERMISSION_COLUMNS[action];

  if (
    !roleId ||
    !permissionKey ||
    !permissionColumn
  ) {
    return false;
  }

  const result = await pool.query(
    `
      SELECT
        COALESCE(rp.${permissionColumn}, FALSE) AS allowed
      FROM role_permissions rp
      INNER JOIN permissions p
        ON p.permission_id = rp.permission_id
      WHERE rp.role_id = $1
        AND p.permission_key = $2
      LIMIT 1
    `,
    [roleId, permissionKey]
  );

  return result.rows[0]?.allowed === true;
}

/**
 * Require permission for the authenticated user's
 * currently selected company.
 *
 * Performs membership validation and permission checking
 * in one database query.
 *
 * The role assigned in user_companies is authoritative.
 */
export async function requirePermission(
  user,
  permissionKey,
  action = "view"
) {
  const permissionColumn = PERMISSION_COLUMNS[action];

  if (
    !user ||
    !permissionKey ||
    !permissionColumn
  ) {
    throw new Error(
      !user ? "UNAUTHORIZED" : "FORBIDDEN"
    );
  }

  const userId = user.userId ?? user.user_id;
  const companyId = user.companyId ?? user.company_id;

  if (
    userId == null ||
    companyId == null ||
    !Number.isInteger(Number(userId)) ||
    !Number.isInteger(Number(companyId)) ||
    Number(userId) <= 0 ||
    Number(companyId) <= 0
  ) {
    throw new Error("UNAUTHORIZED");
  }

  const result = await pool.query(
    `
      SELECT
        uc.role_id,
        r.role_name,
        COALESCE(
          rp.${permissionColumn},
          FALSE
        ) AS allowed

      FROM user_companies uc

      INNER JOIN roles r
        ON r.role_id = uc.role_id

      LEFT JOIN permissions p
        ON p.permission_key = $3

      LEFT JOIN role_permissions rp
        ON rp.role_id = uc.role_id
        AND rp.permission_id = p.permission_id

      WHERE uc.user_id = $1
        AND uc.company_id = $2

        AND (
          r.company_id IS NULL
          OR r.company_id = uc.company_id
        )

      LIMIT 1
    `,
    [
      Number(userId),
      Number(companyId),
      permissionKey,
    ]
  );

  // No valid company membership.
  if (result.rows.length === 0) {
    throw new Error("FORBIDDEN");
  }

  // Membership exists, but the permission is not granted.
  if (result.rows[0].allowed !== true) {
    throw new Error("FORBIDDEN");
  }

  return true;
}
