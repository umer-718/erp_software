
import { NextResponse } from "next/server";
import { getTenantDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const PERMISSION = "assembly_unbuild";
const STOCK_EPSILON = 1e-9;

function jsonError(message, status = 500) {
    return NextResponse.json(
        { success: false, message },
        { status }
    );
}

function getErrorStatus(error) {
    if (error?.message === "UNAUTHORIZED") return 401;
    if (error?.message === "FORBIDDEN") return 403;
    if (error?.status) return error.status;
    return 500;
}

function numberValue(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function stockKey(productId, subProductId) {
    return `${productId}:${subProductId || 0}`;
}

function fail(message, status = 400) {
    const error = new Error(message);
    error.status = status;
    throw error;
}

// =========================================================
// APPROVE ASSEMBLY UNBUILD
// =========================================================

export async function POST(request, { params }) {
    let client = null;
    let transactionStarted = false;

    try {
        const user = await getCurrentUser();

        if (!user) {
            return jsonError("Unauthorized.", 401);
        }

        await requirePermission(user, PERMISSION, "update");

        const companyId = Number(user.companyId);
        const userId = user.userId || null;

        if (!Number.isInteger(companyId) || companyId <= 0) {
            return jsonError("Invalid company information.", 400);
        }

        const resolvedParams = await params;
        const unbuildId = Number(resolvedParams?.id);

        if (!Number.isInteger(unbuildId) || unbuildId <= 0) {
            return jsonError("Invalid Assembly Unbuild ID.", 400);
        }

        const db = await getTenantDb(user);

        client = await db.connect();

        await client.query("BEGIN");
        transactionStarted = true;

        // -------------------------------------------------
        // 1. Lock the draft header
        // IMPORTANT: warehouses has NO company_id column.
        // -------------------------------------------------

        const headerResult = await client.query(
            `
            SELECT
                au.*,
                w.warehouse_name

            FROM assembly_unbuilds au

            INNER JOIN warehouses w
                ON w.warehouse_id = au.warehouse_id

            WHERE au.assembly_unbuild_id = $1
              AND au.company_id = $2
              AND w.is_active = TRUE

            FOR UPDATE OF au
            `,
            [unbuildId, companyId]
        );

        if (headerResult.rows.length === 0) {
            fail("Assembly Unbuild transaction not found or its warehouse is inactive.", 404);
        }

        const unbuild = headerResult.rows[0];

        if (unbuild.status !== "DRAFT") {
            fail(
                `Only DRAFT Assembly Unbuild transactions can be approved. Current status: ${unbuild.status}.`
            );
        }

        if (unbuild.posted_at) {
            fail("This Assembly Unbuild transaction has already been posted.");
        }

        const unbuildQuantity = numberValue(unbuild.unbuild_quantity);

        if (unbuildQuantity <= 0) {
            fail("Invalid Assembly Unbuild quantity.");
        }

        const warehouseId = Number(unbuild.warehouse_id);
        const warehouseName = unbuild.warehouse_name;

        if (!warehouseId || !warehouseName) {
            fail("Invalid warehouse information.");
        }

        if (!unbuild.transaction_number) {
            fail("Transaction number is missing.");
        }

        const assemblyProductId = unbuild.assembly_product_id
            ? Number(unbuild.assembly_product_id)
            : null;

        const assemblySubProductId = unbuild.assembly_sub_product_id
            ? Number(unbuild.assembly_sub_product_id)
            : null;

        if (
            Boolean(assemblyProductId) ===
            Boolean(assemblySubProductId)
        ) {
            fail("Assembly must have exactly one product or sub-product.");
        }

        // -------------------------------------------------
        // 2. Resolve finished assembly stock identity
        // -------------------------------------------------

        let finishedProductId = assemblyProductId;
        let finishedSubProductId = assemblySubProductId;
        let finishedUom = unbuild.uom || null;

        if (finishedSubProductId) {
            const subProductResult = await client.query(
                `
                SELECT
                    sub_product_id,
                    product_id,
                    unit
                FROM sub_products
                WHERE sub_product_id = $1
                LIMIT 1
                `,
                [finishedSubProductId]
            );

            if (subProductResult.rows.length === 0) {
                fail("Finished assembly sub-product was not found.", 404);
            }

            finishedProductId = Number(
                subProductResult.rows[0].product_id
            );

            finishedUom =
                finishedUom ||
                subProductResult.rows[0].unit ||
                null;
        }

        if (!finishedProductId) {
            fail("Could not resolve the finished assembly product.");
        }

        // -------------------------------------------------
        // 3. Lock and load saved component snapshots
        // -------------------------------------------------

        const componentsResult = await client.query(
            `
            SELECT
                assembly_unbuild_component_id,
                assembly_unbuild_id,
                component_id,
                product_id,
                sub_product_id,
                item_description,
                uom,
                required_quantity,
                returned_quantity,
                unit_cost,
                amount
            FROM assembly_unbuild_components
            WHERE assembly_unbuild_id = $1
            ORDER BY
                COALESCE(product_id, 0),
                COALESCE(sub_product_id, 0),
                assembly_unbuild_component_id
            FOR UPDATE
            `,
            [unbuildId]
        );

        if (componentsResult.rows.length === 0) {
            fail("No saved BOM components were found for this Unbuild.");
        }

        // -------------------------------------------------
        // 4. Prepare inventory movements
        // -------------------------------------------------

        const movements = new Map();

        function addMovement({
            productId,
            subProductId,
            issueQuantity = 0,
            receiveQuantity = 0,
            issueRate = 0,
            receiveRate = 0,
            uom = null,
            description = "",
        }) {
            const key = stockKey(productId, subProductId);

            if (!movements.has(key)) {
                movements.set(key, {
                    productId,
                    subProductId,
                    issueQuantity: 0,
                    receiveQuantity: 0,
                    issueAmount: 0,
                    receiveAmount: 0,
                    uom,
                    description,
                });
            }

            const movement = movements.get(key);

            if (issueQuantity > 0) {
                movement.issueQuantity += issueQuantity;
                movement.issueAmount += issueQuantity * issueRate;
            }

            if (receiveQuantity > 0) {
                movement.receiveQuantity += receiveQuantity;
                movement.receiveAmount += receiveQuantity * receiveRate;
            }

            if (!movement.uom && uom) {
                movement.uom = uom;
            }
        }

        const finishedUnitCost = Math.max(
            0,
            numberValue(unbuild.finished_unit_cost)
        );

        // Finished assembly is an ISSUE.
        addMovement({
            productId: finishedProductId,
            subProductId: finishedSubProductId,
            issueQuantity: unbuildQuantity,
            issueRate: finishedUnitCost,
            uom: finishedUom,
            description: "Finished Assembly",
        });

        // BOM components are RECEIPTS.
        for (const component of componentsResult.rows) {
            const productId = component.product_id
                ? Number(component.product_id)
                : null;

            const subProductId = component.sub_product_id
                ? Number(component.sub_product_id)
                : null;

            if (
                Boolean(productId) === Boolean(subProductId)
            ) {
                fail(
                    `Invalid product configuration for component: ${component.item_description}.`
                );
            }

            const returnedQuantity = numberValue(component.returned_quantity);
            const requiredQuantity = numberValue(component.required_quantity);
            const unitCost = numberValue(component.unit_cost);

            if (
                returnedQuantity < 0 ||
                requiredQuantity < 0 ||
                unitCost < 0
            ) {
                fail(
                    `Invalid quantity or cost for component: ${component.item_description}.`
                );
            }

            if (
                returnedQuantity > requiredQuantity + STOCK_EPSILON
            ) {
                fail(
                    `Returned quantity cannot exceed required quantity for ${component.item_description}.`
                );
            }

            if (returnedQuantity <= STOCK_EPSILON) {
                continue;
            }

            let resolvedProductId = productId;
            let resolvedUom = component.uom || null;

            if (subProductId) {
                const subProductResult = await client.query(
                    `
                    SELECT
                        sub_product_id,
                        product_id,
                        unit
                    FROM sub_products
                    WHERE sub_product_id = $1
                    LIMIT 1
                    `,
                    [subProductId]
                );

                if (subProductResult.rows.length === 0) {
                    fail(
                        `Sub-product not found for ${component.item_description}.`,
                        404
                    );
                }

                resolvedProductId = Number(
                    subProductResult.rows[0].product_id
                );

                resolvedUom =
                    resolvedUom ||
                    subProductResult.rows[0].unit ||
                    null;
            }

            if (!resolvedProductId) {
                fail(
                    `Invalid parent product for ${component.item_description}.`
                );
            }

            addMovement({
                productId: resolvedProductId,
                subProductId,
                receiveQuantity: returnedQuantity,
                receiveRate: unitCost,
                uom: resolvedUom,
                description: component.item_description,
            });
        }

        // -------------------------------------------------
        // 5. Sort stock identities for deterministic locks
        // -------------------------------------------------

        const sortedMovements = Array.from(
            movements.values()
        ).sort((a, b) => {
            if (a.productId !== b.productId) {
                return a.productId - b.productId;
            }

            return (
                (a.subProductId || 0) -
                (b.subProductId || 0)
            );
        });

        // -------------------------------------------------
        // 6. Create missing company-specific stock rows
        // -------------------------------------------------

        for (const movement of sortedMovements) {
            if (movement.subProductId) {
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
                    VALUES ($1, $2, $3, $4, 0, CURRENT_TIMESTAMP)
                    ON CONFLICT (
                        company_id,
                        sub_product_id,
                        warehouse_id
                    )
                    WHERE company_id IS NOT NULL
                    DO NOTHING
                    `,
                    [
                        companyId,
                        movement.productId,
                        movement.subProductId,
                        warehouseId,
                    ]
                );
            } else {
                await client.query(
                    `
                    INSERT INTO stock (
                        company_id,
                        product_id,
                        warehouse_id,
                        quantity,
                        updated_at
                    )
                    VALUES ($1, $2, $3, 0, CURRENT_TIMESTAMP)
                    ON CONFLICT (
                        company_id,
                        product_id,
                        warehouse_id
                    )
                    WHERE company_id IS NOT NULL
                    DO NOTHING
                    `,
                    [
                        companyId,
                        movement.productId,
                        warehouseId,
                    ]
                );
            }
        }

        // -------------------------------------------------
        // 7. Lock all relevant stock rows
        // -------------------------------------------------

        const lockedBalances = new Map();

        for (const movement of sortedMovements) {
            let result;

            if (movement.subProductId) {
                result = await client.query(
                    `
                    SELECT quantity
                    FROM sub_product_stock
                    WHERE company_id = $1
                      AND product_id = $2
                      AND sub_product_id = $3
                      AND warehouse_id = $4
                    FOR UPDATE
                    `,
                    [
                        companyId,
                        movement.productId,
                        movement.subProductId,
                        warehouseId,
                    ]
                );
            } else {
                result = await client.query(
                    `
                    SELECT quantity
                    FROM stock
                    WHERE company_id = $1
                      AND product_id = $2
                      AND warehouse_id = $3
                    FOR UPDATE
                    `,
                    [
                        companyId,
                        movement.productId,
                        warehouseId,
                    ]
                );
            }

            if (result.rows.length === 0) {
                fail(
                    `Unable to lock stock for ${movement.description || "inventory item"}.`
                );
            }

            const available = numberValue(result.rows[0].quantity);

            lockedBalances.set(
                stockKey(movement.productId, movement.subProductId),
                available
            );
        }

        // -------------------------------------------------
        // 8. Validate finished assembly BEFORE receipts
        // -------------------------------------------------

        const finishedKey = stockKey(
            finishedProductId,
            finishedSubProductId
        );

        const finishedAvailable = lockedBalances.get(finishedKey);

        if (
            finishedAvailable === undefined ||
            finishedAvailable + STOCK_EPSILON < unbuildQuantity
        ) {
            fail(
                `Insufficient finished assembly stock. Available: ${finishedAvailable ?? 0}, required: ${unbuildQuantity}.`
            );
        }

        // -------------------------------------------------
        // 9. Validate all issue balances independently
        // -------------------------------------------------

        for (const movement of sortedMovements) {
            const available = lockedBalances.get(
                stockKey(movement.productId, movement.subProductId)
            );

            if (
                movement.issueQuantity > 0 &&
                available + STOCK_EPSILON < movement.issueQuantity
            ) {
                fail(
                    `Insufficient stock for ${movement.description}. Available: ${available}, required: ${movement.issueQuantity}.`
                );
            }
        }

        // -------------------------------------------------
        // 10. Update stock and insert inventory transactions
        // -------------------------------------------------

        for (const movement of sortedMovements) {
            const key = stockKey(
                movement.productId,
                movement.subProductId
            );

            const currentQuantity = lockedBalances.get(key);

            const newQuantity =
                currentQuantity -
                movement.issueQuantity +
                movement.receiveQuantity;

            if (newQuantity < -STOCK_EPSILON) {
                fail(
                    `Stock cannot become negative for ${movement.description}.`
                );
            }

            const safeNewQuantity =
                Math.abs(newQuantity) <= STOCK_EPSILON
                    ? 0
                    : newQuantity;

            if (movement.subProductId) {
                await client.query(
                    `
                    UPDATE sub_product_stock
                    SET
                        quantity = $1,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE company_id = $2
                      AND product_id = $3
                      AND sub_product_id = $4
                      AND warehouse_id = $5
                    `,
                    [
                        safeNewQuantity,
                        companyId,
                        movement.productId,
                        movement.subProductId,
                        warehouseId,
                    ]
                );
            } else {
                await client.query(
                    `
                    UPDATE stock
                    SET
                        quantity = $1,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE company_id = $2
                      AND product_id = $3
                      AND warehouse_id = $4
                    `,
                    [
                        safeNewQuantity,
                        companyId,
                        movement.productId,
                        warehouseId,
                    ]
                );
            }

            const receiveAmount = movement.receiveAmount;
            const issueAmount = movement.issueAmount;

            const transactionRate =
                movement.receiveQuantity > 0
                    ? receiveAmount / movement.receiveQuantity
                    : movement.issueQuantity > 0
                        ? issueAmount / movement.issueQuantity
                        : 0;

            const memo = [
                `Assembly Unbuild ${unbuild.transaction_number}`,
                unbuild.memo || "",
            ]
                .filter(Boolean)
                .join(" - ");

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
                    running_quantity
                )
                VALUES (
                    $1, $2, $3, $4, 'ASSEMBLY UNBUILD',
                    $5, $6, $7, $8, $9,
                    $10, $11, $12, $13, $14, $15, $16
                )
                `,
                [
                    companyId,
                    movement.productId,
                    movement.subProductId,
                    unbuild.transaction_date,
                    unbuild.transaction_number,
                    warehouseName,
                    movement.uom,
                    memo,
                    transactionRate,
                    movement.receiveQuantity,
                    movement.receiveQuantity > 0
                        ? receiveAmount / movement.receiveQuantity
                        : 0,
                    receiveAmount,
                    movement.issueQuantity,
                    movement.issueQuantity > 0
                        ? issueAmount / movement.issueQuantity
                        : 0,
                    issueAmount,
                    safeNewQuantity,
                ]
            );
        }

        // -------------------------------------------------
        // 11. Approve and mark transaction as posted
        // -------------------------------------------------

        const updateResult = await client.query(
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
              AND status = 'DRAFT'
              AND posted_at IS NULL
            RETURNING *
            `,
            [
                userId,
                unbuildId,
                companyId,
            ]
        );

        if (updateResult.rows.length === 0) {
            fail(
                "Assembly Unbuild could not be approved. It may already have been posted."
            );
        }

        await client.query("COMMIT");
        transactionStarted = false;

        return NextResponse.json({
            success: true,
            message:
                "Assembly Unbuild approved successfully. Finished assembly stock deducted and BOM components returned to inventory.",
            data: updateResult.rows[0],
        });
    } catch (error) {
        if (transactionStarted && client) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                console.error("ASSEMBLY UNBUILD ROLLBACK ERROR:", rollbackError);
            }
        }

        console.error(
            "ASSEMBLY UNBUILD APPROVAL ERROR:",
            error
        );

        return jsonError(
            error.message || "Failed to approve Assembly Unbuild.",
            getErrorStatus(error)
        );
    } finally {
        if (client) {
            client.release();
        }
    }
}
