
import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import {
    NO_STORE_HEADERS,
    bomError,
    positiveId,
    validationError,
} from "@/lib/bom";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ASSEMBLY_BUILD_PERMISSION = "assembly_build";

async function getRouteId(context) {
    const params = await context.params;
    return positiveId(params.id, "BOM ID");
}

export async function GET(request, context) {
    try {
        const user = await getCurrentUser();

        await requirePermission(
            user,
            ASSEMBLY_BUILD_PERMISSION,
            "create"
        );

        const companyId = positiveId(user.companyId, "Company");
        const bomId = await getRouteId(context);

        const { searchParams } = new URL(request.url);
        const warehouseValue = searchParams.get("warehouseId");

        const warehouseId = warehouseValue
            ? positiveId(warehouseValue, "Warehouse")
            : null;

        if (warehouseId) {
            const warehouseResult = await pool.query(
                `
                SELECT warehouse_id, warehouse_name
                FROM warehouses
                WHERE warehouse_id = $1
                  AND is_active = TRUE
                `,
                [warehouseId]
            );

            if (!warehouseResult.rowCount) {
                throw validationError("Selected warehouse was not found.", 404);
            }
        }

        // -------------------------------------------------
        // LOAD COMPANY-SPECIFIC BOM
        // -------------------------------------------------
        const bomResult = await pool.query(
            `
            SELECT
                b.bom_id,
                b.company_id,
                b.bom_name,
                b.assembly_product_id,
                b.assembly_sub_product_id,
                b.unit_of_measure,
                b.memo,

                p.sku AS assembly_product_sku,
                p.product_name AS assembly_product_name,
                p.unit AS assembly_product_uom,

                sp.sku AS assembly_sub_product_sku,
                sp.sub_product_name AS assembly_sub_product_name,
                sp.unit AS assembly_sub_product_uom

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

        if (!bomResult.rowCount) {
            throw validationError("Bill of Materials not found.", 404);
        }

        const bom = bomResult.rows[0];

        // -------------------------------------------------
        // LOAD ACTIVE REVISIONS
        // -------------------------------------------------
        const revisionsResult = await pool.query(
            `
            SELECT
                revision_id,
                bom_id,
                revision_name,
                run_rate,
                has_process,
                is_active
            FROM bom_revisions
            WHERE bom_id = $1
              AND is_active = TRUE
            ORDER BY revision_id
            `,
            [bomId]
        );

        const revisions = [];

        for (const revision of revisionsResult.rows) {
            // ---------------------------------------------
            // LOAD REVISION COMPONENTS
            // ---------------------------------------------
            const componentsResult = await pool.query(
                `
                SELECT
                    c.component_id,
                    c.revision_id,
                    c.product_id,
                    c.sub_product_id,
                    c.item_description,
                    c.uom,
                    c.bom_quantity,
                    c.quantity_type,
                    c.item_source,

                    p.sku AS product_sku,
                    p.product_name,

                    sp.sku AS sub_product_sku,
                    sp.sub_product_name,

                    CASE
                        WHEN c.product_id IS NOT NULL
                            THEN 'PRODUCT'
                        ELSE 'SUB_PRODUCT'
                    END AS item_type

                FROM bom_revision_components c

                LEFT JOIN products p
                    ON p.product_id = c.product_id

                LEFT JOIN sub_products sp
                    ON sp.sub_product_id = c.sub_product_id

                WHERE c.revision_id = $1

                ORDER BY c.component_id
                `,
                [revision.revision_id]
            );

            const components = [];

            for (const component of componentsResult.rows) {
                let itemBalance = 0;

                if (warehouseId && component.product_id) {
                    // Parent product balance.
                    // Only read stock belonging to this company.
                    const stockResult = await pool.query(
                        `
                        SELECT COALESCE(quantity, 0) AS quantity
                        FROM stock
                        WHERE product_id = $1
                          AND warehouse_id = $2
                          AND company_id = $3
                        LIMIT 1
                        `,
                        [
                            component.product_id,
                            warehouseId,
                            companyId,
                        ]
                    );

                    itemBalance = Number(
                        stockResult.rows[0]?.quantity || 0
                    );
                } else if (warehouseId && component.sub_product_id) {
                    // Sub-product balance is company-specific.
                    const stockResult = await pool.query(
                        `
                        SELECT COALESCE(quantity, 0) AS quantity
                        FROM sub_product_stock
                        WHERE sub_product_id = $1
                          AND warehouse_id = $2
                          AND company_id = $3
                        LIMIT 1
                        `,
                        [
                            component.sub_product_id,
                            warehouseId,
                            companyId,
                        ]
                    );

                    itemBalance = Number(
                        stockResult.rows[0]?.quantity || 0
                    );
                }

                components.push({
                    ...component,
                    itemBalance,
                    itemName:
                        component.product_name ||
                        component.sub_product_name ||
                        component.item_description ||
                        "Unnamed item",
                    itemSku:
                        component.product_sku ||
                        component.sub_product_sku ||
                        "",
                });
            }

            // ---------------------------------------------
            // LOAD MANUFACTURING ROUTING
            // ---------------------------------------------
            let process = null;

            if (revision.has_process) {
                const processResult = await pool.query(
                    `
                    SELECT
                        process_id,
                        revision_id,
                        process_name,
                        location,
                        process_description,
                        process_memo
                    FROM bom_processes
                    WHERE revision_id = $1
                    LIMIT 1
                    `,
                    [revision.revision_id]
                );

                if (processResult.rowCount) {
                    const processHeader = processResult.rows[0];

                    const stepsResult = await pool.query(
                        `
                        SELECT
                            process_step_id,
                            process_id,
                            sequence,
                            operation_name,
                            work_center,
                            operation_description
                        FROM bom_process_steps
                        WHERE process_id = $1
                        ORDER BY sequence, process_step_id
                        `,
                        [processHeader.process_id]
                    );

                    process = {
                        ...processHeader,
                        steps: stepsResult.rows,
                    };
                }
            }

            revisions.push({
                ...revision,
                components,
                process,
            });
        }

        return NextResponse.json(
            {
                success: true,
                bom: {
                    ...bom,
                    assemblyType: bom.assembly_product_id
                        ? "PRODUCT"
                        : "SUB_PRODUCT",
                    assemblyName:
                        bom.assembly_product_name ||
                        bom.assembly_sub_product_name,
                    assemblySku:
                        bom.assembly_product_sku ||
                        bom.assembly_sub_product_sku,
                    assemblyUom:
                        bom.unit_of_measure ||
                        bom.assembly_product_uom ||
                        bom.assembly_sub_product_uom ||
                        "",
                    warehouseId,
                    revisions,
                },
            },
            {
                headers: NO_STORE_HEADERS,
            }
        );
    } catch (error) {
        return bomError(error);
    }
}
