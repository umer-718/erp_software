
import { NextResponse } from "next/server";
import { getTenantContext, unauthorizedResponse } from "@/lib/tenant";

export async function GET() {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return unauthorizedResponse();
    const { db } = tenant;

    const result = await db.query(`
      SELECT
        account_id,
        account_code,
        account_name,
        account_type
      FROM chart_of_accounts
      WHERE is_active = TRUE
        AND is_group = FALSE
      ORDER BY account_code
    `);

    return NextResponse.json({
      success: true,
      accounts: result.rows,
    });
  } catch (error) {
    console.error("PRODUCT ACCOUNTS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load accounting accounts.",
      },
      { status: 500 }
    );
  }
}
