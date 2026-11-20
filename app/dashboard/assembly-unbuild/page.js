
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    Plus,
    RefreshCw,
    Search,
    Eye,
    Pencil,
    Package,
    Factory,
    CalendarDays,
    Warehouse,
    ClipboardList,
    AlertCircle,
    X,
} from "lucide-react";

const API_URL = "/api/assembly-unbuild";
const PERMISSION_KEY = "assembly_unbuild";

const DEFAULT_PERMISSIONS = {
    canView: false,
    canCreate: false,
    canUpdate: false,
    canDelete: false,
};

function getPermissionValue(permission, snakeCase, camelCase) {
    return Boolean(
        permission?.[snakeCase] ??
        permission?.[camelCase] ??
        false
    );
}

function extractPermission(payload) {
    if (!payload) return null;

    if (payload.permission) return payload.permission;

    if (payload.data && !Array.isArray(payload.data)) {
        return payload.data;
    }

    if (Array.isArray(payload.permissions)) {
        return (
            payload.permissions.find(
                (item) =>
                    item.permission_key === PERMISSION_KEY ||
                    item.permissionKey === PERMISSION_KEY
            ) || null
        );
    }

    return payload;
}

function formatDate(value) {
    if (!value) return "—";

    const datePart = String(value).slice(0, 10);
    const parts = datePart.split("-");

    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    return datePart;
}

function formatQuantity(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) return "0";

    return number.toLocaleString(undefined, {
        maximumFractionDigits: 6,
    });
}

function getTransactionId(row) {
    return (
        row.assembly_unbuild_id ??
        row.assemblyUnbuildId ??
        row.id
    );
}

function getAssemblyName(row) {
    return (
        row.assembly_name ||
        row.assembly_product_name ||
        row.assembly_sub_product_name ||
        row.product_name ||
        row.sub_product_name ||
        row.assemblyName ||
        "—"
    );
}

function getBomName(row) {
    return (
        row.bom_name ||
        row.bill_of_materials_name ||
        row.bomName ||
        "—"
    );
}

function getRevisionName(row) {
    return (
        row.revision_name ||
        row.revision_number ||
        row.revisionName ||
        "—"
    );
}

function getWarehouseName(row) {
    return (
        row.warehouse_name ||
        row.warehouseName ||
        "—"
    );
}

function getStatusStyle(status) {
    const normalized = String(status || "DRAFT").toUpperCase();

    switch (normalized) {
        case "APPROVED":
        case "POSTED":
            return "bg-green-100 text-green-700 border-green-200";

        case "REJECTED":
        case "CANCELLED":
            return "bg-red-100 text-red-700 border-red-200";

        case "PENDING":
        case "PENDING_APPROVAL":
            return "bg-amber-100 text-amber-700 border-amber-200";

        case "DRAFT":
        default:
            return "bg-gray-100 text-gray-700 border-gray-200";
    }
}

export default function AssemblyUnbuildPage() {
    const [records, setRecords] = useState([]);
    const [permissions, setPermissions] = useState(DEFAULT_PERMISSIONS);

    const [loading, setLoading] = useState(true);
    const [permissionLoading, setPermissionLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");

    const loadPermissions = useCallback(async () => {
        setPermissionLoading(true);

        try {
            const response = await fetch(
                `/api/permissions/current?permissionKey=${PERMISSION_KEY}`,
                {
                    cache: "no-store",
                }
            );

            const payload = await response.json();

            if (!response.ok) {
                throw new Error(
                    payload.message || "Unable to load user permissions."
                );
            }

            const permission = extractPermission(payload);

            if (!permission) {
                setPermissions(DEFAULT_PERMISSIONS);
                return false;
            }

            const nextPermissions = {
                canView: getPermissionValue(
                    permission,
                    "can_view",
                    "canView"
                ),
                canCreate: getPermissionValue(
                    permission,
                    "can_create",
                    "canCreate"
                ),
                canUpdate: getPermissionValue(
                    permission,
                    "can_update",
                    "canUpdate"
                ),
                canDelete: getPermissionValue(
                    permission,
                    "can_delete",
                    "canDelete"
                ),
            };

            setPermissions(nextPermissions);

            return nextPermissions.canView;
        } catch (err) {
            console.error("ASSEMBLY UNBUILD PERMISSION ERROR:", err);
            setPermissions(DEFAULT_PERMISSIONS);
            setError(err.message || "Unable to verify permissions.");
            return false;
        } finally {
            setPermissionLoading(false);
        }
    }, []);

    const loadRecords = useCallback(async (showRefresh = false) => {
        if (showRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        setError("");

        try {
            const response = await fetch(API_URL, {
                method: "GET",
                cache: "no-store",
            });

            const payload = await response.json();

            if (!response.ok) {
                throw new Error(
                    payload.message ||
                    "Unable to load Assembly Unbuild transactions."
                );
            }

            const rows =
                payload.data ||
                payload.records ||
                payload.unbuilds ||
                [];

            setRecords(Array.isArray(rows) ? rows : []);
        } catch (err) {
            console.error("ASSEMBLY UNBUILD LIST ERROR:", err);
            setError(
                err.message ||
                "Failed to load Assembly Unbuild transactions."
            );
            setRecords([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        let mounted = true;

        async function initialize() {
            const canView = await loadPermissions();

            if (!mounted) return;

            if (canView) {
                await loadRecords();
            } else {
                setLoading(false);
            }
        }

        initialize();

        return () => {
            mounted = false;
        };
    }, [loadPermissions, loadRecords]);

    const filteredRecords = useMemo(() => {
        const searchValue = search.trim().toLowerCase();

        return records.filter((row) => {
            const status = String(row.status || "DRAFT").toUpperCase();

            if (
                statusFilter !== "ALL" &&
                status !== statusFilter
            ) {
                return false;
            }

            if (!searchValue) return true;

            const searchableValues = [
                row.transaction_number,
                row.transactionNumber,
                getBomName(row),
                getRevisionName(row),
                getAssemblyName(row),
                getWarehouseName(row),
                row.memo,
                row.details,
                status,
            ];

            return searchableValues.some((value) =>
                String(value || "")
                    .toLowerCase()
                    .includes(searchValue)
            );
        });
    }, [records, search, statusFilter]);

    const statistics = useMemo(() => {
        return {
            total: records.length,
            drafts: records.filter(
                (row) =>
                    String(row.status).toUpperCase() === "DRAFT"
            ).length,
            approved: records.filter(
                (row) =>
                    String(row.status).toUpperCase() === "APPROVED"
            ).length,
        };
    }, [records]);

    const handleRefresh = async () => {
        await loadRecords(true);
    };

    if (permissionLoading || loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="flex items-center gap-3 text-gray-600">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span className="text-sm font-medium">
                        Loading Assembly Unbuild...
                    </span>
                </div>
            </div>
        );
    }

    if (!permissions.canView) {
        return (
            <div className="mx-auto mt-10 max-w-xl rounded-xl border border-red-200 bg-red-50 p-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                    <AlertCircle className="h-7 w-7 text-red-600" />
                </div>

                <h2 className="text-lg font-bold text-red-800">
                    Access Denied
                </h2>

                <p className="mt-2 text-sm text-red-700">
                    You do not have permission to view Assembly Unbuild.
                    Please contact your administrator.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-4 md:p-6">
            {/* PAGE HEADER */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100">
                            <Factory className="h-6 w-6 text-orange-700" />
                        </div>

                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                Assembly Unbuild
                            </h1>

                            <p className="mt-1 text-sm text-gray-500">
                                Reverse finished assemblies and return their
                                BOM components to inventory.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <RefreshCw
                            className={`h-4 w-4 ${
                                refreshing ? "animate-spin" : ""
                            }`}
                        />
                        Refresh
                    </button>

                    {permissions.canCreate && (
                        <Link
                            href="/dashboard/assembly-unbuild/new"
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700"
                        >
                            <Plus className="h-4 w-4" />
                            New Assembly Unbuild
                        </Link>
                    )}
                </div>
            </div>

            {/* ERROR */}
            {error && (
                <div className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                        <span>{error}</span>
                    </div>

                    <button
                        type="button"
                        onClick={() => setError("")}
                        className="rounded p-1 hover:bg-red-100"
                        aria-label="Dismiss error"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">
                                Total Transactions
                            </p>
                            <p className="mt-2 text-2xl font-bold text-gray-900">
                                {statistics.total}
                            </p>
                        </div>

                        <div className="rounded-lg bg-blue-100 p-3">
                            <ClipboardList className="h-6 w-6 text-blue-700" />
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">
                                Draft Transactions
                            </p>
                            <p className="mt-2 text-2xl font-bold text-gray-900">
                                {statistics.drafts}
                            </p>
                        </div>

                        <div className="rounded-lg bg-amber-100 p-3">
                            <Pencil className="h-6 w-6 text-amber-700" />
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">
                                Approved Transactions
                            </p>
                            <p className="mt-2 text-2xl font-bold text-gray-900">
                                {statistics.approved}
                            </p>
                        </div>

                        <div className="rounded-lg bg-green-100 p-3">
                            <Package className="h-6 w-6 text-green-700" />
                        </div>
                    </div>
                </div>
            </div>

            {/* FILTERS */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                        <input
                            type="text"
                            value={search}
                            onChange={(event) =>
                                setSearch(event.target.value)
                            }
                            placeholder="Search transaction, BOM, assembly, warehouse..."
                            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(event) =>
                            setStatusFilter(event.target.value)
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 md:w-52"
                    >
                        <option value="ALL">All Statuses</option>
                        <option value="DRAFT">Draft</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                        <option value="CANCELLED">Cancelled</option>
                    </select>
                </div>
            </div>

            {/* TRANSACTION TABLE */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="flex flex-col gap-2 border-b border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="font-semibold text-gray-900">
                            Assembly Unbuild Transactions
                        </h2>
                        <p className="mt-1 text-xs text-gray-500">
                            Showing {filteredRecords.length} of {records.length} transactions
                        </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <CalendarDays className="h-4 w-4" />
                        Company transactions
                    </div>
                </div>

                {filteredRecords.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                            <Package className="h-7 w-7 text-gray-400" />
                        </div>

                        <h3 className="font-semibold text-gray-800">
                            No Assembly Unbuild transactions found
                        </h3>

                        <p className="mt-2 text-sm text-gray-500">
                            {records.length === 0
                                ? "Create your first Assembly Unbuild transaction to get started."
                                : "Try changing your search text or status filter."}
                        </p>

                        {records.length === 0 && permissions.canCreate && (
                            <Link
                                href="/dashboard/assembly-unbuild/new"
                                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700"
                            >
                                <Plus className="h-4 w-4" />
                                Create Assembly Unbuild
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1150px] text-left text-sm">
                            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th className="px-5 py-3 font-semibold">
                                        Transaction #
                                    </th>

                                    <th className="px-5 py-3 font-semibold">
                                        Date
                                    </th>

                                    <th className="px-5 py-3 font-semibold">
                                        BOM
                                    </th>

                                    <th className="px-5 py-3 font-semibold">
                                        Revision
                                    </th>

                                    <th className="px-5 py-3 font-semibold">
                                        Assembly
                                    </th>

                                    <th className="px-5 py-3 text-right font-semibold">
                                        Unbuild Qty
                                    </th>

                                    <th className="px-5 py-3 font-semibold">
                                        Warehouse
                                    </th>

                                    <th className="px-5 py-3 font-semibold">
                                        Status
                                    </th>

                                    <th className="px-5 py-3 text-center font-semibold">
                                        Actions
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100">
                                {filteredRecords.map((row) => {
                                    const id = getTransactionId(row);
                                    const status = String(
                                        row.status || "DRAFT"
                                    ).toUpperCase();

                                    const transactionNumber =
                                        row.transaction_number ||
                                        row.transactionNumber ||
                                        `AU-${id}`;

                                    const quantity =
                                        row.unbuild_quantity ??
                                        row.unbuildQuantity ??
                                        0;

                                    const uom = row.uom || "";

                                    return (
                                        <tr
                                            key={id}
                                            className="transition hover:bg-gray-50"
                                        >
                                            <td className="whitespace-nowrap px-5 py-4">
                                                <Link
                                                    href={`/dashboard/assembly-unbuild/${id}`}
                                                    className="font-semibold text-orange-700 hover:text-orange-800 hover:underline"
                                                >
                                                    {transactionNumber}
                                                </Link>
                                            </td>

                                            <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                                                {formatDate(
                                                    row.transaction_date ||
                                                    row.transactionDate
                                                )}
                                            </td>

                                            <td className="max-w-[190px] px-5 py-4">
                                                <div className="truncate font-medium text-gray-800">
                                                    {getBomName(row)}
                                                </div>
                                            </td>

                                            <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                                                {getRevisionName(row)}
                                            </td>

                                            <td className="max-w-[190px] px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Package className="h-4 w-4 shrink-0 text-gray-400" />
                                                    <span className="truncate font-medium text-gray-800">
                                                        {getAssemblyName(row)}
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="whitespace-nowrap px-5 py-4 text-right font-semibold tabular-nums text-gray-800">
                                                {formatQuantity(quantity)}{" "}
                                                <span className="font-normal text-gray-500">
                                                    {uom}
                                                </span>
                                            </td>

                                            <td className="whitespace-nowrap px-5 py-4">
                                                <div className="flex items-center gap-2 text-gray-600">
                                                    <Warehouse className="h-4 w-4 text-gray-400" />
                                                    {getWarehouseName(row)}
                                                </div>
                                            </td>

                                            <td className="whitespace-nowrap px-5 py-4">
                                                <span
                                                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusStyle(status)}`}
                                                >
                                                    {status.replaceAll("_", " ")}
                                                </span>
                                            </td>

                                            <td className="whitespace-nowrap px-5 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Link
                                                        href={`/dashboard/assembly-unbuild/${id}`}
                                                        title="View transaction"
                                                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Link>

                                                    {permissions.canUpdate &&
                                                        status === "DRAFT" && (
                                                            <Link
                                                                href={`/dashboard/assembly-unbuild/${id}`}
                                                                title="Edit transaction"
                                                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Link>
                                                        )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* FOOTER NOTE */}
            <div className="rounded-lg border border-orange-100 bg-orange-50 p-4">
                <div className="flex items-start gap-3">
                    <Factory className="mt-0.5 h-5 w-5 shrink-0 text-orange-700" />

                    <div>
                        <p className="text-sm font-semibold text-orange-900">
                            Inventory posting
                        </p>
                        <p className="mt-1 text-xs leading-5 text-orange-800">
                            Approving an Assembly Unbuild deducts the finished
                            assembly quantity and returns the saved BOM
                            component quantities to the selected warehouse.
                            Draft transactions do not change inventory.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
