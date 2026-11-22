
import { NextResponse } from "next/server";
import { getTenantDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const PERMISSION = "assembly_unbuild";

function jsonError(message, status = 500) {
    return NextResponse.json(
        { success: false, message },
        { status }
    );
}

function getErrorStatus(error) {
    if (error?.message === "UNAUTHORIZED") return 401;
    if (error?.message === "FORBIDDEN") return 403;
    return 500;
}

// =========================================================
// GET BOM DETAILS FOR ASSEMBLY UNBUILD
// =========================================================

export async function GET(request, { params }) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return jsonError("Unauthorized.", 401);
        }

        await requirePermission(user, PERMISSION, "create");

        const companyId = Number(user.companyId);

        if (!Number.isInteger(companyId) || companyId <= 0) {
            return jsonError("Invalid company information.", 400);
        }

        const resolvedParams = await params;
        const bomId = Number(resolvedParams?.id);

        if (!Number.isInteger(bomId) || bomId <= 0) {
            return jsonError("Invalid BOM ID.", 400);
        }

        const { searchParams } = new URL(request.url);

        const warehouseIdParam = searchParams.get("warehouseId");

        let warehouseId = null;

        const db = await getTenantDb(user);

        if (warehouseIdParam) {
            warehouseId = Number(warehouseIdParam);

            if (
                !Number.isInteger(warehouseId) ||
                warehouseId <= 0
            ) {
                return jsonError("Invalid warehouse ID.", 400);
            }

            const warehouseResult = await db.query(
                `
                SELECT warehouse_id, warehouse_name
                FROM warehouses
                WHERE warehouse_id = $1
                  AND company_id = $2
                LIMIT 1
                `,
                [warehouseId, companyId]
            );

            if (warehouseResult.rows.length === 0) {
                return jsonError(
                    "Selected warehouse was not found.",
                    404
                );
            }
        }

        // -------------------------------------------------
        // Load BOM belonging to the current company
        // -------------------------------------------------

        const bomResult = await db.query(
            `
            SELECT
                b.bom_id,
                b.bom_name,
                b.assembly_product_id,
                b.assembly_sub_product_id,
                b.unit_of_measure,

                p.product_name AS assembly_product_name,
                p.sku AS assembly_product_sku,

                sp.sub_product_name AS assembly_sub_product_name,
                sp.sku AS assembly_sub_product_sku,

                sp.unit AS assembly_sub_product_unit

            FROM bill_of_materials b

            LEFT JOIN products p
                ON p.product_id = b.assembly_product_id

            LEFT JOIN sub_products sp
                ON sp.sub_product_id = b.assembly_sub_product_id

            WHERE b.bom_id = $1
              AND b.company_id = $2

            LIMIT 1
            `,
            [bomId, companyId]
        );

        if (bomResult.rows.length === 0) {
            return jsonError(
                "Bill of Materials not found.",
                404
            );
        }

        const bomRow = bomResult.rows[0];

        const assemblyProductId = bomRow.assembly_product_id
            ? Number(bomRow.assembly_product_id)
            : null;

        const assemblySubProductId = bomRow.assembly_sub_product_id
            ? Number(bomRow.assembly_sub_product_id)
            : null;

        if (
            Boolean(assemblyProductId) ===
            Boolean(assemblySubProductId)
        ) {
            return jsonError(
                "This BOM must have exactly one assembly product or sub-product.",
                400
            );
        }

        // -------------------------------------------------
        // Load active revisions
        // -------------------------------------------------

        const revisionsResult = await db.query(
            `
            SELECT
                revision_id,
                bom_id,
                revision_name,
                is_active,
                has_process,
                created_at

            FROM bom_revisions

            WHERE bom_id = $1
              AND is_active = TRUE

            ORDER BY revision_id DESC
            `,
            [bomId]
        );

        const revisions = [];

        // -------------------------------------------------
        // Load components and warehouse stock per revision
        // -------------------------------------------------

        for (const revision of revisionsResult.rows) {
            const componentsResult = await db.query(
                `
                SELECT
                    bc.component_id,
                    bc.revision_id,
                    bc.product_id,
                    bc.sub_product_id,

                    bc.item_description,
                    bc.uom,
                    bc.bom_quantity,
                    bc.quantity_type,
                    bc.item_source,

                    p.product_name,
                    p.sku AS product_sku,

                    sp.sub_product_name,
                    sp.sku AS sub_product_sku,
                    sp.unit AS sub_product_unit

                FROM bom_revision_components bc

                LEFT JOIN products p
                    ON p.product_id = bc.product_id

                LEFT JOIN sub_products sp
                    ON sp.sub_product_id = bc.sub_product_id

                WHERE bc.revision_id = $1

                ORDER BY bc.component_id
                `,
                [revision.revision_id]
            );

            const components = [];

            for (const component of componentsResult.rows) {
                const productId = component.product_id
                    ? Number(component.product_id)
                    : null;

                const subProductId = component.sub_product_id
                    ? Number(component.sub_product_id)
                    : null;

                let itemBalance = 0;

                if (warehouseId) {
                    if (subProductId) {
                        const stockResult = await db.query(
                            `
                            SELECT COALESCE(quantity, 0) AS quantity

                            FROM sub_product_stock

                            WHERE company_id = $1
                              AND warehouse_id = $2
                              AND sub_product_id = $3

                            LIMIT 1
                            `,
                            [
                                companyId,
                                warehouseId,
                                subProductId,
                            ]
                        );

                        itemBalance = Number(
                            stockResult.rows[0]?.quantity || 0
                        );
                    } else if (productId) {
                        const stockResult = await db.query(
                            `
                            SELECT COALESCE(quantity, 0) AS quantity

                            FROM stock

                            WHERE company_id = $1
                              AND warehouse_id = $2
                              AND product_id = $3

                            LIMIT 1
                            `,
                            [
                                companyId,
                                warehouseId,
                                productId,
                            ]
                        );

                        itemBalance = Number(
                            stockResult.rows[0]?.quantity || 0
                        );
                    }
                }

                const itemName =
                    component.item_description ||
                    component.sub_product_name ||
                    component.product_name ||
                    "BOM Component";

                components.push({
                    componentId: component.component_id,

                    productId,
                    subProductId,

                    itemDescription: itemName,

                    productName: component.product_name || null,
                    productSku: component.product_sku || null,

                    subProductName:
                        component.sub_product_name || null,

                    subProductSku:
                        component.sub_product_sku || null,

                    uom:
                        component.uom ||
                        component.sub_product_unit ||
                        null,

                    itemBalance,

                    bomQuantity: Number(
                        component.bom_quantity || 0
                    ),

                    quantityType:
                        component.quantity_type || "QUANTITY",

                    itemSource: component.item_source || null,

                    requiredQuantity: 0,
                    returnedQuantity: 0,
                    unitCost: 0,
                    amount: 0,
                });
            }

            revisions.push({
                revisionId: revision.revision_id,
                bomId: revision.bom_id,
                revisionName: revision.revision_name,
                isActive: revision.is_active,
                hasProcess: revision.has_process,
                createdAt: revision.created_at,
                components,
            });
        }

        const assemblyType = assemblySubProductId
            ? "SUB_PRODUCT"
            : "PRODUCT";

        const assemblyName = assemblySubProductId
            ? bomRow.assembly_sub_product_name
            : bomRow.assembly_product_name;

        const assemblySku = assemblySubProductId
            ? bomRow.assembly_sub_product_sku
            : bomRow.assembly_product_sku;

        const assemblyUom =
            bomRow.unit_of_measure ||
            bomRow.assembly_sub_product_unit ||
            null;

        return NextResponse.json({
            success: true,

            bom: {
                bomId: bomRow.bom_id,
                bomName: bomRow.bom_name,

                assemblyType,
                assemblyProductId,
                assemblySubProductId,

                assemblyName,
                assemblySku,
                assemblyUom,

                warehouseId,

                revisions,
            },
        });
    } catch (error) {
        console.error(
            "ASSEMBLY UNBUILD BOM API ERROR:",
            error
        );

        return jsonError(
            error.message ||
                "Failed to load Assembly Unbuild BOM details.",
            getErrorStatus(error)
        );
    }
}
