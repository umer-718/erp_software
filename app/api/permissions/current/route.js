
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getRolePermissions } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const headers = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

function json(data, status = 200) {
  return NextResponse.json(data, {
    status,
    headers,
  });
}

function getPositiveInteger(value) {
  const number = Number(value);

  return Number.isSafeInteger(number) && number > 0
    ? number
    : null;
}

export async function GET(request) {
  try {
    // Authentication validates JWT, PostgreSQL session,
    // company membership, and the current database role.
    const user = await getCurrentUser();

    if (!user) {
      return json(
        {
          success: false,
          message: "Unauthorized",
          permissions: [],
        },
        401
      );
    }

    const roleId = getPositiveInteger(
      user.roleId ?? user.role_id
    );

    if (!roleId) {
      return json(
        {
          success: false,
          message: "User role not found",
          permissions: [],
        },
        403
      );
    }

    // Permission library already caches role permissions
    // and deduplicates concurrent loads.
    const permissions = await getRolePermissions(roleId);

    const { searchParams } = new URL(request.url);

    const permissionKey = searchParams
      .get("permissionKey")
      ?.trim();

    if (permissionKey) {
      const permission = permissions.find(
        (item) =>
          item.permission_key === permissionKey
      );

      return json({
        success: true,
        permission: permission || {
          permission_key: permissionKey,
          can_view: false,
          can_create: false,
          can_update: false,
          can_delete: false,
        },
      });
    }

    return json({
      success: true,
      permissions,
    });
  } catch (error) {
    console.error(
      "GET /api/permissions/current ERROR:",
      error
    );

    return json(
      {
        success: false,
        message: "Unable to load current user permissions",
        permissions: [],
      },
      500
    );
  }
}
