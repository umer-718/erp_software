
import { NextResponse } from "next/server";
import { getTenantDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const PERMISSION_KEY = "assembly_unbuild";
const STOCK_EPSILON = 1e-9;

class ApiError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.name = "ApiError";
        this.status = status;
    }
}

function errorResponse(message, status = 400) {
    return NextResponse.json(
        {
            success: false,
            message,
        },
        { status }
    );
}

function toNumber(value) {
    const number = Number(value ?? 0);
    return Number.isFinite(number) ? number : 0;
}

function positiveNumber(value, label) {
    const number = Number(value);

    if (!Number.isFinite(number) || number <= 0) {
        throw new ApiError(
            `${label} must be greater than zero.`
        );
    }

    return number;
}

function stockKey(productId, subProductId) {
    return `${productId}:${subProductId ?? "NULL"}`;
}

function isValidDate(value) {
    if (!value) return false;

    const dateString = String(value).slice(0, 10);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return false;
    }

    const date = new Date(`${dateString}T00:00:00.000Z`);

    return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === dateString
    );
}

// =========================================================
// WAREHOUSE
//
// IMPORTANT:
// warehouses does not contain company_id.
// =========================================================

async function getWarehouse(client, warehouseId) {
    const result = await client.query(
        `
        SELECT
            warehouse_id,
            warehouse_name,
            is_active
        FROM warehouses
        WHERE warehouse_id = $1
          AND is_active = TRUE
        LIMIT 1
        `,
        [warehouseId]
    );

    if (!result.rows.length) {
        throw new ApiError(
            "Warehouse was not found or is inactive."
        );
    }

    return result.rows[0];
}

// =========================================================
// LOCK PARENT PRODUCT STOCK
// =========================================================

async function lockProductStock(
    client,
    companyId,
    productId,
    warehouseId
) {
    await client.query(
        `
        INSERT INTO stock (
            company_id,
            product_id,
            warehouse_id,
            quantity,
            updated_at
        )
        VALUES (
            $1, $2, $3, 0, CURRENT_TIMESTAMP
        )
        ON CONFLICT (
            company_id,
            product_id,
            warehouse_id
        )
        WHERE company_id IS NOT NULL
        DO NOTHING
        `,
        [companyId, productId, warehouseId]
    );

    const result = await client.query(
        `
        SELECT
            stock_id,
            quantity
        FROM stock
        WHERE company_id = $1
          AND product_id = $2
          AND warehouse_id = $3
        FOR UPDATE
        `,
        [companyId, productId, warehouseId]
    );

    if (!result.rows.length) {
        throw new ApiError(
            `Could not lock stock for product ${productId}.`,
            409
        );
    }

    return toNumber(result.rows[0].quantity);
}

// =========================================================
// LOCK SUB-PRODUCT STOCK
// =========================================================

async function lockSubProductStock(
    client,
    companyId,
    productId,
    subProductId,
    warehouseId
) {
    await client.query(
        `
        INSERT INTO sub_product_stock (
            company_id,
            product_id,
            sub_product_id,
            warehouse_id,
            quantity,
            updated_at
        )
        VALUES (
            $1, $2, $3, $4, 0, CURRENT_TIMESTAMP
        )
        ON CONFLICT (
            company_id,
            sub_product_id,
            warehouse_id
        )
        DO NOTHING
        `,
        [
            companyId,
            productId,
            subProductId,
            warehouseId,
        ]
    );

    const result = await client.query(
        `
        SELECT
            sub_product_stock_id,
            quantity
        FROM sub_product_stock
        WHERE company_id = $1
          AND product_id = $2
          AND sub_product_id = $3
          AND warehouse_id = $4
        FOR UPDATE
        `,
        [
            companyId,
            productId,
            subProductId,
            warehouseId,
        ]
    );

    if (!result.rows.length) {
        throw new ApiError(
            `Could not lock stock for sub-product ${subProductId}.`,
            409
        );
    }

    return toNumber(result.rows[0].quantity);
}

// =========================================================
// UPDATE PARENT PRODUCT STOCK
// =========================================================

async function updateProductStock(
    client,
    companyId,
    productId,
    warehouseId,
    quantity
) {
    const result = await client.query(
        `
        UPDATE stock
        SET
            quantity = quantity + $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE company_id = $2
          AND product_id = $3
          AND warehouse_id = $4
        RETURNING quantity
        `,
        [
            quantity,
            companyId,
            productId,
            warehouseId,
        ]
    );

    if (!result.rows.length) {
        throw new ApiError(
            `Unable to update stock for product ${productId}.`,
            409
        );
    }

    return toNumber(result.rows[0].quantity);
}

// =========================================================
// UPDATE SUB-PRODUCT STOCK
// =========================================================

async function updateSubProductStock(
    client,
    companyId,
    productId,
    subProductId,
    warehouseId,
    quantity
) {
    const result = await client.query(
        `
        UPDATE sub_product_stock
        SET
            quantity = quantity + $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE company_id = $2
          AND product_id = $3
          AND sub_product_id = $4
          AND warehouse_id = $5
        RETURNING quantity
        `,
        [
            quantity,
            companyId,
            productId,
            subProductId,
            warehouseId,
        ]
    );

    if (!result.rows.length) {
        throw new ApiError(
            `Unable to update stock for sub-product ${subProductId}.`,
            409
        );
    }

    return toNumber(result.rows[0].quantity);
}

// =========================================================
// RESOLVE SUB-PRODUCT
//
// sub_products does not contain company_id.
// Its identity is taken from the saved BOM snapshot.
// =========================================================

async function resolveSubProduct(
    client,
    subProductId,
    label
) {
    const result = await client.query(
        `
        SELECT
            sub_product_id,
            product_id,
            unit,
            cost_price
        FROM sub_products
        WHERE sub_product_id = $1
        LIMIT 1
        `,
        [subProductId]
    );

    if (!result.rows.length) {
        throw new ApiError(
            `${label} sub-product ${subProductId} was not found.`
        );
    }

    return result.rows[0];
}

// =========================================================
// INVENTORY LEDGER
//
// Positive quantity = receive.
// Negative quantity = issue.
// =========================================================

async function insertInventoryTransaction(
    client,
    {
        companyId,
        productId,
        subProductId,
        transactionDate,
        transactionNumber,
        warehouseName,
        uom,
        memo,
        quantity,
        rate,
        runningQuantity,
    }
) {
    const receive =
        quantity > 0 ? quantity : 0;

    const issue =
        quantity < 0 ? Math.abs(quantity) : 0;

    const receiveAmount = receive * rate;
    const issueAmount = issue * rate;

    await client.query(
        `
        INSERT INTO inventory_transactions (
            company_id,
            product_id,
            sub_product_id,
            transaction_date,
            transaction_type,
            transaction_number,
            location,
            uom,
            memo,
            transaction_rate,
            receive_quantity,
            receive_rate,
            receive_amount,
            issue_quantity,
            issue_rate,
            issue_amount,
            running_quantity,
            created_at
        )
        VALUES (
            $1,
            $2,
            $3,
            $4,
            'ASSEMBLY UNBUILD',
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11,
            $12,
            $13,
            $14,
            $15,
            $16,
            CURRENT_TIMESTAMP
        )
        `,
        [
            companyId,
            productId,
            subProductId,
            transactionDate,
            transactionNumber,
            warehouseName,
            uom || null,
            memo || null,
            rate,
            receive,
            rate,
            receiveAmount,
            issue,
            rate,
            issueAmount,
            runningQuantity,
        ]
    );
}

// =========================================================
// POST: APPROVE ASSEMBLY UNBUILD
// =========================================================

export async function POST(request, context) {
    let client;
    let transactionStarted = false;

    try {
        // -------------------------------------------------
        // 1. AUTHENTICATION
        // -------------------------------------------------

        const user = await getCurrentUser();

        if (
            !user ||
            !user.userId ||
            !user.companyId
        ) {
            return errorResponse(
                "Unauthorized. Please sign in again.",
                401
            );
        }

        const companyId = Number(user.companyId);

        if (
            !Number.isInteger(companyId) ||
            companyId <= 0
        ) {
            return errorResponse(
                "Invalid company information.",
                400
            );
        }

        // -------------------------------------------------
        // 2. PERMISSION
        // -------------------------------------------------

        await requirePermission(
            user,
            PERMISSION_KEY,
            "update"
        );

        // -------------------------------------------------
        // 3. DOCUMENT ID
        // -------------------------------------------------

        const params = await context.params;
        const unbuildId = Number(params?.id);

        if (
            !Number.isInteger(unbuildId) ||
            unbuildId <= 0
        ) {
            return errorResponse(
                "Invalid Assembly Unbuild ID.",
                400
            );
        }

        // -------------------------------------------------
        // 4. START TRANSACTION
        // -------------------------------------------------

        const db = await getTenantDb(user);

        client = await db.connect();

        await client.query("BEGIN");
        transactionStarted = true;

        // -------------------------------------------------
        // 5. LOCK ASSEMBLY UNBUILD HEADER
        // -------------------------------------------------

        const unbuildResult = await client.query(
            `
            SELECT *
            FROM assembly_unbuilds
            WHERE assembly_unbuild_id = $1
              AND company_id = $2
            FOR UPDATE
            `,
            [unbuildId, companyId]
        );

        if (!unbuildResult.rows.length) {
            throw new ApiError(
                "Assembly Unbuild was not found.",
                404
            );
        }

        const unbuild = unbuildResult.rows[0];

        const currentStatus = String(
            unbuild.status || ""
        )
            .trim()
            .toUpperCase();

        if (currentStatus !== "DRAFT") {
            throw new ApiError(
                `Only DRAFT Assembly Unbuild transactions can be approved. Current status: ${unbuild.status}.`,
                409
            );
        }

        if (unbuild.posted_at) {
            throw new ApiError(
                "This Assembly Unbuild has already been posted.",
                409
            );
        }

        const unbuildQuantity = positiveNumber(
            unbuild.unbuild_quantity,
            "Unbuild quantity"
        );

        if (!unbuild.transaction_number) {
            throw new ApiError(
                "Assembly Unbuild transaction number is missing."
            );
        }

        if (!isValidDate(unbuild.transaction_date)) {
            throw new ApiError(
                "Assembly Unbuild transaction date is invalid."
            );
        }

        if (!unbuild.warehouse_id) {
            throw new ApiError(
                "Warehouse is required."
            );
        }

        const warehouse = await getWarehouse(
            client,
            unbuild.warehouse_id
        );

        // -------------------------------------------------
        // 6. RESOLVE FINISHED ASSEMBLY
        // -------------------------------------------------

        let assemblyProductId =
            unbuild.assembly_product_id
                ? Number(unbuild.assembly_product_id)
                : null;

        const assemblySubProductId =
            unbuild.assembly_sub_product_id
                ? Number(unbuild.assembly_sub_product_id)
                : null;

        let assemblyUom = unbuild.uom || null;

        if (
            Boolean(assemblyProductId) ===
            Boolean(assemblySubProductId)
        ) {
            throw new ApiError(
                "Assembly Unbuild must contain exactly one finished product or sub-product."
            );
        }

        if (assemblySubProductId) {
            const subProduct = await resolveSubProduct(
                client,
                assemblySubProductId,
                "Finished assembly"
            );

            assemblyProductId = Number(
                subProduct.product_id
            );

            assemblyUom =
                assemblyUom || subProduct.unit || null;
        } else {
            const productResult = await client.query(
                `
                SELECT product_id, unit, cost_price
                FROM products
                WHERE product_id = $1
                LIMIT 1
                `,
                [assemblyProductId]
            );

            if (!productResult.rows.length) {
                throw new ApiError(
                    "Finished assembly product was not found."
                );
            }

            assemblyUom =
                assemblyUom ||
                productResult.rows[0].unit ||
                null;
        }

        // -------------------------------------------------
        // 7. LOAD SAVED COMPONENT SNAPSHOTS
        // -------------------------------------------------
        //
        // Do not reload the current BOM revision here.
        // The saved snapshots preserve the exact revision
        // selected when this Assembly Unbuild was created.
        // -------------------------------------------------

        const componentResult = await client.query(
            `
            SELECT *
            FROM assembly_unbuild_components
            WHERE assembly_unbuild_id = $1
            ORDER BY assembly_unbuild_component_id
            FOR UPDATE
            `,
            [unbuildId]
        );

        const components = componentResult.rows;

        if (!components.length) {
            throw new ApiError(
                "This Assembly Unbuild has no saved BOM component lines."
            );
        }

        // -------------------------------------------------
        // 8. PREPARE INVENTORY MOVEMENTS
        // -------------------------------------------------
        //
        // Finished assembly = negative issue.
        // BOM components = positive receipts.
        // -------------------------------------------------

        const movements = [];

        const finishedUnitCost = Math.max(
            0,
            toNumber(unbuild.finished_unit_cost)
        );

        // Finished assembly stock deduction.
        movements.push({
            productId: assemblyProductId,
            subProductId: assemblySubProductId,
            quantity: -unbuildQuantity,
            rate: finishedUnitCost,
            uom: assemblyUom,
            memo:
                `Finished assembly unbuild - ${unbuild.transaction_number}`,
            movementType: "FINISHED_ASSEMBLY_ISSUE",
        });

        // Component stock receipts.
        for (const component of components) {
            const productId = component.product_id
                ? Number(component.product_id)
                : null;

            const subProductId = component.sub_product_id
                ? Number(component.sub_product_id)
                : null;

            if (
                Boolean(productId) ===
                Boolean(subProductId)
            ) {
                throw new ApiError(
                    `Invalid product selection in component ${component.assembly_unbuild_component_id}.`
                );
            }

            const returnedQuantity = positiveNumber(
                component.returned_quantity,
                `Returned quantity for ${component.item_description || "component"}`
            );

            let resolvedProductId = productId;
            let resolvedUom = component.uom || null;

            if (subProductId) {
                const subProduct = await resolveSubProduct(
                    client,
                    subProductId,
                    "Component"
                );

                resolvedProductId = Number(
                    subProduct.product_id
                );

                resolvedUom =
                    resolvedUom ||
                    subProduct.unit ||
                    null;
            } else {
                const productResult = await client.query(
                    `
                    SELECT product_id, unit
                    FROM products
                    WHERE product_id = $1
                    LIMIT 1
                    `,
                    [productId]
                );

                if (!productResult.rows.length) {
                    throw new ApiError(
                        `Component product ${productId} was not found.`
                    );
                }

                resolvedUom =
                    resolvedUom ||
                    productResult.rows[0].unit ||
                    null;
            }

            const unitCost = Math.max(
                0,
                toNumber(component.unit_cost)
            );

            movements.push({
                productId: resolvedProductId,
                subProductId: subProductId || null,
                quantity: returnedQuantity,
                rate: unitCost,
                uom: resolvedUom,
                memo:
                    `BOM component returned - ${unbuild.transaction_number}: ${component.item_description}`,
                movementType: "COMPONENT_RECEIPT",
            });
        }

        // -------------------------------------------------
        // 9. VALIDATE MOVEMENT IDENTITIES
        // -------------------------------------------------

        for (const movement of movements) {
            if (
                !Number.isInteger(
                    Number(movement.productId)
                ) ||
                Number(movement.productId) <= 0
            ) {
                throw new ApiError(
                    "An inventory movement has an invalid product."
                );
            }

            movement.productId = Number(
                movement.productId
            );

            if (movement.subProductId !== null) {
                movement.subProductId = Number(
                    movement.subProductId
                );

                if (
                    !Number.isInteger(
                        movement.subProductId
                    ) ||
                    movement.subProductId <= 0
                ) {
                    throw new ApiError(
                        "An inventory movement has an invalid sub-product."
                    );
                }
            }
        }

        // -------------------------------------------------
        // 10. GROUP STOCK MOVEMENTS
        // -------------------------------------------------

        const stockItems = new Map();

        for (const movement of movements) {
            const key = stockKey(
                movement.productId,
                movement.subProductId
            );

            if (!stockItems.has(key)) {
                stockItems.set(key, {
                    productId: movement.productId,
                    subProductId: movement.subProductId,
                    currentQuantity: 0,
                    netQuantity: 0,
                    requiredFinishedIssue: 0,
                });
            }

            const item = stockItems.get(key);

            item.netQuantity += movement.quantity;

            // Finished assembly availability is checked
            // independently before any component receipt.
            if (
                movement.movementType ===
                "FINISHED_ASSEMBLY_ISSUE"
            ) {
                item.requiredFinishedIssue +=
                    Math.abs(movement.quantity);
            }
        }

        // Deterministic locking order reduces deadlocks.
        const sortedStockItems = [
            ...stockItems.values(),
        ].sort((a, b) => {
            const aKey = stockKey(
                a.productId,
                a.subProductId
            );

            const bKey = stockKey(
                b.productId,
                b.subProductId
            );

            return aKey.localeCompare(bKey);
        });

        // -------------------------------------------------
        // 11. LOCK STOCK AND VALIDATE FINISHED ASSEMBLY
        // -------------------------------------------------

        for (const item of sortedStockItems) {
            if (item.subProductId) {
                item.currentQuantity =
                    await lockSubProductStock(
                        client,
                        companyId,
                        item.productId,
                        item.subProductId,
                        unbuild.warehouse_id
                    );
            } else {
                item.currentQuantity =
                    await lockProductStock(
                        client,
                        companyId,
                        item.productId,
                        unbuild.warehouse_id
                    );
            }

            // Check finished assembly stock independently.
            // Component receipts cannot offset this shortage.
            if (
                item.currentQuantity + STOCK_EPSILON <
                item.requiredFinishedIssue
            ) {
                throw new ApiError(
                    `Insufficient finished assembly stock for product ${item.productId}` +
                    (
                        item.subProductId
                            ? ` / sub-product ${item.subProductId}`
                            : ""
                    ) +
                    `. Available: ${item.currentQuantity}, required: ${item.requiredFinishedIssue}.`,
                    409
                );
            }

            const resultingQuantity =
                item.currentQuantity + item.netQuantity;

            if (resultingQuantity < -STOCK_EPSILON) {
                throw new ApiError(
                    `Insufficient stock for product ${item.productId}` +
                    (
                        item.subProductId
                            ? ` / sub-product ${item.subProductId}`
                            : ""
                    ) +
                    `. Available: ${item.currentQuantity}, resulting quantity: ${resultingQuantity}.`,
                    409
                );
            }
        }

        // -------------------------------------------------
        // 12. UPDATE STOCK
        // -------------------------------------------------

        for (const item of sortedStockItems) {
            if (
                Math.abs(item.netQuantity) <
                STOCK_EPSILON
            ) {
                continue;
            }

            if (item.subProductId) {
                await updateSubProductStock(
                    client,
                    companyId,
                    item.productId,
                    item.subProductId,
                    unbuild.warehouse_id,
                    item.netQuantity
                );
            } else {
                await updateProductStock(
                    client,
                    companyId,
                    item.productId,
                    unbuild.warehouse_id,
                    item.netQuantity
                );
            }
        }

        // -------------------------------------------------
        // 13. INSERT INVENTORY LEDGER MOVEMENTS
        // -------------------------------------------------
        //
        // Running quantities start from the locked stock
        // balances before this transaction. This keeps the
        // ledger movements consistent with the stock update.
        // -------------------------------------------------

        const runningQuantities = new Map();

        for (const item of sortedStockItems) {
            const key = stockKey(
                item.productId,
                item.subProductId
            );

            runningQuantities.set(
                key,
                item.currentQuantity
            );
        }

        for (const movement of movements) {
            const key = stockKey(
                movement.productId,
                movement.subProductId
            );

            const nextRunningQuantity =
                runningQuantities.get(key) +
                movement.quantity;

            if (nextRunningQuantity < -STOCK_EPSILON) {
                throw new ApiError(
                    `Inventory ledger would become negative for product ${movement.productId}.`,
                    409
                );
            }

            runningQuantities.set(
                key,
                Math.abs(nextRunningQuantity) < STOCK_EPSILON
                    ? 0
                    : nextRunningQuantity
            );

            await insertInventoryTransaction(
                client,
                {
                    companyId,
                    productId: movement.productId,
                    subProductId: movement.subProductId,
                    transactionDate: unbuild.transaction_date,
                    transactionNumber: unbuild.transaction_number,
                    warehouseName: warehouse.warehouse_name,
                    uom: movement.uom,
                    memo: movement.memo,
                    quantity: movement.quantity,
                    rate: movement.rate,
                    runningQuantity: runningQuantities.get(key),
                }
            );
        }

        // -------------------------------------------------
        // 14. APPROVE AND MARK AS POSTED
        // -------------------------------------------------

        const approvalResult = await client.query(
            `
            UPDATE assembly_unbuilds
            SET
                status = 'APPROVED',
                posted_by = $1,
                posted_at = CURRENT_TIMESTAMP,
                updated_by = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE assembly_unbuild_id = $2
              AND company_id = $3
              AND UPPER(status) = 'DRAFT'
              AND posted_at IS NULL
            RETURNING *
            `,
            [
                user.userId,
                unbuildId,
                companyId,
            ]
        );

        if (!approvalResult.rows.length) {
            throw new ApiError(
                "Assembly Unbuild approval could not be completed.",
                409
            );
        }

        // -------------------------------------------------
        // 15. COMMIT
        // -------------------------------------------------

        await client.query("COMMIT");
        transactionStarted = false;

        return NextResponse.json({
            success: true,
            message:
                "Assembly Unbuild approved successfully. Finished assembly stock has been deducted and BOM components have been returned to inventory.",
            data: approvalResult.rows[0],
        });
    } catch (error) {
        // -------------------------------------------------
        // 16. ROLLBACK
        // -------------------------------------------------

        if (client && transactionStarted) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                console.error(
                    "ASSEMBLY UNBUILD ROLLBACK ERROR:",
                    rollbackError
                );
            }
        }

        console.error(
            "ASSEMBLY UNBUILD APPROVAL ERROR:",
            error
        );

        if (error?.message === "UNAUTHORIZED") {
            return errorResponse(
                "Unauthorized. Please sign in again.",
                401
            );
        }

        if (error?.message === "FORBIDDEN") {
            return errorResponse(
                "You do not have permission to approve Assembly Unbuild transactions.",
                403
            );
        }

        return errorResponse(
            error?.message ||
                "Failed to approve Assembly Unbuild.",
            error instanceof ApiError
                ? error.status
                : 500
        );
    } finally {
        if (client) {
            client.release();
        }
    }
}
