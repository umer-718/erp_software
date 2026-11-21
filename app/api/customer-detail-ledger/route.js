
import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const PERMISSION = "customer_detail_ledger";
const DEFAULT_RECEIVABLE_ACCOUNT_ID = 6;

function jsonError(message, status = 400) {
    return NextResponse.json(
        { success: false, message },
        { status, headers: { "Cache-Control": "no-store" } }
    );
}

function positiveId(value) {
    const id = Number(value);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function money(value) {
    const result = Number(value ?? 0);
    return Number.isFinite(result)
        ? Math.round((result + Number.EPSILON) * 100) / 100
        : 0;
}

function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;

    const date = new Date(`${value}T00:00:00.000Z`);

    return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
    );
}

function companyIdOf(user) {
    return positiveId(user?.companyId ?? user?.company_id);
}

function transactionSort(a, b) {
    const dateComparison = String(a.transactionDate).localeCompare(
        String(b.transactionDate)
    );

    if (dateComparison !== 0) return dateComparison;

    const priority = {
        SALES_INVOICE: 1,
        SALES_PAYMENT: 2,
        SALES_RETURN: 3,
        JOURNAL: 4,
    };

    const priorityComparison =
        (priority[a.sourceType] || 99) -
        (priority[b.sourceType] || 99);

    if (priorityComparison !== 0) return priorityComparison;

    return String(a.transactionNumber).localeCompare(
        String(b.transactionNumber),
        undefined,
        { numeric: true }
    );
}

export async function GET(request) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return jsonError("Authentication required.", 401);
        }

        const allowed = await requirePermission(
            user,
            PERMISSION,
            "view"
        );

        if (allowed !== true) {
            return jsonError(
                "You do not have permission to view Customer Detail Ledger.",
                403
            );
        }

        const { searchParams } = new URL(request.url);

        const customerId = positiveId(searchParams.get("customerId"));
        const fromDate = searchParams.get("fromDate") || null;
        const toDate =
            searchParams.get("toDate") ||
            new Date().toISOString().slice(0, 10);

        if (fromDate && !validDate(fromDate)) {
            return jsonError("Invalid From Date.");
        }

        if (!validDate(toDate)) {
            return jsonError("Invalid To Date.");
        }

        if (fromDate && fromDate > toDate) {
            return jsonError("From Date cannot be later than To Date.");
        }

        const customersResult = await pool.query(`
            SELECT
                customer_id,
                customer_code,
                customer_name,
                phone,
                email,
                opening_balance
            FROM customers
            ORDER BY customer_name ASC
        `);

        const customers = customersResult.rows;

        if (!customerId) {
            return NextResponse.json({
                success: true,
                customers,
                customer: null,
                transactions: [],
                openingBalance: 0,
                totalDebit: 0,
                totalCredit: 0,
                closingBalance: 0,
            }, {
                headers: { "Cache-Control": "no-store" },
            });
        }

        const customerResult = await pool.query(`
            SELECT
                customer_id,
                customer_code,
                customer_name,
                phone,
                email,
                address,
                opening_balance
            FROM customers
            WHERE customer_id = $1
        `, [customerId]);

        if (!customerResult.rowCount) {
            return jsonError("Customer not found.", 404);
        }

        const customer = customerResult.rows[0];
        const companyId = companyIdOf(user);

        /*
         * Details are returned as JSON so the frontend can expand
         * each transaction without making another API request.
         */
        const transactionResult = await pool.query(
            `
            WITH receivable_accounts AS (
                SELECT $2::INTEGER AS account_id

                UNION

                SELECT DISTINCT receivable_account_id
                FROM products
                WHERE receivable_account_id IS NOT NULL
            ),

            invoice_transactions AS (
                SELECT
                    si.invoice_id::TEXT AS source_id,
                    si.invoice_date::DATE AS transaction_date,
                    si.invoice_number AS transaction_number,
                    COALESCE(
                        NULLIF(TRIM(si.notes), ''),
                        'Sales Invoice'
                    ) AS memo,
                    COALESCE(si.total_amount, 0)::NUMERIC AS debit,
                    0::NUMERIC AS credit,
                    'SALES_INVOICE'::TEXT AS source_type,

                    jsonb_build_object(
                        'invoice',
                        to_jsonb(si),

                        'customer',
                        to_jsonb(c),

                        'warehouse',
                        to_jsonb(w),

                        'items',
                        COALESCE((
                            SELECT jsonb_agg(
                                jsonb_build_object(
                                    'item',
                                    to_jsonb(sii),
                                    'product',
                                    to_jsonb(p)
                                )
                                ORDER BY sii.invoice_item_id
                            )
                            FROM sales_invoice_items sii
                            LEFT JOIN products p
                                ON p.product_id = sii.product_id
                            WHERE sii.invoice_id = si.invoice_id
                        ), '[]'::JSONB)
                    ) AS details

                FROM sales_invoices si

                LEFT JOIN customers c
                    ON c.customer_id = si.customer_id

                LEFT JOIN warehouses w
                    ON w.warehouse_id = si.warehouse_id

                WHERE si.customer_id = $1
                  AND si.invoice_date <= $3::DATE
            ),

            payment_transactions AS (
                SELECT
                    sp.payment_id::TEXT AS source_id,
                    sp.payment_date::DATE AS transaction_date,
                    sp.payment_number AS transaction_number,
                    COALESCE(
                        NULLIF(TRIM(sp.notes), ''),
                        'Customer Payment'
                    ) AS memo,
                    0::NUMERIC AS debit,
                    COALESCE(sp.amount, 0)::NUMERIC AS credit,
                    'SALES_PAYMENT'::TEXT AS source_type,

                    jsonb_build_object(
                        'payment',
                        to_jsonb(sp),

                        'customer',
                        to_jsonb(c),

                        'invoice',
                        CASE
                            WHEN si.invoice_id IS NOT NULL
                            THEN to_jsonb(si)
                            ELSE NULL
                        END,

                        'invoiceItems',
                        COALESCE((
                            SELECT jsonb_agg(
                                jsonb_build_object(
                                    'item',
                                    to_jsonb(sii),
                                    'product',
                                    to_jsonb(p)
                                )
                                ORDER BY sii.invoice_item_id
                            )
                            FROM sales_invoice_items sii
                            LEFT JOIN products p
                                ON p.product_id = sii.product_id
                            WHERE sii.invoice_id = sp.invoice_id
                        ), '[]'::JSONB)
                    ) AS details

                FROM sales_payments sp

                LEFT JOIN customers c
                    ON c.customer_id = sp.customer_id

                LEFT JOIN sales_invoices si
                    ON si.invoice_id = sp.invoice_id

                WHERE sp.customer_id = $1
                  AND sp.payment_date <= $3::DATE
            ),

            return_transactions AS (
                SELECT
                    sr.return_id::TEXT AS source_id,
                    sr.return_date::DATE AS transaction_date,
                    sr.return_number AS transaction_number,
                    COALESCE(
                        NULLIF(TRIM(sr.notes), ''),
                        'Sales Return'
                    ) AS memo,

                    0::NUMERIC AS debit,

                    GREATEST(
                        0,
                        COALESCE(sr.total_amount, 0)
                        -
                        CASE
                            WHEN UPPER(
                                COALESCE(sr.refund_method, '')
                            ) IN ('CASH', 'BANK')
                            THEN COALESCE(sr.refund_amount, 0)
                            ELSE 0
                        END
                    )::NUMERIC AS credit,

                    'SALES_RETURN'::TEXT AS source_type,

                    jsonb_build_object(
                        'return',
                        to_jsonb(sr),

                        'customer',
                        to_jsonb(c),

                        'invoice',
                        CASE
                            WHEN si.invoice_id IS NOT NULL
                            THEN to_jsonb(si)
                            ELSE NULL
                        END,

                        'items',
                        COALESCE((
                            SELECT jsonb_agg(
                                jsonb_build_object(
                                    'item',
                                    to_jsonb(sri),
                                    'product',
                                    to_jsonb(p)
                                )
                            )
                            FROM sales_return_items sri
                            LEFT JOIN products p
                                ON p.product_id =
                                   NULLIF(
                                       to_jsonb(sri)->>'product_id',
                                       ''
                                   )::INTEGER
                            WHERE COALESCE(
                                to_jsonb(sri)->>'return_id',
                                to_jsonb(sri)->>'sales_return_id'
                            ) = sr.return_id::TEXT
                        ), '[]'::JSONB)
                    ) AS details

                FROM sales_returns sr

                LEFT JOIN customers c
                    ON c.customer_id = sr.customer_id

                LEFT JOIN sales_invoices si
                    ON si.invoice_id = sr.invoice_id

                WHERE sr.customer_id = $1
                  AND sr.status = 'APPROVED'
                  AND sr.return_date <= $3::DATE
                  AND (
                      $4::INTEGER IS NULL
                      OR sr.company_id = $4::INTEGER
                  )
            ),

            other_journal_transactions AS (
                SELECT
                    je.journal_id::TEXT AS source_id,
                    je.journal_date::DATE AS transaction_date,
                    je.journal_number AS transaction_number,

                    COALESCE(
                        NULLIF(TRIM(je.description), ''),
                        'Journal Entry'
                    ) AS memo,

                    COALESCE(SUM(jel.debit), 0)::NUMERIC AS debit,
                    COALESCE(SUM(jel.credit), 0)::NUMERIC AS credit,

                    'JOURNAL'::TEXT AS source_type,

                    jsonb_build_object(
                        'journal',
                        to_jsonb(je),

                        'lines',
                        COALESCE((
                            SELECT jsonb_agg(
                                jsonb_build_object(
                                    'line',
                                    to_jsonb(all_lines),
                                    'account',
                                    to_jsonb(coa)
                                )
                                ORDER BY all_lines.journal_line_id
                            )
                            FROM journal_entry_lines all_lines
                            LEFT JOIN chart_of_accounts coa
                                ON coa.account_id = all_lines.account_id
                            WHERE all_lines.journal_id = je.journal_id
                        ), '[]'::JSONB)
                    ) AS details

                FROM journal_entries je

                INNER JOIN journal_entry_lines jel
                    ON jel.journal_id = je.journal_id

                INNER JOIN receivable_accounts ra
                    ON ra.account_id = jel.account_id

                WHERE jel.party_type = 'CUSTOMER'
                  AND jel.party_id = $1
                  AND UPPER(COALESCE(je.status, '')) = 'POSTED'
                  AND je.journal_date <= $3::DATE

                  AND COALESCE(je.reference_type, '') NOT IN (
                      'SALES_INVOICE',
                      'SALES_PAYMENT',
                      'SALES_RETURN',
                      'SALES_COGS'
                  )

                GROUP BY je.journal_id
            )

            SELECT *
            FROM (
                SELECT * FROM invoice_transactions

                UNION ALL

                SELECT * FROM payment_transactions

                UNION ALL

                SELECT * FROM return_transactions

                UNION ALL

                SELECT * FROM other_journal_transactions
            ) transactions

            ORDER BY transaction_date ASC, transaction_number ASC
            `,
            [
                customerId,
                DEFAULT_RECEIVABLE_ACCOUNT_ID,
                toDate,
                companyId,
            ]
        );

        let runningBalance = money(customer.opening_balance);
        let openingBalance = runningBalance;

        let totalDebit = 0;
        let totalCredit = 0;

        const transactions = [];

        const allTransactions = transactionResult.rows
            .map((row) => ({
                sourceId: row.source_id,
                transactionDate: row.transaction_date
                    ? String(row.transaction_date).slice(0, 10)
                    : "",
                transactionNumber: row.transaction_number || "",
                memo: row.memo || "",
                debit: money(row.debit),
                credit: money(row.credit),
                sourceType: row.source_type,
                details: row.details || {},
            }))
            .sort(transactionSort);

        for (const row of allTransactions) {
            if (fromDate && row.transactionDate < fromDate) {
                runningBalance = money(
                    runningBalance + row.debit - row.credit
                );

                openingBalance = runningBalance;
                continue;
            }

            runningBalance = money(
                runningBalance + row.debit - row.credit
            );

            totalDebit = money(totalDebit + row.debit);
            totalCredit = money(totalCredit + row.credit);

            transactions.push({
                ...row,
                runningBalance,
            });
        }

        return NextResponse.json({
            success: true,
            customers,
            customer,
            fromDate,
            toDate,
            customerOpeningBalance: money(customer.opening_balance),
            openingBalance,
            transactions,
            totalDebit,
            totalCredit,
            closingBalance: runningBalance,
        }, {
            headers: { "Cache-Control": "no-store" },
        });

    } catch (error) {
        console.error("[CUSTOMER DETAIL LEDGER ERROR]", {
            message: error.message,
            code: error.code,
            detail: error.detail,
            stack: error.stack,
        });

        return jsonError(
            error.message || "Failed to load Customer Detail Ledger.",
            Number.isInteger(error.statusCode)
                ? error.statusCode
                : 500
        );
    }
}
