
import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const user = await getCurrentUser();

        if (!user?.userId) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        const result = await pool.query(`
            SELECT
                current_database() AS database_name,
                current_user AS database_user,
                inet_server_addr()::text AS server_address,
                inet_server_port() AS server_port,
                (
                    SELECT COUNT(*)
                    FROM companies
                    WHERE company_id = 12
                ) AS company_12_exists,
                (
                    SELECT COUNT(*)
                    FROM company_databases
                    WHERE company_id = 12
                ) AS company_12_mapping_count
        `);

        return NextResponse.json({
            success: true,
            connection: result.rows[0],
        });
    } catch (error) {
        console.error("[DATABASE DIAGNOSTIC]", {
            message: error.message,
            code: error.code,
            detail: error.detail,
        });

        return NextResponse.json(
            {
                success: false,
                message: error.message,
                code: error.code,
            },
            { status: 500 }
        );
    }
}
