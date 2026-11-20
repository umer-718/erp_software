
import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import {
    BOM_PERMISSION,
    NO_STORE_HEADERS,
    bomError,
} from "@/lib/bom";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
    try {
        const user = await getCurrentUser();
        await requirePermission(user, BOM_PERMISSION, "view");

        const [productsResult, subProductsResult] = await Promise.all([
            pool.query(
                `
                SELECT
                    product_id,
                    sku,
                    product_name,
                    description,
                    unit,
                    item_type,
                    item_size,
                    cost_price,
                    is_active
                FROM products
                WHERE COALESCE(is_active, TRUE) = TRUE
                ORDER BY product_name
                `
            ),
            pool.query(
                `
                SELECT
                    sub_product_id,
                    product_id,
                    sku,
                    sub_product_name,
                    description,
                    unit,
                    size,
                    cost_price,
                    units_per_parent,
                    is_active
                FROM sub_products
                WHERE COALESCE(is_active, TRUE) = TRUE
                ORDER BY sub_product_name
                `
            ),
        ]);

        return NextResponse.json(
            {
                success: true,
                products: productsResult.rows,
                subProducts: subProductsResult.rows,
            },
            { headers: NO_STORE_HEADERS }
        );
    } catch (error) {
        return bomError(error);
    }
}
