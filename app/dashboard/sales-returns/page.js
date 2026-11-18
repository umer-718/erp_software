"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/* =========================================================
   HELPERS
========================================================= */

const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const money = (value) =>
    Number(value || 0).toLocaleString("en-PK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

const num = (value) => Number(value) || 0;

async function readApiResponse(response) {
    const text = await response.text();

    if (!text.trim()) {
        throw new Error(
            `API returned an empty response. Status: ${response.status} ${response.statusText}. URL: ${response.url}`
        );
    }

    let data;

    try {
        data = JSON.parse(text);
    } catch {
        throw new Error(
            `API returned invalid JSON. Status: ${response.status}. URL: ${response.url}. Response: ${text.slice(0, 500)}`
        );
    }

    if (!response.ok) {
        throw new Error(
            data.error ||
            data.message ||
            `Request failed: ${response.status} ${response.statusText}`
        );
    }

    return data;
}

function rowsFrom(data, keys = []) {
    if (Array.isArray(data)) return data;

    for (const key of keys) {
        if (Array.isArray(data?.[key])) return data[key];
    }

    return [];
}

function productIdOf(item) {
    return Number(
        item?.product_id ??
        item?.id ??
        item?.productId ??
        0
    );
}

function productNameOf(item) {
    return (
        item?.product_name ??
        item?.name ??
        item?.item_name ??
        item?.description ??
        `Product ${productIdOf(item)}`
    );
}

function invoiceItemIdOf(item) {
    return Number(item?.invoice_item_id ?? item?.id ?? 0);
}

function mapInvoiceItem(item) {
    return {
        invoiceItemId: invoiceItemIdOf(item) || null,
        productId: String(item.product_id ?? ""),
        subProductId: item.sub_product_id
            ? String(item.sub_product_id)
            : "",
        description: item.description || "",
        quantity: String(item.quantity ?? 1),
        unitPrice: String(item.unit_price ?? item.unitPrice ?? 0),
        discount: String(item.discount ?? 0),
        tax: String(item.tax ?? 0),
    };
}

function emptyLine() {
    return {
        invoiceItemId: null,
        productId: "",
        subProductId: "",
        description: "",
        quantity: "1",
        unitPrice: "0",
        discount: "0",
        tax: "0",
    };
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
    })[char]);
}

function statusStyle(status) {
    switch (String(status || "").toUpperCase()) {
        case "APPROVED":
            return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800";
        case "DRAFT":
            return "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-800";
        case "REJECTED":
            return "bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-950/50 dark:text-red-300 dark:ring-red-800";
        case "CANCELLED":
            return "bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
        default:
            return "bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-800";
    }
}

const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:disabled:bg-slate-800 dark:disabled:text-slate-400";

const labelClass =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400";

const primaryButton =
    "inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButton =
    "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800";

function Icon({ name, className = "h-5 w-5" }) {
    const common = {
        className,
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 1.8,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        viewBox: "0 0 24 24",
        xmlns: "http://www.w3.org/2000/svg",
    };

    const paths = {
        return: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l3 2" /></>,
        plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
        invoice: <><path d="M7 3h10l4 4v14H3V3h4Z" /><path d="M7 3v5h10V3M7 13h10M7 17h6" /></>,
        search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
        refresh: <><path d="M20 7v5h-5" /><path d="M4 17v-5h5" /><path d="M5.6 9a7 7 0 0 1 11.9-2L20 12M4 12l2.5 5a7 7 0 0 0 11.9-2" /></>,
        eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
        edit: <><path d="m15 5 4 4M4 20l4-.8L19 8a2.8 2.8 0 0 0-4-4L4 15l-.8 5Z" /></>,
        trash: <><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" /></>,
        print: <><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v7H6z" /></>,
        check: <><path d="m5 12 4 4L19 6" /></>,
        close: <><path d="m18 6-12 12M6 6l12 12" /></>,
        calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
        warehouse: <><path d="m3 10 9-7 9 7v11H3z" /><path d="M9 21v-7h6v7M3 10h18" /></>,
        user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
        box: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="M3 8v9l9 5 9-5V8M12 13v9" /></>,
        money: <><rect x="2" y="5" width="20" height="14" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M6 9h.01M18 15h.01" /></>,
        arrow: <><path d="M5 12h14m-6-6 6 6-6 6" /></>,
        filter: <><path d="M4 6h16M7 12h10m-7 6h4" /></>,
        plusCircle: <><circle cx="12" cy="12" r="9" /><path d="M12 8v8m-4-4h8" /></>,
        file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h8" /></>,
    };

    return <svg {...common}>{paths[name] || paths.file}</svg>;
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function SalesReturnsPage() {
    const [screen, setScreen] = useState("history");

    const [returns, setReturns] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [products, setProducts] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [refundAccounts, setRefundAccounts] = useState([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const [canView, setCanView] = useState(false);
    const [permissionsLoaded, setPermissionsLoaded] = useState(false);

    const [rights, setRights] = useState({
        create: false,
        update: false,
        delete: false,
    });

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");

    const [mode, setMode] = useState("MANUAL");
    const [editingId, setEditingId] = useState(null);
    const [selectedReturn, setSelectedReturn] = useState(null);

    const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
    const [invoiceSearch, setInvoiceSearch] = useState("");
    const [invoiceItems, setInvoiceItems] = useState([]);
    const [selectedInvoiceItemIds, setSelectedInvoiceItemIds] = useState([]);
    const [invoiceInfo, setInvoiceInfo] = useState(null);
    const [loadingInvoice, setLoadingInvoice] = useState(false);

    const [line, setLine] = useState(emptyLine());
    const [lines, setLines] = useState([]);

    const [approvalTarget, setApprovalTarget] = useState(null);
    const [approvalAccountId, setApprovalAccountId] = useState("");
    const [approving, setApproving] = useState(false);

    const [form, setForm] = useState({
        returnDate: today(),
        customerId: "",
        warehouseId: "",
        refundMethod: "CUSTOMER_CREDIT",
        refundAmount: "",
        notes: "",
    });

    /* =====================================================
       LOAD HISTORY
    ===================================================== */

    const loadHistory = useCallback(async () => {
        const response = await fetch("/api/sales-returns", {
            method: "GET",
            cache: "no-store",
            headers: { Accept: "application/json" },
        });

        const data = await readApiResponse(response);

        if (data.success === false) {
            throw new Error(data.message || data.error || "Unable to load sales returns.");
        }

        setReturns(rowsFrom(data, ["salesReturns", "returns", "data"]));
        return data;
    }, []);

    /* =====================================================
       LOAD PERMISSIONS
    ===================================================== */

    useEffect(() => {
        let active = true;

        async function loadPermissions() {
            try {
                const response = await fetch(
                    "/api/permissions/current?permissionKey=sales_returns",
                    {
                        method: "GET",
                        cache: "no-store",
                        headers: { Accept: "application/json" },
                    }
                );

                const data = await readApiResponse(response);

                if (!active) return;

                const permission =
                    data?.permission ??
                    data?.permissions?.[0] ??
                    data;

                setCanView(Boolean(
                    permission?.can_view ??
                    permission?.canView ??
                    data?.canView ??
                    data?.can_view
                ));

                setRights({
                    create: Boolean(
                        permission?.can_create ??
                        permission?.canCreate ??
                        data?.canCreate ??
                        data?.can_create
                    ),
                    update: Boolean(
                        permission?.can_update ??
                        permission?.canUpdate ??
                        data?.canUpdate ??
                        data?.can_update
                    ),
                    delete: Boolean(
                        permission?.can_delete ??
                        permission?.canDelete ??
                        data?.canDelete ??
                        data?.can_delete
                    ),
                });
            } catch (err) {
                if (active) {
                    setCanView(false);
                    setRights({ create: false, update: false, delete: false });
                    setError(err.message || "Unable to load permissions.");
                }
            } finally {
                if (active) setPermissionsLoaded(true);
            }
        }

        loadPermissions();

        return () => {
            active = false;
        };
    }, []);

    /* =====================================================
       LOAD INITIAL DATA
    ===================================================== */

    useEffect(() => {
        if (!permissionsLoaded || !canView) return;

        let active = true;

        async function loadInitialData() {
            const requests = [
                { url: "/api/sales-returns", keys: ["salesReturns", "returns", "data"] },
                { url: "/api/customers", keys: ["customers", "data"] },
                { url: "/api/warehouses", keys: ["warehouses", "data"] },
                { url: "/api/products", keys: ["products", "data", "items"] },
                { url: "/api/sales-invoices", keys: ["invoices", "salesInvoices", "data"] },
                { url: "/api/sales-returns/refund-accounts", keys: ["accounts", "data"] },
            ];

            try {
                const results = await Promise.all(
                    requests.map(async ({ url, keys }) => {
                        try {
                            const response = await fetch(url, {
                                method: "GET",
                                cache: "no-store",
                                headers: { Accept: "application/json" },
                            });

                            const data = await readApiResponse(response);

                            if (data.success === false) {
                                throw new Error(data.message || data.error || `Unable to load ${url}`);
                            }

                            return { url, rows: rowsFrom(data, keys) };
                        } catch (err) {
                            return { url, loadError: err.message, rows: [] };
                        }
                    })
                );

                if (!active) return;

                for (const result of results) {
                    if (result.loadError) continue;

                    if (result.url === "/api/sales-returns") setReturns(result.rows);
                    if (result.url === "/api/customers") setCustomers(result.rows);
                    if (result.url === "/api/warehouses") setWarehouses(result.rows);
                    if (result.url === "/api/products") setProducts(result.rows);
                    if (result.url === "/api/sales-invoices") setInvoices(result.rows);

                    if (result.url === "/api/sales-returns/refund-accounts") {
                        setRefundAccounts(result.rows);
                    }
                }

                const failed = results.filter((item) => item.loadError);

                if (failed.length) {
                    setError(
                        failed.map((item) => `${item.url}: ${item.loadError}`).join(" | ")
                    );
                }
            } catch (err) {
                if (active) setError(err.message || "Unable to load Sales Returns data.");
            } finally {
                if (active) setLoading(false);
            }
        }

        loadInitialData();

        return () => {
            active = false;
        };
    }, [permissionsLoaded, canView]);

    /* =====================================================
       FILTERS AND METRICS
    ===================================================== */

    const filteredReturns = useMemo(() => {
        const term = search.trim().toLowerCase();

        return returns.filter((item) => {
            const matchesSearch =
                !term ||
                [
                    item.return_number,
                    item.invoice_number,
                    item.customer_id,
                    item.return_id,
                ].some((value) =>
                    String(value ?? "").toLowerCase().includes(term)
                );

            const matchesStatus =
                statusFilter === "ALL" ||
                String(item.status || "").toUpperCase() === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [returns, search, statusFilter]);

    const metrics = useMemo(() => ({
        total: returns.length,
        drafts: returns.filter((x) => x.status === "DRAFT").length,
        approved: returns.filter((x) => x.status === "APPROVED").length,
        value: returns.reduce((sum, x) => sum + num(x.total_amount), 0),
    }), [returns]);

    const subtotal = useMemo(
        () => lines.reduce(
            (sum, item) => sum + num(item.quantity) * num(item.unitPrice),
            0
        ),
        [lines]
    );

    const totalDiscount = useMemo(
        () => lines.reduce((sum, item) => sum + num(item.discount), 0),
        [lines]
    );

    const totalTax = useMemo(
        () => lines.reduce((sum, item) => sum + num(item.tax), 0),
        [lines]
    );

    const total = subtotal - totalDiscount + totalTax;

    /* =====================================================
       LABEL HELPERS
    ===================================================== */

    function customerLabel(id) {
        const item = customers.find(
            (x) => Number(x.customer_id ?? x.id) === Number(id)
        );

        return item?.customer_name ?? item?.name ?? `Customer #${id}`;
    }

    function warehouseLabel(id) {
        const item = warehouses.find(
            (x) => Number(x.warehouse_id ?? x.id) === Number(id)
        );

        return item?.warehouse_name ?? item?.name ?? `Warehouse #${id}`;
    }

    function productLabel(id) {
        const item = products.find((x) => productIdOf(x) === Number(id));
        return item ? productNameOf(item) : `Product #${id}`;
    }

    /* =====================================================
       RESET FORM
    ===================================================== */

    function resetForm() {
        setEditingId(null);
        setSelectedReturn(null);
        setSelectedInvoiceId("");
        setInvoiceInfo(null);
        setInvoiceItems([]);
        setSelectedInvoiceItemIds([]);
        setInvoiceSearch("");
        setMode("MANUAL");

        setForm({
            returnDate: today(),
            customerId: "",
            warehouseId: "",
            refundMethod: "CUSTOMER_CREDIT",
            refundAmount: "",
            notes: "",
        });

        setLine(emptyLine());
        setLines([]);
        setMessage("");
        setError("");
    }

    /* =====================================================
       START NEW
    ===================================================== */

    function startNew(type) {
        if (!rights.create) {
            setError("You do not have permission to create sales returns.");
            return;
        }

        resetForm();
        setMode(type);
        setScreen(type === "INVOICE" ? "invoice-picker" : "form");
    }

    /* =====================================================
       SELECT INVOICE
    ===================================================== */

    async function chooseInvoice(invoice) {
        const id = Number(invoice.invoice_id ?? invoice.id);

        if (!id) {
            setError("Invalid invoice selected.");
            return;
        }

        setLoadingInvoice(true);
        setError("");

        try {
            const response = await fetch(`/api/sales-invoices/${id}`, {
                method: "GET",
                cache: "no-store",
                headers: { Accept: "application/json" },
            });

            const data = await readApiResponse(response);

            if (data.success === false) {
                throw new Error(data.message || data.error || "Unable to load invoice.");
            }

            const detail = data.invoice ?? data.salesInvoice ?? data;

            const invoiceLines = rowsFrom(data, [
                "items",
                "invoiceItems",
                "salesInvoiceItems",
            ]);

            const finalInvoiceLines = invoiceLines.length
                ? invoiceLines
                : rowsFrom(detail, ["items", "invoiceItems", "salesInvoiceItems"]);

            if (!finalInvoiceLines.length) {
                throw new Error("No invoice items were returned for this invoice.");
            }

            const validInvoiceLines = finalInvoiceLines.filter(
                (item) => invoiceItemIdOf(item) > 0
            );

            if (!validInvoiceLines.length) {
                throw new Error("Invoice items do not contain valid invoice item IDs.");
            }

            setInvoiceInfo(detail);
            setSelectedInvoiceId(String(id));

            setForm((current) => ({
                ...current,
                customerId: String(detail.customer_id ?? invoice.customer_id ?? ""),
                warehouseId: String(detail.warehouse_id ?? invoice.warehouse_id ?? ""),
            }));

            setInvoiceItems(validInvoiceLines);

            // Initially select all invoice items.
            setSelectedInvoiceItemIds(
                validInvoiceLines.map((item) => invoiceItemIdOf(item))
            );

            setLines(validInvoiceLines.map(mapInvoiceItem));

            setMode("INVOICE");
            setScreen("form");
        } catch (err) {
            setError(err.message || "Unable to select invoice.");
        } finally {
            setLoadingInvoice(false);
        }
    }

    /* =====================================================
       INVOICE ITEM SELECTION
    ===================================================== */

    function toggleInvoiceItem(item, checked) {
        const invoiceItemId = invoiceItemIdOf(item);

        if (!invoiceItemId) {
            setError("This invoice item does not have a valid ID.");
            return;
        }

        setSelectedInvoiceItemIds((current) => {
            if (checked) {
                return current.includes(invoiceItemId)
                    ? current
                    : [...current, invoiceItemId];
            }

            return current.filter((id) => id !== invoiceItemId);
        });

        if (checked) {
            setLines((current) => {
                const alreadyExists = current.some(
                    (line) => Number(line.invoiceItemId) === invoiceItemId
                );

                if (alreadyExists) return current;

                return [...current, mapInvoiceItem(item)];
            });
        } else {
            setLines((current) =>
                current.filter(
                    (line) => Number(line.invoiceItemId) !== invoiceItemId
                )
            );
        }

        setError("");
    }

    function selectAllInvoiceItems() {
        setSelectedInvoiceItemIds(
            invoiceItems.map((item) => invoiceItemIdOf(item))
        );

        setLines((current) => {
            const existing = new Map(
                current.map((item) => [
                    Number(item.invoiceItemId),
                    item,
                ])
            );

            return invoiceItems.map((item) => {
                const id = invoiceItemIdOf(item);
                return existing.get(id) || mapInvoiceItem(item);
            });
        });

        setError("");
    }

    function deselectAllInvoiceItems() {
        setSelectedInvoiceItemIds([]);
        setLines([]);
        setError("");
    }

    /* =====================================================
       MANUAL ITEM ENTRY
    ===================================================== */

    function addLine() {
        const productId = Number(line.productId);
        const quantity = num(line.quantity);
        const unitPrice = num(line.unitPrice);
        const discount = num(line.discount);
        const tax = num(line.tax);

        if (!productId) return setError("Select an item.");
        if (quantity <= 0) return setError("Enter a quantity greater than zero.");

        if (unitPrice < 0 || discount < 0 || tax < 0) {
            return setError("Price, discount and tax cannot be negative.");
        }

        if (discount > quantity * unitPrice) {
            return setError("Discount cannot exceed the line amount.");
        }

        setLines((current) => [
            ...current,
            { ...line, productId: String(productId), invoiceItemId: null },
        ]);

        setLine(emptyLine());
        setError("");
    }

    function removeLine(index) {
        const item = lines[index];

        if (mode === "INVOICE" && item?.invoiceItemId) {
            setSelectedInvoiceItemIds((current) =>
                current.filter((id) => id !== Number(item.invoiceItemId))
            );
        }

        setLines((current) => current.filter((_, i) => i !== index));
    }

    /* =====================================================
       SAVE RETURN
    ===================================================== */

    async function saveReturn() {
        if (saving) return;

        if (editingId && !rights.update) {
            return setError("You do not have permission to edit returns.");
        }

        if (!editingId && !rights.create) {
            return setError("You do not have permission to create returns.");
        }

        if (!form.returnDate) return setError("Select a return date.");
        if (!lines.length) return setError("Select or add at least one return item.");

        if (!form.customerId) return setError("Select a customer.");
        if (!form.warehouseId) return setError("Select a warehouse.");

        if (mode === "INVOICE" && !selectedInvoiceId) {
            return setError("Select a sales invoice.");
        }

        if (mode === "INVOICE" && !selectedInvoiceItemIds.length) {
            return setError("Select at least one invoice item to return.");
        }

        const refundAmount =
            form.refundAmount === ""
                ? total
                : num(form.refundAmount);

        if (refundAmount < 0 || refundAmount > total) {
            return setError("Refund amount must be between zero and the return total.");
        }

        for (let index = 0; index < lines.length; index++) {
            const item = lines[index];

            if (!Number(item.productId)) {
                return setError(`Select a product for line ${index + 1}.`);
            }

            if (num(item.quantity) <= 0) {
                return setError(`Quantity must be greater than zero on line ${index + 1}.`);
            }

            if (
                num(item.unitPrice) < 0 ||
                num(item.discount) < 0 ||
                num(item.tax) < 0
            ) {
                return setError(`Invalid price, discount or tax on line ${index + 1}.`);
            }

            if (num(item.discount) > num(item.quantity) * num(item.unitPrice)) {
                return setError(`Discount exceeds line amount on line ${index + 1}.`);
            }

            if (mode === "INVOICE") {
                const original = invoiceItems.find(
                    (invoiceItem) =>
                        invoiceItemIdOf(invoiceItem) === Number(item.invoiceItemId)
                );

                if (!original) {
                    return setError(`Original invoice item not found for line ${index + 1}.`);
                }

                if (num(item.quantity) > num(original.quantity)) {
                    return setError(
                        `Return quantity cannot exceed the original invoice quantity for ${productNameOf(original)}.`
                    );
                }
            }
        }

        const payload = {
            invoiceId: mode === "INVOICE" ? Number(selectedInvoiceId) : null,
            customerId: Number(form.customerId) || null,
            warehouseId: Number(form.warehouseId) || null,
            returnDate: form.returnDate,
            refundMethod: form.refundMethod,
            refundAmount,
            notes: form.notes,
            items: lines.map((item) => ({
                invoiceItemId: item.invoiceItemId
                    ? Number(item.invoiceItemId)
                    : null,
                productId: Number(item.productId),
                subProductId: Number(item.subProductId) || null,
                description: item.description || "",
                quantity: num(item.quantity),
                unitPrice: num(item.unitPrice),
                discount: num(item.discount),
                tax: num(item.tax),
            })),
        };

        setSaving(true);
        setError("");
        setMessage("");

        try {
            const url = editingId
                ? `/api/sales-returns/${editingId}`
                : "/api/sales-returns";

            const response = await fetch(url, {
                method: editingId ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data = await readApiResponse(response);

            if (data.success === false) {
                throw new Error(data.message || data.error || "Unable to save sales return.");
            }

            setMessage(data.message || "Sales return saved successfully.");

            await loadHistory();

            resetForm();
            setScreen("history");
        } catch (err) {
            console.error("Sales Return Save Error:", err);
            setError(err.message || "Unable to save sales return.");
        } finally {
            setSaving(false);
        }
    }

    /* =====================================================
       VIEW / EDIT
    ===================================================== */

    async function openReturn(id, readOnly = false) {
        setError("");
        setMessage("");

        try {
            const response = await fetch(`/api/sales-returns/${id}`, {
                method: "GET",
                cache: "no-store",
                headers: { Accept: "application/json" },
            });

            const data = await readApiResponse(response);

            if (data.success === false) {
                throw new Error(data.message || data.error || "Unable to open sales return.");
            }

            const header = data.salesReturn ?? data.return ?? data.data;

            if (!header) {
                throw new Error("Sales return details were not returned by the API.");
            }

            const itemRows = rowsFrom(data, ["items"]);
            const invoiceMode = Boolean(header.invoice_id);

            setSelectedReturn(header);
            setEditingId(readOnly ? null : Number(header.return_id));
            setMode(invoiceMode ? "INVOICE" : "MANUAL");
            setSelectedInvoiceId(header.invoice_id ? String(header.invoice_id) : "");

            setInvoiceInfo(
                invoiceMode
                    ? { invoice_number: header.invoice_number }
                    : null
            );

            setInvoiceItems([]);
            setSelectedInvoiceItemIds(
                itemRows
                    .map((item) => Number(item.invoice_item_id))
                    .filter(Boolean)
            );

            setForm({
                returnDate: String(header.return_date || today()).slice(0, 10),
                customerId: String(header.customer_id || ""),
                warehouseId: String(header.warehouse_id || ""),
                refundMethod: header.refund_method || "CUSTOMER_CREDIT",
                refundAmount:
                    Number(header.refund_amount || 0) === 0
                        ? ""
                        : String(header.refund_amount),
                notes: header.notes || "",
            });

            setLines(
                itemRows.map((item) => ({
                    invoiceItemId: item.invoice_item_id
                        ? Number(item.invoice_item_id)
                        : null,
                    productId: String(item.product_id || ""),
                    subProductId: item.sub_product_id
                        ? String(item.sub_product_id)
                        : "",
                    description: item.description || "",
                    quantity: String(item.quantity ?? 1),
                    unitPrice: String(item.unit_price ?? 0),
                    discount: String(item.discount ?? 0),
                    tax: String(item.tax ?? 0),
                }))
            );

            // Load original invoice items when editing/viewing an invoice return.
            if (invoiceMode) {
                try {
                    const invoiceResponse = await fetch(
                        `/api/sales-invoices/${header.invoice_id}`,
                        {
                            method: "GET",
                            cache: "no-store",
                            headers: { Accept: "application/json" },
                        }
                    );

                    const invoiceData = await readApiResponse(invoiceResponse);
                    const detail =
                        invoiceData.invoice ??
                        invoiceData.salesInvoice ??
                        invoiceData;

                    const originalItems =
                        rowsFrom(invoiceData, [
                            "items",
                            "invoiceItems",
                            "salesInvoiceItems",
                        ]).length
                            ? rowsFrom(invoiceData, [
                                "items",
                                "invoiceItems",
                                "salesInvoiceItems",
                            ])
                            : rowsFrom(detail, [
                                "items",
                                "invoiceItems",
                                "salesInvoiceItems",
                            ]);

                    setInvoiceInfo(detail);
                    setInvoiceItems(originalItems);
                } catch (invoiceError) {
                    console.error("Original invoice loading error:", invoiceError);
                }
            }

            setScreen(readOnly ? "view" : "form");
        } catch (err) {
            setError(err.message || "Unable to open sales return.");
        }
    }

    /* =====================================================
       DELETE
    ===================================================== */

    async function deleteReturn(item) {
        if (!rights.delete) {
            return setError("You do not have permission to delete returns.");
        }

        if (item.status !== "DRAFT") {
            return setError("Only DRAFT returns can be deleted.");
        }

        if (!window.confirm(`Delete ${item.return_number}? This cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/sales-returns/${item.return_id}`, {
                method: "DELETE",
                headers: { Accept: "application/json" },
            });

            const data = await readApiResponse(response);

            if (data.success === false) {
                throw new Error(data.message || data.error || "Unable to delete sales return.");
            }

            setMessage(data.message || "Sales return deleted successfully.");
            await loadHistory();
        } catch (err) {
            setError(err.message || "Unable to delete sales return.");
        }
    }

    /* =====================================================
       PRINT
    ===================================================== */

    function printReturn(header, itemRows) {
        const customer = customers.find(
            (item) => Number(item.customer_id ?? item.id) === Number(header.customer_id)
        );

        const warehouse = warehouses.find(
            (item) => Number(item.warehouse_id ?? item.id) === Number(header.warehouse_id)
        );

        const bodyRows = itemRows.map((item, index) => {
            const product = products.find(
                (p) => productIdOf(p) === Number(item.product_id)
            );

            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>${escapeHtml(item.description || productNameOf(product || {}))}</td>
                    <td>${num(item.quantity)}</td>
                    <td>${money(item.unit_price)}</td>
                    <td>${money(item.discount)}</td>
                    <td>${money(item.tax)}</td>
                    <td>${money(item.line_total)}</td>
                </tr>
            `;
        }).join("");

        const html = `<!doctype html>
<html>
<head>
    <title>Sales Return ${escapeHtml(header.return_number)}</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 32px; color: #172033; }
        h1 { margin: 0 0 6px; font-size: 25px; }
        .muted { color: #667085; font-size: 12px; }
        .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 25px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #d0d5dd; padding: 9px; text-align: left; font-size: 12px; }
        th { background: #f2f4f7; }
        .totals { margin: 20px 0 0 auto; width: 280px; }
        .totals div { display: flex; justify-content: space-between; padding: 5px; }
        @media print { button { display: none; } }
    </style>
</head>
<body>
    <h1>SALES RETURN</h1>
    <div class="muted">Golden Lake ERP</div>
    <div class="meta">
        <div><b>Return Number:</b> ${escapeHtml(header.return_number)}</div>
        <div><b>Return Date:</b> ${escapeHtml(String(header.return_date || "").slice(0, 10))}</div>
        <div><b>Customer:</b> ${escapeHtml(customer?.customer_name || customer?.name || header.customer_id)}</div>
        <div><b>Warehouse:</b> ${escapeHtml(warehouse?.warehouse_name || warehouse?.name || header.warehouse_id)}</div>
        <div><b>Invoice:</b> ${escapeHtml(header.invoice_number || "Manual Return")}</div>
        <div><b>Status:</b> ${escapeHtml(header.status)}</div>
    </div>
    <table>
        <thead>
            <tr>
                <th>#</th><th>Item</th><th>Qty</th>
                <th>Rate</th><th>Discount</th><th>Tax</th><th>Total</th>
            </tr>
        </thead>
        <tbody>${bodyRows}</tbody>
    </table>
    <div class="totals">
        <div><span>Subtotal</span><b>${money(header.subtotal)}</b></div>
        <div><span>Discount</span><b>${money(header.discount)}</b></div>
        <div><span>Tax</span><b>${money(header.tax)}</b></div>
        <div><span>Total</span><b>${money(header.total_amount)}</b></div>
        <div><span>Refund Method</span><b>${escapeHtml(header.refund_method)}</b></div>
        <div><span>Refund Amount</span><b>${money(header.refund_amount)}</b></div>
    </div>
    <p><b>Notes:</b> ${escapeHtml(header.notes || "")}</p>
    <script>window.onload = () => window.print();</script>
</body>
</html>`;

        const printWindow = window.open("", "_blank", "width=1000,height=750");

        if (!printWindow) {
            setError("Allow pop-ups to print this return.");
            return;
        }

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
    }

    async function printExisting(id) {
        try {
            const response = await fetch(`/api/sales-returns/${id}`, {
                method: "GET",
                cache: "no-store",
                headers: { Accept: "application/json" },
            });

            const data = await readApiResponse(response);

            if (data.success === false) {
                throw new Error(data.message || data.error || "Unable to load return.");
            }

            const header = data.salesReturn ?? data.return ?? data.data;
            const itemRows = rowsFrom(data, ["items"]);

            if (!header) {
                throw new Error("Sales return details were not returned.");
            }

            printReturn(header, itemRows);
        } catch (err) {
            setError(err.message || "Unable to print sales return.");
        }
    }

    /* =====================================================
       APPROVAL
    ===================================================== */

    function startApproval(item) {
        if (!rights.update) {
            return setError("You do not have permission to approve sales returns.");
        }

        if (item.status !== "DRAFT") {
            return setError("Only DRAFT returns can be approved.");
        }

        setError("");
        setMessage("");
        setApprovalAccountId("");
        setApprovalTarget(item);
    }

    async function submitApproval(item, refundAccountId) {
        if (approving) return;

        setApproving(true);
        setError("");
        setMessage("");

        try {
            const response = await fetch(
                `/api/sales-returns/${item.return_id}/approve`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify({
                        refundAccountId: refundAccountId
                            ? Number(refundAccountId)
                            : null,
                    }),
                }
            );

            const data = await readApiResponse(response);

            if (data.success === false) {
                throw new Error(data.error || data.message || "Unable to approve sales return.");
            }

            setMessage(data.message || "Sales return approved successfully.");
            setApprovalTarget(null);
            setApprovalAccountId("");

            await loadHistory();
        } catch (err) {
            setError(err.message || "Unable to approve sales return.");
        } finally {
            setApproving(false);
        }
    }

    function confirmApproval() {
        if (!approvalTarget) return;

        const isCashOrBank =
            approvalTarget.refund_method === "CASH" ||
            approvalTarget.refund_method === "BANK";

        if (
            isCashOrBank &&
            num(approvalTarget.refund_amount) > 0 &&
            !approvalAccountId
        ) {
            setError("Select a cash/bank account to continue.");
            return;
        }

        if (!window.confirm(
            `Approve ${approvalTarget.return_number}?\n\nThis will update stock and post accounting entries.`
        )) {
            return;
        }

        submitApproval(approvalTarget, approvalAccountId || null);
    }

    /* =====================================================
       LOADING / PERMISSION
    ===================================================== */

    if (!permissionsLoaded || (canView && loading)) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        Loading Sales Returns...
                    </p>
                </div>
            </div>
        );
    }

    if (!canView) {
        return (
            <div className="m-6 rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900 dark:bg-red-950/40">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400">
                    <Icon name="close" className="h-6 w-6" />
                </div>

                <h2 className="font-bold text-red-800 dark:text-red-300">
                    Access Restricted
                </h2>

                <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                    You do not have permission to view Sales Returns.
                </p>
            </div>
        );
    }

    const selectedInvoice = invoices.find(
        (item) => String(item.invoice_id ?? item.id) === String(selectedInvoiceId)
    );

    const visibleInvoices = invoices.filter((invoice) =>
        String(invoice.invoice_number || invoice.invoice_id || "")
            .toLowerCase()
            .includes(invoiceSearch.toLowerCase())
    );

    /* =====================================================
       MAIN PAGE
    ===================================================== */

    return (
        <div className="sales-returns-page erp-page min-h-screen">
            <div className="mx-auto max-w-[1600px] space-y-6">

                {/* HEADER */}

                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-indigo-800 p-6 text-white shadow-xl shadow-indigo-950/10 sm:p-8">
                    <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-indigo-400/10 blur-2xl" />
                    <div className="absolute -bottom-28 right-48 h-64 w-64 rounded-full bg-blue-400/10 blur-2xl" />

                    <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                        <div>
                            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">
                                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                Sales Management
                            </div>

                            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                                Sales Returns
                            </h1>

                            <p className="mt-2 max-w-xl text-sm leading-6 text-indigo-100/80">
                                Manage customer returns, review transactions, and process refunds with complete inventory and accounting control.
                            </p>
                        </div>

                        {screen === "history" ? (
                            <div className="flex flex-wrap gap-3">
                                {rights.create && (
    <button
        onClick={() => startNew("MANUAL")}
        className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-indigo-900 shadow-lg transition hover:bg-indigo-50"
    >
        <Icon name="plus" />
        Manual Return
    </button>
)}

                                {rights.create && (
    <button
        onClick={() => startNew("INVOICE")}
        className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
    >
        <Icon name="invoice" />
        From Invoice
    </button>
)}
                            </div>
                        ) : (
                            <button
                                onClick={() => {
                                    resetForm();
                                    setScreen("history");
                                }}
                                className="inline-flex items-center gap-2 self-start rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
                            >
                                <Icon name="arrow" className="h-4 w-4 rotate-180" />
                                Back to History
                            </button>
                        )}
                    </div>
                </div>

                {/* ALERTS */}

                {error && (
                    <div className="flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-700 shadow-sm dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                        <div className="flex items-start gap-2">
                            <Icon name="close" className="mt-0.5 h-4 w-4 shrink-0" />
                            <span className="whitespace-pre-wrap break-words">{error}</span>
                        </div>
                        <button onClick={() => setError("")} className="font-bold">×</button>
                    </div>
                )}

                {message && (
                    <div className="flex items-start justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm text-emerald-800 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <div className="flex items-start gap-2">
                            <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{message}</span>
                        </div>
                        <button onClick={() => setMessage("")} className="font-bold">×</button>
                    </div>
                )}

                {/* HISTORY DASHBOARD */}

                {screen === "history" && (
                    <>
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                                <div className="flex items-center justify-between">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                                        <Icon name="return" className="h-6 w-6" />
                                    </div>
                                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">All records</span>
                                </div>
                                <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{metrics.total}</p>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Total sales returns</p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                                <div className="flex items-center justify-between">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300">
                                        <Icon name="file" className="h-6 w-6" />
                                    </div>
                                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pending</span>
                                </div>
                                <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{metrics.drafts}</p>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Draft returns</p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                                <div className="flex items-center justify-between">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
                                        <Icon name="check" className="h-6 w-6" />
                                    </div>
                                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Completed</span>
                                </div>
                                <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{metrics.approved}</p>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Approved returns</p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                                <div className="flex items-center justify-between">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
                                        <Icon name="money" className="h-6 w-6" />
                                    </div>
                                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">PKR</span>
                                </div>
                                <p className="mt-4 break-all text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{money(metrics.value)}</p>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Total return value</p>
                            </div>
                        </div>

                        {/* HISTORY TABLE */}

                        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between dark:border-slate-800">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Return Register</h2>
                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                        Search, review, approve and manage return transactions.
                                    </p>
                                </div>

                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <div className="relative">
                                        <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <input
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Search returns..."
                                            className={`${inputClass} pl-9 sm:w-64`}
                                        />
                                    </div>

                                    <div className="relative">
                                        <Icon name="filter" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <select
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value)}
                                            className={`${inputClass} appearance-none pl-9 pr-8 sm:w-44`}
                                        >
                                            <option value="ALL">All Statuses</option>
                                            <option value="DRAFT">Draft</option>
                                            <option value="APPROVED">Approved</option>
                                            <option value="REJECTED">Rejected</option>
                                            <option value="CANCELLED">Cancelled</option>
                                        </select>
                                    </div>

                                    <button
                                        onClick={() => loadHistory().catch((err) => setError(err.message))}
                                        className={secondaryButton}
                                    >
                                        <Icon name="refresh" className="h-4 w-4" />
                                        Refresh
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[1120px] text-left text-sm">
                                    <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                                        <tr>
                                            <th className="px-5 py-4">Return Details</th>
                                            <th className="px-4 py-4">Date</th>
                                            <th className="px-4 py-4">Invoice</th>
                                            <th className="px-4 py-4">Customer</th>
                                            <th className="px-4 py-4">Warehouse</th>
                                            <th className="px-4 py-4 text-right">Total</th>
                                            <th className="px-4 py-4">Refund</th>
                                            <th className="px-4 py-4">Status</th>
                                            <th className="px-5 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {filteredReturns.map((item) => (
                                            <tr key={item.return_id} className="transition hover:bg-indigo-50/30 dark:hover:bg-slate-800/60">
                                                <td className="px-5 py-4">
                                                    <p className="font-bold text-indigo-700 dark:text-indigo-300">{item.return_number}</p>
                                                    <p className="mt-0.5 text-xs text-slate-400">ID: {item.return_id}</p>
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-4 text-slate-600 dark:text-slate-300">
                                                    {String(item.return_date || "").slice(0, 10)}
                                                </td>

                                                <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                                                    {item.invoice_number || "Manual"}
                                                </td>

                                                <td className="px-4 py-4 font-medium text-slate-700 dark:text-slate-200">
                                                    {customerLabel(item.customer_id)}
                                                </td>

                                                <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                                                    {warehouseLabel(item.warehouse_id)}
                                                </td>

                                                <td className="px-4 py-4 text-right font-bold tabular-nums text-slate-900 dark:text-white">
                                                    {money(item.total_amount)}
                                                </td>

                                                <td className="px-4 py-4">
                                                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                                        {item.refund_method || "—"}
                                                    </span>
                                                </td>

                                                <td className="px-4 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold ${statusStyle(item.status)}`}>
                                                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                                        {item.status}
                                                    </span>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <div className="flex justify-end gap-1.5">
                                                        <button
                                                            title="View"
                                                            onClick={() => openReturn(item.return_id, true)}
                                                            className="rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950 dark:hover:text-blue-300"
                                                        >
                                                            <Icon name="eye" className="h-4 w-4" />
                                                        </button>

                                                        <button
                                                            title="Print"
                                                            onClick={() => printExisting(item.return_id)}
                                                            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white"
                                                        >
                                                            <Icon name="print" className="h-4 w-4" />
                                                        </button>

                                                        {item.status === "DRAFT" && rights.update && (
                                                            <>
                                                                <button
                                                                    title="Edit"
                                                                    onClick={() => openReturn(item.return_id, false)}
                                                                    className="rounded-lg p-2 text-indigo-600 transition hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950"
                                                                >
                                                                    <Icon name="edit" className="h-4 w-4" />
                                                                </button>

                                                                <button
                                                                    title="Approve"
                                                                    onClick={() => startApproval(item)}
                                                                    className="rounded-lg p-2 text-emerald-600 transition hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950"
                                                                >
                                                                    <Icon name="check" className="h-4 w-4" />
                                                                </button>
                                                            </>
                                                        )}

                                                        {item.status === "DRAFT" && rights.delete && (
                                                            <button
                                                                title="Delete"
                                                                onClick={() => deleteReturn(item)}
                                                                className="rounded-lg p-2 text-red-500 transition hover:bg-red-50 dark:hover:bg-red-950"
                                                            >
                                                                <Icon name="trash" className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}

                                        {!filteredReturns.length && (
                                            <tr>
                                                <td colSpan="9" className="px-5 py-20 text-center">
                                                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
                                                        <Icon name="return" className="h-7 w-7" />
                                                    </div>
                                                    <p className="mt-4 font-semibold text-slate-700 dark:text-slate-200">No sales returns found</p>
                                                    <p className="mt-1 text-sm text-slate-400">
                                                        Try changing your search or create a new return.
                                                    </p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
                                <span>
                                    Showing <b className="text-slate-700 dark:text-slate-200">{filteredReturns.length}</b> of <b className="text-slate-700 dark:text-slate-200">{returns.length}</b> records
                                </span>
                                <span>Golden Lake ERP · Sales Management</span>
                            </div>
                        </section>
                    </>
                )}

                {/* INVOICE PICKER */}

                {screen === "invoice-picker" && (
                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white p-6 dark:border-slate-800 dark:from-slate-800 dark:to-slate-900">
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                    <Icon name="invoice" className="h-6 w-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Select Sales Invoice</h2>
                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                        Select the original invoice to load its items into the return.
                                    </p>
                                </div>
                            </div>

                            <div className="relative mt-5 max-w-lg">
                                <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    value={invoiceSearch}
                                    onChange={(e) => setInvoiceSearch(e.target.value)}
                                    placeholder="Search invoice number..."
                                    className={`${inputClass} pl-10`}
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[750px] text-left text-sm">
                                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                                    <tr>
                                        <th className="px-6 py-4">Invoice</th>
                                        <th className="px-4 py-4">Date</th>
                                        <th className="px-4 py-4">Customer</th>
                                        <th className="px-4 py-4 text-right">Invoice Total</th>
                                        <th className="px-6 py-4 text-right">Action</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {visibleInvoices.map((invoice) => (
                                        <tr key={invoice.invoice_id ?? invoice.id} className="hover:bg-indigo-50/30 dark:hover:bg-slate-800/60">
                                            <td className="px-6 py-4 font-bold text-indigo-700 dark:text-indigo-300">
                                                {invoice.invoice_number || `INV-${invoice.invoice_id}`}
                                            </td>
                                            <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                                                {String(invoice.invoice_date || "").slice(0, 10)}
                                            </td>
                                            <td className="px-4 py-4 font-medium text-slate-700 dark:text-slate-200">
                                                {customerLabel(invoice.customer_id)}
                                            </td>
                                            <td className="px-4 py-4 text-right font-bold text-slate-900 dark:text-white">
                                                {money(invoice.total_amount)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    disabled={loadingInvoice}
                                                    onClick={() => chooseInvoice(invoice)}
                                                    className={primaryButton}
                                                >
                                                    {loadingInvoice ? "Loading..." : "Select Invoice"}
                                                    <Icon name="arrow" className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}

                                    {!visibleInvoices.length && (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-16 text-center text-slate-500 dark:text-slate-400">
                                                No matching sales invoices found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {/* FORM / VIEW */}

                {(screen === "form" || screen === "view") && (
                    <div className="space-y-5">

                        {/* DOCUMENT HEADER */}

                        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex flex-col justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50/80 to-white p-5 sm:flex-row sm:items-center dark:border-slate-800 dark:from-slate-800 dark:to-slate-900">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                        <Icon name="return" className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                            {screen === "view"
                                                ? "Sales Return Details"
                                                : editingId
                                                    ? "Edit Sales Return"
                                                    : "Create Sales Return"}
                                        </h2>
                                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                            {mode === "INVOICE" ? "Created from Sales Invoice" : "Manual return entry"}
                                            {selectedReturn?.return_number ? ` · ${selectedReturn.return_number}` : ""}
                                        </p>
                                    </div>
                                </div>

                                <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3.5 py-2 text-xs font-bold ${statusStyle(selectedReturn?.status || "DRAFT")}`}>
                                    <span className="h-2 w-2 rounded-full bg-current" />
                                    {selectedReturn?.status || "DRAFT"}
                                </span>
                            </div>

                            <div className="space-y-5 p-5">
                                {mode === "INVOICE" && (
                                    <div className="flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-200">
                                        <Icon name="invoice" className="h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-300" />
                                        <div>
                                            <p className="font-bold">Original Invoice</p>
                                            <p className="mt-0.5 text-indigo-700 dark:text-indigo-300">
                                                {invoiceInfo?.invoice_number || selectedInvoice?.invoice_number || `#${selectedInvoiceId}`}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                                    <label>
                                        <span className={labelClass}>Return Date *</span>
                                        <div className="relative">
                                            <Icon name="calendar" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="date"
                                                value={form.returnDate}
                                                disabled={screen === "view"}
                                                onChange={(e) => setForm({ ...form, returnDate: e.target.value })}
                                                className={`${inputClass} pl-10`}
                                            />
                                        </div>
                                    </label>

                                    <label>
                                        <span className={labelClass}>Customer *</span>
                                        <div className="relative">
                                            <Icon name="user" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                            <select
                                                value={form.customerId}
                                                disabled={screen === "view" || mode === "INVOICE"}
                                                onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                                                className={`${inputClass} pl-10`}
                                            >
                                                <option value="">Select Customer</option>
                                                {customers.map((item) => (
                                                    <option key={item.customer_id ?? item.id} value={item.customer_id ?? item.id}>
                                                        {item.customer_name ?? item.name ?? `Customer ${item.customer_id ?? item.id}`}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </label>

                                    <label>
                                        <span className={labelClass}>Warehouse *</span>
                                        <div className="relative">
                                            <Icon name="warehouse" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                            <select
                                                value={form.warehouseId}
                                                disabled={screen === "view" || mode === "INVOICE"}
                                                onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}
                                                className={`${inputClass} pl-10`}
                                            >
                                                <option value="">Select Warehouse</option>
                                                {warehouses.map((item) => (
                                                    <option key={item.warehouse_id ?? item.id} value={item.warehouse_id ?? item.id}>
                                                        {item.warehouse_name ?? item.name ?? `Warehouse ${item.warehouse_id ?? item.id}`}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </label>

                                    <label>
                                        <span className={labelClass}>Refund Method</span>
                                        <select
                                            value={form.refundMethod}
                                            disabled={screen === "view"}
                                            onChange={(e) => setForm({ ...form, refundMethod: e.target.value })}
                                            className={inputClass}
                                        >
                                            <option value="CUSTOMER_CREDIT">Customer Credit</option>
                                            <option value="CASH">Cash</option>
                                            <option value="BANK">Bank</option>
                                        </select>
                                    </label>

                                    <label>
                                        <span className={labelClass}>Refund Amount</span>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">PKR</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                value={form.refundAmount}
                                                disabled={screen === "view"}
                                                onChange={(e) => setForm({ ...form, refundAmount: e.target.value })}
                                                className={`${inputClass} pl-12`}
                                            />
                                        </div>
                                    </label>

                                    <label className="md:col-span-2 xl:col-span-3">
                                        <span className={labelClass}>Internal Notes</span>
                                        <textarea
                                            rows="3"
                                            value={form.notes}
                                            disabled={screen === "view"}
                                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                            className={inputClass}
                                            placeholder="Enter reason for return, item condition, or additional notes..."
                                        />
                                    </label>
                                </div>
                            </div>
                        </section>

                        {/* MANUAL ITEM ENTRY */}

                        {screen === "form" && mode === "MANUAL" && (
                            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                <div className="border-b border-slate-100 p-5 dark:border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                            <Icon name="plusCircle" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 dark:text-white">Add Return Item</h3>
                                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                                Enter product details and add the item to this return.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
                                    <label className="xl:col-span-2">
                                        <span className={labelClass}>Item / Product *</span>
                                        <select
                                            value={line.productId}
                                            onChange={(e) => setLine({ ...line, productId: e.target.value })}
                                            className={inputClass}
                                        >
                                            <option value="">Select Item</option>
                                            {products.map((item) => (
                                                <option key={productIdOf(item)} value={productIdOf(item)}>
                                                    {productNameOf(item)}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className="xl:col-span-2">
                                        <span className={labelClass}>Description</span>
                                        <input
                                            value={line.description}
                                            onChange={(e) => setLine({ ...line, description: e.target.value })}
                                            className={inputClass}
                                            placeholder="Item description..."
                                        />
                                    </label>

                                    <label>
                                        <span className={labelClass}>Quantity *</span>
                                        <input
                                            type="number"
                                            min="1"
                                            step="1"
                                            value={line.quantity}
                                            onChange={(e) => setLine({ ...line, quantity: e.target.value })}
                                            className={inputClass}
                                        />
                                    </label>

                                    <label>
                                        <span className={labelClass}>Unit Price</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            value={line.unitPrice}
                                            onChange={(e) => setLine({ ...line, unitPrice: e.target.value })}
                                            className={inputClass}
                                        />
                                    </label>

                                    <label>
                                        <span className={labelClass}>Discount</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            value={line.discount}
                                            onChange={(e) => setLine({ ...line, discount: e.target.value })}
                                            className={inputClass}
                                        />
                                    </label>

                                    <label>
                                        <span className={labelClass}>Tax</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            value={line.tax}
                                            onChange={(e) => setLine({ ...line, tax: e.target.value })}
                                            className={inputClass}
                                        />
                                    </label>

                                    <div className="flex items-end xl:col-span-4">
                                        <button onClick={addLine} className={primaryButton}>
                                            <Icon name="plus" className="h-4 w-4" />
                                            Add Item to Return
                                        </button>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* INVOICE ITEM SELECTION */}

                        {screen === "form" && mode === "INVOICE" && invoiceItems.length > 0 && (
                            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center dark:border-slate-800">
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white">
                                            Select Items to Return
                                        </h3>
                                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                            Select only the products the customer is returning. You do not need to return the entire invoice.
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                            {selectedInvoiceItemIds.length} of {invoiceItems.length} selected
                                        </span>

                                        <button
                                            type="button"
                                            onClick={selectAllInvoiceItems}
                                            className={secondaryButton}
                                        >
                                            Select All
                                        </button>

                                        <button
                                            type="button"
                                            onClick={deselectAllInvoiceItems}
                                            className={secondaryButton}
                                        >
                                            Clear Selection
                                        </button>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[850px] text-left text-sm">
                                        <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                                            <tr>
                                                <th className="px-5 py-4">Select</th>
                                                <th className="px-4 py-4">Product</th>
                                                <th className="px-4 py-4">Description</th>
                                                <th className="px-4 py-4 text-right">Invoice Qty</th>
                                                <th className="px-4 py-4 text-right">Unit Price</th>
                                                <th className="px-4 py-4 text-right">Discount</th>
                                                <th className="px-5 py-4 text-right">Tax</th>
                                            </tr>
                                        </thead>

                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {invoiceItems.map((item) => {
                                                const id = invoiceItemIdOf(item);
                                                const checked = selectedInvoiceItemIds.includes(id);

                                                return (
                                                    <tr
                                                        key={id}
                                                        className={`transition ${checked ? "bg-indigo-50/40 dark:bg-indigo-950/20" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}
                                                    >
                                                        <td className="px-5 py-4">
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                disabled={screen === "view"}
                                                                onChange={(e) => toggleInvoiceItem(item, e.target.checked)}
                                                                className="h-4 w-4 cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed"
                                                            />
                                                        </td>

                                                        <td className="px-4 py-4 font-semibold text-slate-800 dark:text-slate-200">
                                                            {productLabel(item.product_id)}
                                                        </td>

                                                        <td className="px-4 py-4 text-slate-500 dark:text-slate-400">
                                                            {item.description || "—"}
                                                        </td>

                                                        <td className="px-4 py-4 text-right font-medium text-slate-700 dark:text-slate-300">
                                                            {money(item.quantity)}
                                                        </td>

                                                        <td className="px-4 py-4 text-right text-slate-700 dark:text-slate-300">
                                                            {money(item.unit_price ?? item.unitPrice)}
                                                        </td>

                                                        <td className="px-4 py-4 text-right text-slate-700 dark:text-slate-300">
                                                            {money(item.discount)}
                                                        </td>

                                                        <td className="px-5 py-4 text-right text-slate-700 dark:text-slate-300">
                                                            {money(item.tax)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}

                        {/* TRANSACTION LINES */}

                        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center dark:border-slate-800">
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white">Return Items</h3>
                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                        {mode === "INVOICE"
                                            ? "Only selected invoice items are included in this return."
                                            : "Review all items added to this return."}
                                    </p>
                                </div>

                                <span className="w-fit rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                    {lines.length} item(s)
                                </span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[950px] text-left text-sm">
                                    <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                                        <tr>
                                            <th className="px-5 py-4">#</th>
                                            <th className="px-4 py-4">Item</th>
                                            <th className="px-4 py-4">Description</th>
                                            <th className="px-4 py-4 text-right">Quantity</th>
                                            <th className="px-4 py-4 text-right">Unit Price</th>
                                            <th className="px-4 py-4 text-right">Discount</th>
                                            <th className="px-4 py-4 text-right">Tax</th>
                                            <th className="px-5 py-4 text-right">Line Total</th>
                                            {screen === "form" && (
                                                <th className="px-4 py-4">Action</th>
                                            )}
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {lines.map((item, index) => {
                                            const lineTotal =
                                                num(item.quantity) * num(item.unitPrice) -
                                                num(item.discount) +
                                                num(item.tax);

                                            return (
                                                <tr
                                                    key={`${item.invoiceItemId || "manual"}-${index}`}
                                                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50"
                                                >
                                                    <td className="px-5 py-4 text-slate-400">
                                                        {String(index + 1).padStart(2, "0")}
                                                    </td>

                                                    <td className="px-4 py-4 font-semibold text-slate-800 dark:text-slate-200">
                                                        {productLabel(item.productId)}
                                                    </td>

                                                    <td className="px-4 py-4 text-slate-500 dark:text-slate-400">
                                                        {item.description || "—"}
                                                    </td>

                                                    <td className="px-4 py-4 text-right">
                                                        {screen === "form" ? (
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                step="1"
                                                                value={item.quantity}
                                                                onChange={(e) => setLines((old) =>
                                                                    old.map((x, i) =>
                                                                        i === index
                                                                            ? { ...x, quantity: e.target.value }
                                                                            : x
                                                                    )
                                                                )}
                                                                className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-right text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                                            />
                                                        ) : (
                                                            <span className="text-slate-700 dark:text-slate-300">{item.quantity}</span>
                                                        )}
                                                    </td>

                                                    <td className="px-4 py-4 text-right">
                                                        {screen === "form" ? (
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                step="1"
                                                                value={item.unitPrice}
                                                                onChange={(e) => setLines((old) =>
                                                                    old.map((x, i) =>
                                                                        i === index
                                                                            ? { ...x, unitPrice: e.target.value }
                                                                            : x
                                                                    )
                                                                )}
                                                                className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-right text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                                            />
                                                        ) : (
                                                            <span className="text-slate-700 dark:text-slate-300">{money(item.unitPrice)}</span>
                                                        )}
                                                    </td>

                                                    <td className="px-4 py-4 text-right">
                                                        {screen === "form" ? (
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                step="1"
                                                                value={item.discount}
                                                                onChange={(e) => setLines((old) =>
                                                                    old.map((x, i) =>
                                                                        i === index
                                                                            ? { ...x, discount: e.target.value }
                                                                            : x
                                                                    )
                                                                )}
                                                                className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-right text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                                            />
                                                        ) : (
                                                            <span className="text-slate-700 dark:text-slate-300">{money(item.discount)}</span>
                                                        )}
                                                    </td>

                                                    <td className="px-4 py-4 text-right">
                                                        {screen === "form" ? (
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                step="1"
                                                                value={item.tax}
                                                                onChange={(e) => setLines((old) =>
                                                                    old.map((x, i) =>
                                                                        i === index
                                                                            ? { ...x, tax: e.target.value }
                                                                            : x
                                                                    )
                                                                )}
                                                                className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-right text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                                            />
                                                        ) : (
                                                            <span className="text-slate-700 dark:text-slate-300">{money(item.tax)}</span>
                                                        )}
                                                    </td>

                                                    <td className="px-5 py-4 text-right font-bold tabular-nums text-slate-900 dark:text-white">
                                                        {money(lineTotal)}
                                                    </td>

                                                    {screen === "form" && (
                                                        <td className="px-4 py-4">
                                                            <button
                                                                onClick={() => removeLine(index)}
                                                                className="rounded-lg p-2 text-red-500 transition hover:bg-red-50 dark:hover:bg-red-950"
                                                                title="Remove item"
                                                            >
                                                                <Icon name="trash" className="h-4 w-4" />
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}

                                        {!lines.length && (
                                            <tr>
                                                <td colSpan={screen === "form" ? 9 : 8} className="px-5 py-16 text-center text-slate-400">
                                                    No return items selected or added yet.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* TOTALS */}

                            <div className="flex justify-end border-t border-slate-100 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-950/40">
                                <div className="w-full max-w-sm space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
                                        <span className="font-semibold text-slate-700 dark:text-slate-200">{money(subtotal)}</span>
                                    </div>

                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500 dark:text-slate-400">Discount</span>
                                        <span className="font-semibold text-slate-700 dark:text-slate-200">{money(totalDiscount)}</span>
                                    </div>

                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500 dark:text-slate-400">Tax</span>
                                        <span className="font-semibold text-slate-700 dark:text-slate-200">{money(totalTax)}</span>
                                    </div>

                                    <div className="flex items-center justify-between rounded-xl bg-indigo-950 px-5 py-4 text-white shadow-lg shadow-indigo-950/10">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-200">Return Total</p>
                                            <p className="mt-1 text-xs text-indigo-300">PKR</p>
                                        </div>
                                        <p className="text-2xl font-bold tabular-nums">{money(total)}</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* ACTIONS */}

                        <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row sm:items-center">
                            <p className="text-xs text-slate-400">
                                {screen === "view"
                                    ? "Read-only sales return record."
                                    : "Save this document as a draft before approval."}
                            </p>

                            <div className="flex flex-wrap justify-end gap-2">
                                {screen === "view" ? (
                                    <button
                                        onClick={() => printExisting(selectedReturn.return_id)}
                                        className={secondaryButton}
                                    >
                                        <Icon name="print" className="h-4 w-4" />
                                        Print Return
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => {
                                                resetForm();
                                                setScreen("history");
                                            }}
                                            className={secondaryButton}
                                        >
                                            Cancel
                                        </button>

                                        {((editingId && rights.update) || (!editingId && rights.create)) && (
    <button
        onClick={saveReturn}
        disabled={saving}
        className={primaryButton}
    >
        {saving
            ? "Saving..."
            : editingId
                ? "Update Return"
                : "Save as Draft"}
        {!saving && <Icon name="check" className="h-4 w-4" />}
    </button>
)}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* APPROVAL DIALOG */}

                {approvalTarget && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
                        <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
                            <div className="bg-gradient-to-r from-emerald-700 to-teal-600 p-6 text-white">
                                <div className="flex items-center justify-between">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                                        <Icon name="check" className="h-6 w-6" />
                                    </div>
                                    <button
                                        onClick={() => setApprovalTarget(null)}
                                        disabled={approving}
                                        className="rounded-lg p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
                                    >
                                        <Icon name="close" />
                                    </button>
                                </div>
                                <h3 className="mt-4 text-xl font-bold">Approve Sales Return</h3>
                                <p className="mt-1 text-sm text-emerald-100">
                                    Review the refund details before posting.
                                </p>
                            </div>

                            <div className="space-y-4 p-6">
                                <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500 dark:text-slate-400">Return Number</span>
                                        <b className="text-slate-800 dark:text-white">{approvalTarget.return_number}</b>
                                    </div>
                                    <div className="mt-3 flex justify-between text-sm">
                                        <span className="text-slate-500 dark:text-slate-400">Refund Method</span>
                                        <b className="text-slate-800 dark:text-white">{approvalTarget.refund_method}</b>
                                    </div>
                                    <div className="mt-3 flex justify-between text-sm">
                                        <span className="text-slate-500 dark:text-slate-400">Refund Amount</span>
                                        <b className="text-slate-900 dark:text-white">PKR {money(approvalTarget.refund_amount)}</b>
                                    </div>
                                </div>

                                {(approvalTarget.refund_method === "CASH" || approvalTarget.refund_method === "BANK") && (
                                    <label className="block">
                                        <span className={labelClass}>
                                            Cash / Bank Account {num(approvalTarget.refund_amount) > 0 ? "*" : ""}
                                        </span>
                                        <select
                                            value={approvalAccountId}
                                            onChange={(e) => setApprovalAccountId(e.target.value)}
                                            className={inputClass}
                                        >
                                            <option value="">Select Account</option>
                                            {refundAccounts.map((account) => (
                                                <option key={account.account_id} value={account.account_id}>
                                                    {account.account_code} - {account.account_name}
                                                </option>
                                            ))}
                                        </select>

                                        {!refundAccounts.length && (
                                            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                                                No active cash/bank accounts are available.
                                            </p>
                                        )}
                                    </label>
                                )}

                                {approvalTarget.refund_method === "CUSTOMER_CREDIT" && (
                                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
                                        Customer Credit is selected. The approval API must post the credit against the customer&apos;s Accounts Receivable balance and update the customer ledger.
                                    </div>
                                )}

                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                                    Approval will update inventory quantities and create the accounting journal. This action should only be performed after checking the returned items.
                                </div>

                                <div className="flex gap-2 pt-1">
                                    <button
                                        onClick={() => {
                                            setApprovalTarget(null);
                                            setApprovalAccountId("");
                                        }}
                                        disabled={approving}
                                        className={`${secondaryButton} flex-1`}
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        onClick={confirmApproval}
                                        disabled={
                                            approving ||
                                            (
                                                (approvalTarget.refund_method === "CASH" ||
                                                    approvalTarget.refund_method === "BANK") &&
                                                num(approvalTarget.refund_amount) > 0 &&
                                                !approvalAccountId
                                            )
                                        }
                                        className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {approving ? "Approving..." : "Confirm Approval"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* GLOBAL DARK THEME STYLES */}

            <style jsx global>{`
    html.dark .sales-returns-page,
    body.dark .sales-returns-page,
    .dark .sales-returns-page {
        background: #0b1220 !important;
        color: #e2e8f0 !important;
    }

    .dark .sales-returns-page .bg-white {
        background-color: #111c2e !important;
        color: #e2e8f0 !important;
    }

    .dark .sales-returns-page .bg-slate-50,
    .dark .sales-returns-page .bg-gray-50 {
        background-color: #0f172a !important;
    }

    .dark .sales-returns-page .text-slate-900,
    .dark .sales-returns-page .text-gray-900,
    .dark .sales-returns-page .text-slate-800 {
        color: #f1f5f9 !important;
    }

    .dark .sales-returns-page .text-slate-600,
    .dark .sales-returns-page .text-slate-500,
    .dark .sales-returns-page .text-gray-600 {
        color: #a7b5c8 !important;
    }

    .dark .sales-returns-page .border-slate-200,
    .dark .sales-returns-page .border-gray-200 {
        border-color: #334155 !important;
    }

    .dark .sales-returns-page input,
    .dark .sales-returns-page select,
    .dark .sales-returns-page textarea {
        background-color: #0f172a !important;
        color: #f1f5f9 !important;
        border-color: #475569 !important;
    }

    .dark .sales-returns-page input::placeholder,
    .dark .sales-returns-page textarea::placeholder {
        color: #94a3b8 !important;
    }

    .dark .sales-returns-page table th {
        background-color: #1e293b !important;
        color: #e2e8f0 !important;
    }

    .dark .sales-returns-page table td {
        color: #cbd5e1 !important;
        border-color: #334155 !important;
    }

    .dark .sales-returns-page tr:hover {
        background-color: #1e293b !important;
    }

    .dark .sales-returns-page .shadow,
    .dark .sales-returns-page .shadow-sm,
    .dark .sales-returns-page .shadow-lg {
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.25) !important;
    }
`}</style>
        </div>
    );
}
