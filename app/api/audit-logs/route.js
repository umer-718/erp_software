import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request) {
  try {
    const user = await getCurrentUser();

    if (!user?.companyId) {
      return NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    const page = Math.max(
      Number(searchParams.get("page") || 1),
      1
    );

    const limit = Math.min(
      Math.max(
        Number(searchParams.get("limit") || 20),
        1
      ),
      100
    );

    const search = searchParams.get("search") || "";
    const action = searchParams.get("action") || "";
    const moduleName = searchParams.get("module") || "";

    const offset = (page - 1) * limit;

    // Only the logged-in company's audit trail.
    const values = [Number(user.companyId)];
    const conditions = ["company_id = $1"];

    if (search) {
      values.push(`%${search}%`);

      conditions.push(`
        (
          username ILIKE $${values.length}
          OR description ILIKE $${values.length}
          OR module ILIKE $${values.length}
        )
      `);
    }

    if (action) {
      values.push(action);
      conditions.push(
        `action = $${values.length}`
      );
    }

    if (moduleName) {
      values.push(moduleName);
      conditions.push(
        `module = $${values.length}`
      );
    }

    const where =
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    const countResult = await pool.query(
      `
      SELECT COUNT(*)::INTEGER AS total
      FROM audit_logs
      ${where}
      `,
      values
    );

    const total = countResult.rows[0].total;

    values.push(limit);
    values.push(offset);

    const result = await pool.query(
      `
      SELECT
        audit_id,
        user_id,
        username,
        action,
        module,
        record_id,
        description,
        old_data,
        new_data,
        ip_address,
        user_agent,
        created_at
      FROM audit_logs
      ${where}
      ORDER BY created_at DESC
      LIMIT $${values.length - 1}
      OFFSET $${values.length}
      `,
      values
    );

    return NextResponse.json({
      success: true,
      logs: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("AUDIT LOG ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load audit logs.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}