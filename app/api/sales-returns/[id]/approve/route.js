
import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const ACCOUNTS = {
    INVENTORY: 7,
    ACCOUNTS_RECEIVABLE: 6,
    SALES: 13,
    COGS: 15,
    CASH: 3,
    BANK: 5,
};

const number = (value) => {
    if (value === null || value === undefined || value === "") return 0;

    const result = Number(value);
    return Number.isFinite(result) ? result : 0;
};

const roundMoney = (value) =>
    Math.round((number(value) + Number.EPSILON) * 100) / 100;

const positiveId = (value) => {
    const result = Number(value);

    return Number.isSafeInteger(result) && result > 0
        ? result
        : null;
};

const companyIdOf = (user) =>
    positiveId(user?.companyId ?? user?.company_id);

const userIdOf = (user) =>
    positiveId(user?.userId ?? user?.user_id ?? user?.id);

function errorResponse(message, status = 400) {
    return NextResponse.json(
        {
            success: false,
            message,
            error: message,
        },
        {
            status,
            headers: { "Cache-Control": "no-store" },
        }
    );
}

function errorStatus(error) {
    if (Number.isInteger(error?.statusCode)) {
        return error.statusCode;
    }

    if (Number.isInteger(error?.status)) {
        return error.status;
    }

    if (error?.code === "23503") return 400;
    if (error?.code === "23505") return 409;
    if (error?.code === "23514") return 400;
    if (error?.code === "23502") return 400;

    return 500;
}

function throwError(message, statusCode = 400) {
    throw Object.assign(new Error(message), { statusCode });
}

async function getAccount(client, accountId) {
    const validAccountId = positiveId(accountId);

    if (!validAccountId) {
        throwError("Invalid accounting account.");
    }

    const result = await client.query(
        `
        SELECT
            account_id,
            account_code,
            account_name,
            account_type,
            is_active,
            is_group,
            is_cash_bank
        FROM chart_of_accounts
        WHERE account_id = $1
        FOR SHARE
        `,
        [validAccountId]
    );

    if (!result.rowCount) {
        throwError(`Account ${validAccountId} does not exist.`);
    }

    const account = result.rows[0];

    if (!account.is_active || account.is_group) {
        throwError(
            `Account "${account.account_name}" is inactive or is a group account.`
        );
    }

    return account;
}

async function addJournalLine(
    client,
    journalId,
    accountId,
    description,
    debit,
    credit,
    customerId = null
) {
    const safeDebit = roundMoney(debit);
    const safeCredit = roundMoney(credit);

    if (safeDebit < 0 || safeCredit < 0) {
        throwError("Journal debit and credit cannot be negative.");
    }

    if (safeDebit <= 0 && safeCredit <= 0) {
        return;
    }

    if (safeDebit > 0 && safeCredit > 0) {
        throwError(
            "A journal line cannot contain both debit and credit amounts."
        );
    }

    await client.query(
        `
        INSERT INTO journal_entry_lines (
            journal_id,
            account_id,
            description,
            debit,
            credit,
            party_type,
            party_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
            journalId,
            accountId,
            description,
            safeDebit,
            safeCredit,
            customerId ? "CUSTOMER" : null,
            customerId,
        ]
    );
}

async function changeAccountBalance(client, accountId, delta) {
    if (!accountId || !delta) return;

    const result = await client.query(
        `
        UPDATE chart_of_accounts
        SET
            current_balance = COALESCE(current_balance, 0) + $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE account_id = $2
        `,
        [roundMoney(delta), accountId]
    );

    if (!result.rowCount) {
        throwError(
            `Unable to update accounting account ${accountId}.`
        );
    }
}

async function acquireStockLock(client, productId, warehouseId) {
    await client.query(
        `
        SELECT pg_advisory_xact_lock(
            hashtextextended($1::text, 0)
        )
        `,
        [`sales-return-stock:${productId}:${warehouseId}`]
    );
}

async function updateStock(
    client,
    productId,
    warehouseId,
    quantity
) {
    await acquireStockLock(client, productId, warehouseId);

    const stockResult = await client.query(
        `
        SELECT stock_id, quantity
        FROM stock
        WHERE product_id = $1
          AND warehouse_id = $2
        FOR UPDATE
        `,
        [productId, warehouseId]
    );

    if (stockResult.rowCount > 1) {
        throwError(
            `Multiple stock records exist for product ${productId} in warehouse ${warehouseId}. Correct the duplicate stock records before approving this return.`
        );
    }

    if (stockResult.rowCount === 1) {
        await client.query(
            `
            UPDATE stock
            SET
                quantity = COALESCE(quantity, 0) + $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE stock_id = $2
            `,
            [quantity, stockResult.rows[0].stock_id]
        );
    } else {
        await client.query(
            `
            INSERT INTO stock (
                product_id,
                warehouse_id,
                quantity,
                updated_at
            )
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
            `,
            [productId, warehouseId, quantity]
        );
    }
}

async function getOriginalInvoiceCost(
    client,
    productId,
    subProductId,
    invoiceNumber
) {
    const result = await client.query(
        `
        SELECT issue_rate
        FROM inventory_transactions
        WHERE product_id = $1
          AND COALESCE(sub_product_id, 0) =
              COALESCE($2::integer, 0)
          AND transaction_number = $3
          AND transaction_type = 'SALES INVOICE'
          AND COALESCE(issue_quantity, 0) > 0
        ORDER BY inventory_transaction_id
        LIMIT 1
        `,
        [
            productId,
            subProductId,
            invoiceNumber,
        ]
    );

    if (!result.rowCount) {
        throwError(
            `Original inventory cost transaction was not found for product ${productId}. Cannot safely approve this invoice-based return.`
        );
    }

    const costRate = Number(result.rows[0].issue_rate);

    if (!Number.isFinite(costRate) || costRate < 0) {
        throwError(
            `Invalid original inventory cost for product ${productId}.`
        );
    }

    return costRate;
}

async function insertInventoryTransaction(
    client,
    {
        productId,
        subProductId,
        returnDate,
        returnNumber,
        warehouseName,
        unit,
        description,
        costRate,
        stockQuantity,
        cogsAmount,
    }
) {
    const runningResult = await client.query(
        `
        SELECT COALESCE(
            SUM(
                COALESCE(receive_quantity, 0) -
                COALESCE(issue_quantity, 0)
            ),
            0
        ) AS running_quantity
        FROM inventory_transactions
        WHERE product_id = $1
          AND COALESCE(sub_product_id, 0) =
              COALESCE($2::integer, 0)
          AND location = $3
        `,
        [
            productId,
            subProductId,
            warehouseName,
        ]
    );

    const runningQuantity =
        number(runningResult.rows[0]?.running_quantity) +
        stockQuantity;

    await client.query(
        `
        INSERT INTO inventory_transactions (
            product_id,
            sub_product_id,
            transaction_date,
            transaction_type,
            transaction_number,
            location,
            uom,
            memo,
            transaction_rate,
            old_rate,
            actual_rate,
            new_rate,
            receive_quantity,
            receive_rate,
            receive_amount,
            issue_quantity,
            issue_rate,
            issue_amount,
            running_quantity
        )
        VALUES (
            $1,
            $2,
            $3,
            'SALES RETURN',
            $4,
            $5,
            $6,
            $7,
            $8,
            $8,
            $8,
            $8,
            $9,
            $8,
            $10,
            0,
            0,
            0,
            $11
        )
        `,
        [
            productId,
            subProductId,
            returnDate,
            returnNumber,
            warehouseName,
            unit || null,
            description,
            costRate,
            stockQuantity,
            cogsAmount,
            runningQuantity,
        ]
    );
}

async function validateInvoiceReturn(
    client,
    {
        invoice,
        item,
        productId,
        quantity,
        companyId,
        returnId,
    }
) {
    const invoiceItemId = positiveId(item.invoice_item_id);

    if (!invoiceItemId) {
        throwError(
            "Every invoice-based return line must reference its original invoice item."
        );
    }

    const invoiceItemResult = await client.query(
        `
        SELECT
            invoice_item_id,
            invoice_id,
            product_id,
            sub_product_id,
            quantity
        FROM sales_invoice_items
        WHERE invoice_item_id = $1
          AND invoice_id = $2
        `,
        [
            invoiceItemId,
            invoice.invoice_id,
        ]
    );

    if (!invoiceItemResult.rowCount) {
        throwError(
            `Invoice item ${invoiceItemId} does not belong to the selected invoice.`
        );
    }

    const invoiceItem = invoiceItemResult.rows[0];

    if (
        Number(invoiceItem.product_id) !== productId ||
        Number(invoiceItem.sub_product_id || 0) !==
            Number(item.sub_product_id || 0)
    ) {
        throwError(
            `Return item does not match original invoice item ${invoiceItemId}.`
        );
    }

    const alreadyReturnedResult = await client.query(
        `
        SELECT
            COALESCE(SUM(sri.quantity), 0) AS returned_quantity
        FROM sales_return_items sri
        INNER JOIN sales_returns sr
            ON sr.return_id = sri.return_id
        WHERE sri.invoice_item_id = $1
          AND sr.company_id = $2
          AND sr.status = 'APPROVED'
          AND sr.return_id <> $3
        `,
        [
            invoiceItemId,
            companyId,
            returnId,
        ]
    );

    const alreadyReturned = number(
        alreadyReturnedResult.rows[0]?.returned_quantity
    );

    const originalQuantity = number(invoiceItem.quantity);

    if (originalQuantity <= 0) {
        throwError(
            `Original invoice item ${invoiceItemId} has an invalid quantity.`
        );
    }

    const remaining = originalQuantity - alreadyReturned;

    if (quantity > remaining + 1) {
        throwError(
            `Return quantity exceeds the remaining sold quantity. Sold: ${originalQuantity}, already approved: ${alreadyReturned}, requested: ${quantity}, remaining: ${Math.max(0, remaining)}.`
        );
    }

    return invoiceItem;
}

/**
 * POST /api/sales-returns/[id]/approve
 *
 * Approves a DRAFT Sales Return.
 *
 * This transaction:
 * 1. Locks the return and original invoice.
 * 2. Validates return quantities and accounts.
 * 3. Increases stock.
 * 4. Creates inventory transactions.
 * 5. Creates balanced accounting journal entries.
 * 6. Updates account balances.
 * 7. Marks the return APPROVED.
 */
export async function POST(request, context) {
    let client = null;
    let transactionStarted = false;

    try {
        const user = await getCurrentUser();

        if (!user) {
            return errorResponse("Authentication required.", 401);
        }

        const allowed = await requirePermission(
            user,
            "sales_returns",
            "update"
        );

        if (allowed !== true) {
            return errorResponse(
                "You do not have permission to approve Sales Returns.",
                403
            );
        }

        const companyId = companyIdOf(user);
        const userId = userIdOf(user);

        const params = await context.params;
        const returnId = positiveId(params?.id);

        if (!companyId) {
            return errorResponse(
                "Your account has no valid company.",
                403
            );
        }

        if (!userId) {
            return errorResponse(
                "Unable to identify the current user.",
                401
            );
        }

        if (!returnId) {
            return errorResponse("Invalid Sales Return ID.");
        }

        if (returnId > 2147483647) {
            return errorResponse(
                "This return ID exceeds the journal reference ID limit."
            );
        }

        let body = {};

        try {
            body = await request.json();
        } catch {
            body = {};
        }

        const requestedRefundAccountId = positiveId(
            body.refundAccountId ??
            body.refund_account_id
        );

        client = await pool.connect();

        await client.query("BEGIN");
        transactionStarted = true;

        const returnResult = await client.query(
            `
            SELECT *
            FROM sales_returns
            WHERE return_id = $1
              AND company_id = $2
            FOR UPDATE
            `,
            [
                returnId,
                companyId,
            ]
        );

        if (!returnResult.rowCount) {
            throwError("Sales Return not found.", 404);
        }

        const salesReturn = returnResult.rows[0];

        if (salesReturn.status !== "DRAFT") {
            throwError(
                `Only DRAFT returns can be approved. Current status: ${salesReturn.status}.`,
                409
            );
        }

        const returnNumber = String(
            salesReturn.return_number || ""
        ).trim();

        if (!returnNumber) {
            throwError("Sales Return number is missing.");
        }

        const existingJournal = await client.query(
            `
            SELECT journal_id, journal_number
            FROM journal_entries
            WHERE reference_type = 'SALES_RETURN'
              AND reference_id = $1
            LIMIT 1
            `,
            [returnId]
        );

        if (existingJournal.rowCount) {
            throwError(
                "A journal entry already exists for this Sales Return. Approval was stopped to prevent duplicate accounting.",
                409
            );
        }

        const itemResult = await client.query(
            `
            SELECT
                sri.return_item_id,
                sri.invoice_item_id,
                sri.product_id,
                sri.sub_product_id,
                sri.description,
                sri.quantity,
                sri.unit_price,
                sri.discount,
                sri.tax,
                sri.line_total,
                p.product_name,
                p.unit,
                p.cost_price,
                p.sales_account_id,
                p.receivable_account_id,
                sp.sub_product_name,
                sp.cost_price AS sub_product_cost_price,
                sp.units_per_parent
            FROM sales_return_items sri
            INNER JOIN products p
                ON p.product_id = sri.product_id
            LEFT JOIN sub_products sp
                ON sp.sub_product_id = sri.sub_product_id
               AND sp.product_id = sri.product_id
            WHERE sri.return_id = $1
            ORDER BY sri.return_item_id
            `,
            [returnId]
        );

        const items = itemResult.rows;

        if (!items.length) {
            throwError("This Sales Return has no items.");
        }

        const returnTotal = roundMoney(salesReturn.total_amount);
        const refundAmount = roundMoney(salesReturn.refund_amount);

        const refundMethod = String(
            salesReturn.refund_method || "CUSTOMER_CREDIT"
        ).trim().toUpperCase();

        if (returnTotal <= 0) {
            throwError("Return total must be greater than zero.");
        }

        if (refundAmount < 0 || refundAmount > returnTotal) {
            throwError(
                "Refund amount must be between zero and the return total."
            );
        }

        if (
            !["CUSTOMER_CREDIT", "CASH", "BANK"].includes(refundMethod)
        ) {
            throwError("Invalid refund method.");
        }

        // Automatic refund account mapping:
        // CASH -> Cash in Hand (account 3)
        // BANK -> Bank Account (account 5)
        // CUSTOMER_CREDIT -> no cash/bank account
        let refundAccountId = null;

        if (refundMethod === "CASH" || refundMethod === "BANK") {
            const defaultRefundAccountId =
                refundMethod === "CASH"
                    ? ACCOUNTS.CASH
                    : ACCOUNTS.BANK;

            refundAccountId =
                requestedRefundAccountId ||
                positiveId(salesReturn.refund_account_id) ||
                defaultRefundAccountId;

            const refundAccount = await getAccount(
                client,
                refundAccountId
            );

            if (!refundAccount.is_cash_bank) {
                throwError(
                    `"${refundAccount.account_name}" is not a cash/bank account.`
                );
            }
        }

        const customerId = positiveId(salesReturn.customer_id);
        const warehouseId = positiveId(salesReturn.warehouse_id);

        if (!customerId || !warehouseId) {
            throwError("Return customer or warehouse is invalid.");
        }

        const customerResult = await client.query(
            `
            SELECT customer_id, customer_name
            FROM customers
            WHERE customer_id = $1
            `,
            [customerId]
        );

        if (!customerResult.rowCount) {
            throwError("Return customer does not exist.");
        }

        const warehouseResult = await client.query(
            `
            SELECT warehouse_id, warehouse_name
            FROM warehouses
            WHERE warehouse_id = $1
            `,
            [warehouseId]
        );

        if (!warehouseResult.rowCount) {
            throwError("Return warehouse does not exist.");
        }

        const warehouseName = warehouseResult.rows[0].warehouse_name;

        let invoice = null;

        if (salesReturn.invoice_id) {
            const invoiceResult = await client.query(
                `
                SELECT
                    invoice_id,
                    invoice_number,
                    customer_id,
                    warehouse_id
                FROM sales_invoices
                WHERE invoice_id = $1
                FOR UPDATE
                `,
                [salesReturn.invoice_id]
            );

            if (!invoiceResult.rowCount) {
                throwError("Original Sales Invoice was not found.");
            }

            invoice = invoiceResult.rows[0];

            if (Number(invoice.customer_id) !== customerId) {
                throwError(
                    "Return customer does not match the original invoice."
                );
            }
        }

        const salesByAccount = new Map();
        const receivableByAccount = new Map();

        let totalRevenue = 0;
        let totalCogs = 0;

        for (const item of items) {
            const productId = positiveId(item.product_id);

            if (!productId) {
                throwError("A return line has an invalid product.");
            }

            const quantity = Number(item.quantity);
            const unitPrice = Number(item.unit_price);
            const discount = Number(item.discount);
            const tax = Number(item.tax);
            const lineTotal = roundMoney(item.line_total);

            if (
                !Number.isFinite(quantity) ||
                quantity <= 0 ||
                !Number.isFinite(unitPrice) ||
                unitPrice < 0 ||
                !Number.isFinite(discount) ||
                discount < 0 ||
                !Number.isFinite(tax) ||
                tax < 0 ||
                lineTotal < 0
            ) {
                throwError(
                    `Invalid quantity or amount for ${item.product_name}.`
                );
            }

            const subProductId = item.sub_product_id
                ? positiveId(item.sub_product_id)
                : null;

            if (item.sub_product_id && !subProductId) {
                throwError(
                    `Invalid sub-product for ${item.product_name}.`
                );
            }

            if (subProductId && !item.units_per_parent) {
                throwError(
                    `Sub-product conversion is missing for ${item.sub_product_name || item.product_name}.`
                );
            }

            const unitsPerParent = subProductId
                ? number(item.units_per_parent)
                : 1;

            if (unitsPerParent <= 0) {
                throwError(
                    `Invalid sub-product conversion for ${item.product_name}.`
                );
            }

            const stockQuantity = quantity / unitsPerParent;

            if (
                !Number.isFinite(stockQuantity) ||
                stockQuantity <= 0
            ) {
                throwError(
                    `Invalid stock quantity for ${item.product_name}.`
                );
            }

            if (invoice) {
                await validateInvoiceReturn(
                    client,
                    {
                        invoice,
                        item,
                        productId,
                        quantity,
                        companyId,
                        returnId,
                    }
                );
            } else if (item.invoice_item_id) {
                throwError(
                    "A manual return cannot contain an invoice item reference."
                );
            }

            const salesAccountId =
                positiveId(item.sales_account_id) ||
                ACCOUNTS.SALES;

            const receivableAccountId =
                positiveId(item.receivable_account_id) ||
                ACCOUNTS.ACCOUNTS_RECEIVABLE;

            salesByAccount.set(
                salesAccountId,
                roundMoney(
                    number(salesByAccount.get(salesAccountId)) +
                    lineTotal
                )
            );

            receivableByAccount.set(
                receivableAccountId,
                roundMoney(
                    number(receivableByAccount.get(receivableAccountId)) +
                    lineTotal
                )
            );

            totalRevenue = roundMoney(totalRevenue + lineTotal);

            let costRate;

            if (invoice) {
                costRate = await getOriginalInvoiceCost(
                    client,
                    productId,
                    subProductId,
                    invoice.invoice_number
                );
            } else {
                const rawCost = subProductId
                    ? item.sub_product_cost_price
                    : item.cost_price;

                costRate = number(rawCost);

                if (costRate < 0) {
                    throwError(
                        `Invalid cost price for ${item.product_name}.`
                    );
                }
            }

            const cogsAmount = roundMoney(
                stockQuantity * costRate
            );

            totalCogs = roundMoney(totalCogs + cogsAmount);

            await updateStock(
                client,
                productId,
                warehouseId,
                stockQuantity
            );

            await insertInventoryTransaction(
                client,
                {
                    productId,
                    subProductId,
                    returnDate: salesReturn.return_date,
                    returnNumber,
                    warehouseName,
                    unit: item.unit,
                    description: `Approved Sales Return ${returnNumber}`,
                    costRate,
                    stockQuantity,
                    cogsAmount,
                }
            );
        }

        if (Math.abs(totalRevenue - returnTotal) > 2) {
            throwError(
                `Return line total (${totalRevenue}) does not match return header total (${returnTotal}). Edit and save the draft again.`
            );
        }

        for (const accountId of salesByAccount.keys()) {
            await getAccount(client, accountId);
        }

        for (const accountId of receivableByAccount.keys()) {
            await getAccount(client, accountId);
        }

        const inventoryAccount = await getAccount(
            client,
            ACCOUNTS.INVENTORY
        );

        const cogsAccount = await getAccount(
            client,
            ACCOUNTS.COGS
        );

        const cashRefund =
            refundMethod === "CUSTOMER_CREDIT"
                ? 0
                : refundAmount;

        const receivableCredit = roundMoney(
            totalRevenue - cashRefund
        );

        if (receivableCredit < 0) {
            throwError("Customer credit cannot be negative.");
        }

        const journalNumber = `SR-JRN-${returnId}`;

        const journalResult = await client.query(
            `
            INSERT INTO journal_entries (
                journal_number,
                journal_date,
                reference_type,
                reference_id,
                description,
                status,
                created_by
            )
            VALUES (
                $1,
                $2,
                'SALES_RETURN',
                $3,
                $4,
                'POSTED',
                $5
            )
            RETURNING journal_id
            `,
            [
                journalNumber,
                salesReturn.return_date,
                returnId,
                `Sales Return ${returnNumber}`,
                userId,
            ]
        );

        const journalId = journalResult.rows[0].journal_id;

        // Reverse sales revenue.
        for (const [accountId, amount] of salesByAccount.entries()) {
            await addJournalLine(
                client,
                journalId,
                accountId,
                `Sales reversal - ${returnNumber}`,
                amount,
                0,
                customerId
            );

            await changeAccountBalance(
                client,
                accountId,
                -amount
            );
        }

        // Refund through Cash or Bank.
        if (cashRefund > 0) {
            if (!refundAccountId) {
                throwError(
                    "A refund account is required for a cash/bank refund."
                );
            }

            await addJournalLine(
                client,
                journalId,
                refundAccountId,
                `Refund ${refundMethod} - ${returnNumber}`,
                0,
                cashRefund,
                customerId
            );

            await changeAccountBalance(
                client,
                refundAccountId,
                -cashRefund
            );
        }

        // Credit customer receivables for the remaining amount.
        if (receivableCredit > 0) {
            const ratio =
                totalRevenue > 0
                    ? receivableCredit / totalRevenue
                    : 0;

            let allocated = 0;

            const receivableEntries = [
                ...receivableByAccount.entries(),
            ];

            for (
                let index = 0;
                index < receivableEntries.length;
                index++
            ) {
                const [accountId, originalAmount] =
                    receivableEntries[index];

                const amount =
                    index === receivableEntries.length - 1
                        ? roundMoney(receivableCredit - allocated)
                        : roundMoney(originalAmount * ratio);

                allocated = roundMoney(allocated + amount);

                if (amount <= 0) continue;

                await addJournalLine(
                    client,
                    journalId,
                    accountId,
                    `Customer credit - ${returnNumber}`,
                    0,
                    amount,
                    customerId
                );

                await changeAccountBalance(
                    client,
                    accountId,
                    -amount
                );
            }
        }

        // Reverse COGS and restore inventory value.
        if (totalCogs > 0) {
            await addJournalLine(
                client,
                journalId,
                inventoryAccount.account_id,
                `Inventory returned - ${returnNumber}`,
                totalCogs,
                0
            );

            await addJournalLine(
                client,
                journalId,
                cogsAccount.account_id,
                `COGS reversal - ${returnNumber}`,
                0,
                totalCogs
            );

            await changeAccountBalance(
                client,
                inventoryAccount.account_id,
                totalCogs
            );

            await changeAccountBalance(
                client,
                cogsAccount.account_id,
                -totalCogs
            );
        }

        const balanceResult = await client.query(
            `
            SELECT
                COALESCE(SUM(debit), 0) AS total_debit,
                COALESCE(SUM(credit), 0) AS total_credit
            FROM journal_entry_lines
            WHERE journal_id = $1
            `,
            [journalId]
        );

        const debit = roundMoney(
            balanceResult.rows[0].total_debit
        );

        const credit = roundMoney(
            balanceResult.rows[0].total_credit
        );

        if (Math.abs(debit - credit) > 1) {
            throwError(
                `Journal is not balanced. Debit: ${debit}, Credit: ${credit}.`
            );
        }

        const updateResult = await client.query(
            `
            UPDATE sales_returns
            SET
                status = 'APPROVED',
                refund_account_id = $1,
                approved_by = $2,
                approved_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE return_id = $3
              AND company_id = $4
              AND status = 'DRAFT'
            `,
            [
                refundAccountId,
                userId,
                returnId,
                companyId,
            ]
        );

        if (!updateResult.rowCount) {
            throwError(
                "Sales Return status could not be updated. Approval was cancelled.",
                409
            );
        }

        await client.query("COMMIT");
        transactionStarted = false;

        return NextResponse.json(
            {
                success: true,
                message: `Sales Return ${returnNumber} approved successfully.`,
                returnId,
                journalId,
                journalNumber,
                totalRevenue,
                totalCogs,
                refundMethod,
                refundAccountId,
                refundAmount: cashRefund,
                customerCredit: receivableCredit,
                stockUpdated: true,
                accountingPosted: true,
            },
            {
                headers: {
                    "Cache-Control": "no-store",
                },
            }
        );
    } catch (error) {
        if (transactionStarted && client) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                console.error(
                    "[SALES RETURN APPROVAL ROLLBACK ERROR]",
                    rollbackError
                );
            }
        }

        console.error(
            "[SALES RETURN APPROVAL ERROR]",
            {
                message: error.message,
                code: error.code,
                detail: error.detail,
                constraint: error.constraint,
                stack: error.stack,
            }
        );

        return errorResponse(
            error.message || "Unable to approve Sales Return.",
            errorStatus(error)
        );
    } finally {
        if (client) {
            client.release();
        }
    }
}
