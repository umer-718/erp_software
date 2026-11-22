import { NextResponse } from "next/server";
import { getTenantContext, unauthorizedResponse } from "@/lib/tenant";

export async function GET() {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return unauthorizedResponse();
    const { db } = tenant;

    const result = await db.query(`
      SELECT
        c.customer_id,
        c.customer_code,
        c.customer_name,
        c.phone,
        c.email,
        c.opening_balance,
        c.credit_limit,
        c.is_active,

        COALESCE(
          (
            SELECT SUM(si.total_amount)
            FROM sales_invoices si
            WHERE si.customer_id = c.customer_id
          ),
          0
        ) AS total_sales,

        COALESCE(
          (
            SELECT SUM(sp.amount)
            FROM sales_payments sp
            WHERE sp.customer_id = c.customer_id
          ),
          0
        ) AS total_paid,

        (
          c.opening_balance
          +
          COALESCE(
            (
              SELECT SUM(si.total_amount)
              FROM sales_invoices si
              WHERE si.customer_id = c.customer_id
            ),
            0
          )
          -
          COALESCE(
            (
              SELECT SUM(sp.amount)
              FROM sales_payments sp
              WHERE sp.customer_id = c.customer_id
            ),
            0
          )
        ) AS balance

      FROM customers c
      ORDER BY c.customer_id DESC
    `);

    return NextResponse.json({
      success: true,
      balances: result.rows,
    });
  } catch (error) {
    console.error("CUSTOMER BALANCE GET ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load customer balances.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}