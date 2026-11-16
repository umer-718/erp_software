import { NextResponse } from "next/server";
import  pool  from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json(
                { success: false, error: "Authentication required." },
                { status: 401 }
            );
        }

        await requirePermission(user, "sales_returns", "view");

        const result = await pool.query(`
            SELECT
                account_id,
                account_code,
                account_name,
                account_type,
                is_cash_bank
            FROM chart_of_accounts
            WHERE is_active = TRUE
              AND is_cash_bank = TRUE
              AND is_group = FALSE
            ORDER BY account_code, account_name
        `);

        return NextResponse.json({
            success: true,
            accounts: result.rows,
        });
    } catch (error) {
        console.error("[SALES RETURN REFUND ACCOUNTS]", error);

        return NextResponse.json(
            {
                success: false,
                error: error.message || "Unable to load refund accounts.",
            },
            { status: error.status || 500 }
        );
    }
}