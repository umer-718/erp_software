
import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const PERMISSION = "purchase_detail_ledger";

function jsonError(message, status = 500) {
    return NextResponse.json(
        { success: false, message },
        { status }
    );
}

function isValidDate(value) {
    if (!value) return true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

    const date = new Date(`${value}T00:00:00.000Z`);

    return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
    );
}

export async function GET(request) {
    try {
        // 1. Authentication
        const user = await getCurrentUser();

        if (!user) {
            return jsonError("Unauthorized. Please log in.", 401);
        }

        const companyId = Number(user.companyId);

        if (!Number.isInteger(companyId) || companyId <= 0) {
            return jsonError("Invalid company access.", 403);
        }

        // 2. Permission check
        await requirePermission(user, PERMISSION, "view");

        // 3. Read filters
        const { searchParams } = new URL(request.url);

        const supplierId = searchParams.get("supplierId");
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        if (!isValidDate(startDate) || !isValidDate(endDate)) {
            return jsonError("Invalid date format. Use YYYY-MM-DD.", 400);
        }

        if (startDate && endDate && startDate > endDate) {
            return jsonError(
                "From Date cannot be after To Date.",
                400
            );
        }

        if (supplierId && !/^\d+$/.test(supplierId)) {
            return jsonError("Invalid supplier selected.", 400);
        }

        // 4. Load suppliers belonging to this company's purchase records.
        // suppliers does not have a company_id column, so scope it through
        // the company's purchases table.
        const suppliersResult = await pool.query(
            `
            SELECT
                s.supplier_id,
                s.supplier_code,
                s.supplier_name,
                COALESCE(s.opening_balance, 0)::numeric AS opening_balance
            FROM suppliers s
            WHERE EXISTS (
                SELECT 1
                FROM purchases p
                WHERE p.supplier_id = s.supplier_id
                  AND p.company_id = $1
            )
            ORDER BY s.supplier_name ASC
            `,
            [companyId]
        );

        // Return dropdown data when no supplier has been selected.
        if (!supplierId) {
            return NextResponse.json({
                success: true,
                suppliers: suppliersResult.rows,
                supplier: null,
                openingBalance: 0,
                transactions: [],
                summary: null,
            });
        }

        // 5. Verify that the selected supplier belongs to this company.
        const supplierResult = await pool.query(
            `
            SELECT
                s.supplier_id,
                s.supplier_code,
                s.supplier_name,
                COALESCE(s.opening_balance, 0)::numeric AS opening_balance
            FROM suppliers s
            WHERE s.supplier_id = $1
              AND EXISTS (
                  SELECT 1
                  FROM purchases p
                  WHERE p.supplier_id = s.supplier_id
                    AND p.company_id = $2
              )
            LIMIT 1
            `,
            [Number(supplierId), companyId]
        );

        if (supplierResult.rows.length === 0) {
            return jsonError(
                "Supplier not found or you do not have access to this supplier.",
                404
            );
        }

        const supplier = supplierResult.rows[0];

        // 6. Calculate the opening balance for the selected date range.
        //
        // Opening payable =
        // Supplier opening balance
        // + approved purchases before From Date
        // - payments before From Date
        //
        // Only APPROVED purchase invoices affect the ledger.
        const openingResult = await pool.query(
            `
            SELECT
                COALESCE((
                    SELECT SUM(p.total_amount)
                    FROM purchases p
                    WHERE p.company_id = $1
                      AND p.supplier_id = $2
                      AND p.document_status = 'APPROVED'
                      AND (
                          $3::date IS NULL
                          OR p.purchase_date < $3::date
                      )
                ), 0)::numeric AS previous_purchases,

                COALESCE((
                    SELECT SUM(pp.amount)
                    FROM purchase_payments pp
                    INNER JOIN purchases p
                        ON p.purchase_id = pp.purchase_id
                       AND p.supplier_id = pp.supplier_id
                    WHERE p.company_id = $1
                      AND p.supplier_id = $2
                      AND p.document_status = 'APPROVED'
                      AND (
                          $3::date IS NULL
                          OR pp.payment_date < $3::date
                      )
                ), 0)::numeric AS previous_payments
            `,
            [companyId, Number(supplierId), startDate || null]
        );

        const previousPurchases = Number(
            openingResult.rows[0].previous_purchases || 0
        );

        const previousPayments = Number(
            openingResult.rows[0].previous_payments || 0
        );

        const openingBalance =
            Number(supplier.opening_balance || 0) +
            previousPurchases -
            previousPayments;

        // 7. Load approved purchase invoices and their payments.
        //
        // Purchase Invoice = Credit
        // Supplier Payment = Debit
        //
        // Payments are company-scoped through their linked purchases record.
        
        // 7. Load approved invoices and payments with their complete details.
        const transactionsResult = await pool.query(
            `
            SELECT *
            FROM (
                -- Purchase Invoice
                SELECT
                    p.purchase_date AS transaction_date,
                    p.purchase_number AS reference,
                    'Purchase Invoice' AS transaction_type,
                    COALESCE(
                        NULLIF(TRIM(p.notes), ''),
                        'Purchase Invoice'
                    ) AS memo,
                    0::numeric AS debit,
                    COALESCE(p.total_amount, 0)::numeric AS credit,
                    p.purchase_id AS transaction_id,
                    p.purchase_id,

                    jsonb_build_object(
                        'purchase', to_jsonb(p),
                        'supplier', jsonb_build_object(
                            'supplier_id', s.supplier_id,
                            'supplier_code', s.supplier_code,
                            'supplier_name', s.supplier_name,
                            'phone', s.phone,
                            'email', s.email,
                            'address', s.address
                        ),
                        'items', COALESCE((
                            SELECT jsonb_agg(
                                to_jsonb(pi)
                                ORDER BY pi.purchase_item_id
                            )
                            FROM purchase_items pi
                            WHERE pi.purchase_id = p.purchase_id
                        ), '[]'::jsonb)
                    ) AS details,

                    1 AS sort_order

                FROM purchases p
                INNER JOIN suppliers s
                    ON s.supplier_id = p.supplier_id
                WHERE p.company_id = $1
                  AND p.supplier_id = $2
                  AND p.document_status = 'APPROVED'
                  AND (
                      $3::date IS NULL
                      OR p.purchase_date >= $3::date
                  )
                  AND (
                      $4::date IS NULL
                      OR p.purchase_date <= $4::date
                  )

                UNION ALL

                -- Supplier Payment
                SELECT
                    pp.payment_date AS transaction_date,
                    pp.payment_number AS reference,
                    'Supplier Payment' AS transaction_type,
                    COALESCE(
                        NULLIF(TRIM(pp.notes), ''),
                        NULLIF(TRIM(pp.payment_method), ''),
                        'Supplier Payment'
                    ) AS memo,
                    COALESCE(pp.amount, 0)::numeric AS debit,
                    0::numeric AS credit,
                    pp.payment_id AS transaction_id,
                    pp.purchase_id,

                    jsonb_build_object(
                        'payment', to_jsonb(pp),
                        'purchase', to_jsonb(p),
                        'supplier', jsonb_build_object(
                            'supplier_id', s.supplier_id,
                            'supplier_code', s.supplier_code,
                            'supplier_name', s.supplier_name,
                            'phone', s.phone,
                            'email', s.email,
                            'address', s.address
                        ),
                        'items', COALESCE((
                            SELECT jsonb_agg(
                                to_jsonb(pi)
                                ORDER BY pi.purchase_item_id
                            )
                            FROM purchase_items pi
                            WHERE pi.purchase_id = p.purchase_id
                        ), '[]'::jsonb)
                    ) AS details,

                    2 AS sort_order

                FROM purchase_payments pp
                INNER JOIN purchases p
                    ON p.purchase_id = pp.purchase_id
                   AND p.supplier_id = pp.supplier_id
                INNER JOIN suppliers s
                    ON s.supplier_id = pp.supplier_id
                WHERE p.company_id = $1
                  AND p.supplier_id = $2
                  AND p.document_status = 'APPROVED'
                  AND (
                      $3::date IS NULL
                      OR pp.payment_date >= $3::date
                  )
                  AND (
                      $4::date IS NULL
                      OR pp.payment_date <= $4::date
                  )
            ) ledger
            ORDER BY
                transaction_date ASC,
                sort_order ASC,
                transaction_id ASC
            `,
            [
                companyId,
                Number(supplierId),
                startDate || null,
                endDate || null,
            ]
        );


        // 8. Calculate chronological running payable balance.
        let runningBalance = openingBalance;

        const transactions = transactionsResult.rows.map((row) => {
            const debit = Number(row.debit || 0);
            const credit = Number(row.credit || 0);

            runningBalance += credit - debit;

            return {
                ...row,
                debit,
                credit,
                balance: runningBalance,
            };
        });

        // 9. Calculate period totals.
        const totalPurchases = transactions.reduce(
            (sum, row) => sum + row.credit,
            0
        );

        const totalPayments = transactions.reduce(
            (sum, row) => sum + row.debit,
            0
        );

        return NextResponse.json({
            success: true,
            suppliers: suppliersResult.rows,
            supplier,
            openingBalance,
            transactions,
            summary: {
                totalPurchases,
                totalPayments,
                closingBalance: runningBalance,
            },
        });
    } catch (error) {
        console.error("PURCHASE DETAIL LEDGER API ERROR:", error);

        if (
            error.message === "UNAUTHORIZED" ||
            error.message?.toLowerCase().includes("unauthorized")
        ) {
            return jsonError("Unauthorized. Please log in.", 401);
        }

        if (
            error.message === "FORBIDDEN" ||
            error.message?.toLowerCase().includes("forbidden")
        ) {
            return jsonError(
                "You do not have permission to view Purchase Detail Ledger.",
                403
            );
        }

        return jsonError(
            error.message || "Failed to load Purchase Detail Ledger.",
            500
        );
    }
}
