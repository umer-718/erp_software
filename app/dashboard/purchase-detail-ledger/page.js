
"use client";

import {
    Fragment,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import Link from "next/link";
import {
    ArrowLeft,
    RefreshCw,
    Search,
    FileText,
    Wallet,
    TrendingUp,
    TrendingDown,
    CalendarDays,
    Building2,
    Download,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    Package,
    User,
    Receipt,
    CreditCard,
    Info,
} from "lucide-react";

const API_URL = "/api/purchase-detail-ledger";

function formatAmount(value) {
    return Number(value || 0).toLocaleString("en-PK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function formatDate(value) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).toUpperCase();
}

function formatDateTime(value) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function getToday() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function buildLedgerUrl({
    selectedSupplierId = "",
    selectedStartDate = "",
    selectedEndDate = "",
} = {}) {
    const params = new URLSearchParams();

    if (selectedSupplierId) {
        params.set("supplierId", selectedSupplierId);
    }

    if (selectedStartDate) {
        params.set("startDate", selectedStartDate);
    }

    if (selectedEndDate) {
        params.set("endDate", selectedEndDate);
    }

    return `${API_URL}?${params.toString()}`;
}

async function fetchLedgerData(filters = {}) {
    const response = await fetch(buildLedgerUrl(filters), {
        method: "GET",
        cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(
            data.message || "Unable to load Purchase Detail Ledger."
        );
    }

    return data;
}

function Detail({ label, value, className = "" }) {
    return (
        <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {label}
            </p>

            <p
                className={`mt-1 break-words text-sm font-semibold text-slate-800 ${className}`}
            >
                {value === null || value === undefined || value === ""
                    ? "-"
                    : String(value)}
            </p>
        </div>
    );
}

function SectionTitle({ icon: Icon, children }) {
    return (
        <div className="mb-4 flex items-center gap-2 border-b border-slate-200 pb-3">
            <Icon size={17} className="text-blue-600" />
            <h3 className="font-bold text-slate-800">{children}</h3>
        </div>
    );
}

function TransactionDetails({ row }) {
    const details = row.details || {};

    const payment = details.payment || {};
    const purchase = details.purchase || {};
    const supplier = details.supplier || {};
    const items = Array.isArray(details.items) ? details.items : [];

    const isPayment = row.transaction_type === "Supplier Payment";

    return (
        <div className="space-y-6 bg-slate-50 p-5">

            {/* Transaction information */}
            <section className="rounded-lg border border-slate-200 bg-white p-4">
                <SectionTitle icon={isPayment ? CreditCard : Receipt}>
                    {isPayment
                        ? "Payment Information"
                        : "Purchase Invoice Information"}
                </SectionTitle>

                {isPayment ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Detail
                            label="Payment Number"
                            value={payment.payment_number || row.reference}
                        />

                        <Detail
                            label="Payment ID"
                            value={payment.payment_id || row.transaction_id}
                        />

                        <Detail
                            label="Payment Date"
                            value={formatDate(
                                payment.payment_date || row.transaction_date
                            )}
                        />

                        <Detail
                            label="Payment Amount"
                            value={formatAmount(
                                payment.amount ?? row.debit
                            )}
                        />

                        <Detail
                            label="Payment Method"
                            value={payment.payment_method}
                        />

                        <Detail
                            label="Reference Number"
                            value={payment.reference_number}
                        />

                        <Detail
                            label="Linked Purchase ID"
                            value={purchase.purchase_id}
                        />

                        <Detail
                            label="Linked Purchase Number"
                            value={purchase.purchase_number}
                        />

                        <Detail
                            label="Created At"
                            value={formatDateTime(payment.created_at)}
                        />

                        <Detail
                            label="Payment Notes"
                            value={payment.notes}
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Detail
                            label="Invoice Number"
                            value={purchase.purchase_number || row.reference}
                        />

                        <Detail
                            label="Purchase ID"
                            value={purchase.purchase_id || row.purchase_id}
                        />

                        <Detail
                            label="Purchase Date"
                            value={formatDate(
                                purchase.purchase_date || row.transaction_date
                            )}
                        />

                        <Detail
                            label="Invoice Total"
                            value={formatAmount(
                                purchase.total_amount ?? row.credit
                            )}
                        />

                        <Detail
                            label="Subtotal"
                            value={formatAmount(purchase.subtotal)}
                        />

                        <Detail
                            label="Discount"
                            value={formatAmount(purchase.discount)}
                        />

                        <Detail
                            label="Tax"
                            value={formatAmount(purchase.tax)}
                        />

                        <Detail
                            label="Paid Amount"
                            value={formatAmount(purchase.paid_amount)}
                        />

                        <Detail
                            label="Remaining Balance"
                            value={formatAmount(purchase.balance_amount)}
                        />

                        <Detail
                            label="Status"
                            value={purchase.status}
                        />

                        <Detail
                            label="Document Status"
                            value={purchase.document_status}
                        />

                        <Detail
                            label="Warehouse ID"
                            value={purchase.warehouse_id}
                        />

                        <Detail
                            label="Source Type"
                            value={purchase.source_type}
                        />

                        <Detail
                            label="Item Receipt ID"
                            value={purchase.item_receipt_id}
                        />

                        <Detail
                            label="Approved At"
                            value={formatDateTime(purchase.approved_at)}
                        />

                        <Detail
                            label="Invoice Notes"
                            value={purchase.notes}
                        />

                        <Detail
                            label="Created At"
                            value={formatDateTime(purchase.created_at)}
                        />
                    </div>
                )}
            </section>

            {/* Supplier information */}
            <section className="rounded-lg border border-slate-200 bg-white p-4">
                <SectionTitle icon={User}>
                    Supplier Information
                </SectionTitle>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Detail
                        label="Supplier Name"
                        value={supplier.supplier_name}
                    />

                    <Detail
                        label="Supplier Code"
                        value={supplier.supplier_code}
                    />

                    <Detail
                        label="Supplier ID"
                        value={supplier.supplier_id || row.supplier_id}
                    />

                    <Detail
                        label="Phone"
                        value={supplier.phone}
                    />

                    <Detail
                        label="Email"
                        value={supplier.email}
                    />

                    <Detail
                        label="Address"
                        value={supplier.address}
                    />
                </div>
            </section>

            {/* Linked purchase items */}
            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <div className="p-4 pb-0">
                    <SectionTitle icon={Package}>
                        {isPayment
                            ? "Items of Linked Purchase Invoice"
                            : "Purchase Invoice Items"}
                    </SectionTitle>
                </div>

                {items.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[850px] text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
                                    <th className="border-y border-slate-200 px-4 py-3">
                                        #
                                    </th>

                                    <th className="border-y border-slate-200 px-4 py-3">
                                        Product ID
                                    </th>

                                    <th className="border-y border-slate-200 px-4 py-3">
                                        Description
                                    </th>

                                    <th className="border-y border-slate-200 px-4 py-3">
                                        UOM
                                    </th>

                                    <th className="border-y border-slate-200 px-4 py-3 text-right">
                                        Quantity
                                    </th>

                                    <th className="border-y border-slate-200 px-4 py-3 text-right">
                                        Unit Cost
                                    </th>

                                    <th className="border-y border-slate-200 px-4 py-3 text-right">
                                        Discount
                                    </th>

                                    <th className="border-y border-slate-200 px-4 py-3 text-right">
                                        Tax
                                    </th>

                                    <th className="border-y border-slate-200 px-4 py-3 text-right">
                                        Line Total
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {items.map((item, index) => (
                                    <tr
                                        key={
                                            item.purchase_item_id ||
                                            `${item.product_id}-${index}`
                                        }
                                        className="hover:bg-slate-50"
                                    >
                                        <td className="border-b border-slate-100 px-4 py-3">
                                            {index + 1}
                                        </td>

                                        <td className="border-b border-slate-100 px-4 py-3 font-medium text-slate-700">
                                            {item.product_id ?? "-"}
                                        </td>

                                        <td className="border-b border-slate-100 px-4 py-3">
                                            <div className="font-medium text-slate-800">
                                                {item.item_description || "Product"}
                                            </div>

                                            {item.item_receipt_item_id && (
                                                <div className="mt-1 text-xs text-slate-400">
                                                    Receipt Item ID:{" "}
                                                    {item.item_receipt_item_id}
                                                </div>
                                            )}
                                        </td>

                                        <td className="border-b border-slate-100 px-4 py-3">
                                            {item.uom || "-"}
                                        </td>

                                        <td className="border-b border-slate-100 px-4 py-3 text-right tabular-nums">
                                            {formatAmount(item.quantity)}
                                        </td>

                                        <td className="border-b border-slate-100 px-4 py-3 text-right tabular-nums">
                                            {formatAmount(item.unit_cost)}
                                        </td>

                                        <td className="border-b border-slate-100 px-4 py-3 text-right tabular-nums">
                                            {formatAmount(item.discount)}
                                        </td>

                                        <td className="border-b border-slate-100 px-4 py-3 text-right tabular-nums">
                                            {formatAmount(item.tax)}
                                        </td>

                                        <td className="border-b border-slate-100 px-4 py-3 text-right font-semibold tabular-nums text-slate-900">
                                            {formatAmount(item.line_total)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>

                            <tfoot>
                                <tr className="bg-slate-50 font-bold">
                                    <td
                                        colSpan={8}
                                        className="px-4 py-3 text-right"
                                    >
                                        Invoice Total
                                    </td>

                                    <td className="px-4 py-3 text-right">
                                        {formatAmount(purchase.total_amount)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                ) : (
                    <div className="px-4 py-8 text-center">
                        <Info
                            size={25}
                            className="mx-auto mb-2 text-slate-300"
                        />

                        <p className="text-sm font-medium text-slate-600">
                            No purchase item details are available for this transaction.
                        </p>
                    </div>
                )}
            </section>
        </div>
    );
}

export default function PurchaseDetailLedgerPage() {
    const [suppliers, setSuppliers] = useState([]);
    const [supplierId, setSupplierId] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState(getToday());

    const [supplier, setSupplier] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [summary, setSummary] = useState(null);
    const [openingBalance, setOpeningBalance] = useState(0);

    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState("");

    const [search, setSearch] = useState("");
    const [expandedTransaction, setExpandedTransaction] = useState(null);

    // Apply API data to page state.
    const applyLedgerData = useCallback((data) => {
        setSuppliers(data.suppliers || []);
        setSupplier(data.supplier || null);
        setTransactions(data.transactions || []);
        setSummary(data.summary || null);
        setOpeningBalance(Number(data.openingBalance || 0));
        setExpandedTransaction(null);
    }, []);

    // Initial loading: state updates happen after asynchronous API calls.
    useEffect(() => {
        let cancelled = false;

        async function initialLoad() {
            try {
                const data = await fetchLedgerData({
                    selectedSupplierId: "",
                    selectedStartDate: "",
                    selectedEndDate: getToday(),
                });

                if (cancelled) return;

                applyLedgerData(data);
            } catch (err) {
                if (cancelled) return;

                console.error(
                    "PURCHASE DETAIL LEDGER INITIAL LOAD ERROR:",
                    err
                );

                setError(
                    err.message ||
                    "Something went wrong while loading the ledger."
                );

                setSupplier(null);
                setTransactions([]);
                setSummary(null);
                setOpeningBalance(0);
            } finally {
                if (!cancelled) {
                    setInitialLoading(false);
                }
            }
        }

        initialLoad();

        return () => {
            cancelled = true;
        };
    }, [applyLedgerData]);

    // Manual search, refresh and reset requests.
    const loadLedger = useCallback(async ({
        selectedSupplierId = supplierId,
        selectedStartDate = startDate,
        selectedEndDate = endDate,
    } = {}) => {
        try {
            setLoading(true);
            setError("");

            const data = await fetchLedgerData({
                selectedSupplierId,
                selectedStartDate,
                selectedEndDate,
            });

            applyLedgerData(data);
        } catch (err) {
            console.error("PURCHASE DETAIL LEDGER PAGE ERROR:", err);

            setError(
                err.message ||
                "Something went wrong while loading the ledger."
            );

            setSupplier(null);
            setTransactions([]);
            setSummary(null);
            setOpeningBalance(0);
            setExpandedTransaction(null);
        } finally {
            setLoading(false);
        }
    }, [
        supplierId,
        startDate,
        endDate,
        applyLedgerData,
    ]);

    const filteredTransactions = useMemo(() => {
        const value = search.trim().toLowerCase();

        if (!value) return transactions;

        return transactions.filter((row) => {
            const details = row.details || {};
            const payment = details.payment || {};
            const purchase = details.purchase || {};
            const supplierDetails = details.supplier || {};
            const items = Array.isArray(details.items)
                ? details.items
                : [];

            return (
                String(row.reference || "").toLowerCase().includes(value) ||
                String(row.memo || "").toLowerCase().includes(value) ||
                String(row.transaction_type || "").toLowerCase().includes(value) ||
                String(payment.payment_method || "").toLowerCase().includes(value) ||
                String(payment.reference_number || "").toLowerCase().includes(value) ||
                String(purchase.purchase_number || "").toLowerCase().includes(value) ||
                String(supplierDetails.supplier_name || "").toLowerCase().includes(value) ||
                items.some((item) =>
                    String(item.item_description || "")
                        .toLowerCase()
                        .includes(value)
                )
            );
        });
    }, [transactions, search]);

    const handleSearch = (event) => {
        event.preventDefault();

        if (startDate && endDate && startDate > endDate) {
            setError("From Date cannot be later than To Date.");
            return;
        }

        loadLedger();
    };

    const handleReset = () => {
        const today = getToday();

        setSupplierId("");
        setStartDate("");
        setEndDate(today);
        setSearch("");
        setSupplier(null);
        setTransactions([]);
        setSummary(null);
        setOpeningBalance(0);
        setExpandedTransaction(null);

        // Explicit values avoid stale state from the current render.
        loadLedger({
            selectedSupplierId: "",
            selectedStartDate: "",
            selectedEndDate: today,
        });
    };

    const toggleTransaction = (row) => {
        const key = `${row.transaction_type}-${row.transaction_id}`;

        setExpandedTransaction((current) =>
            current === key ? null : key
        );
    };

    const exportCSV = () => {
        if (!supplier || transactions.length === 0) return;

        const rows = [
            [
                "Transaction Date",
                "Transaction Number",
                "Transaction Type",
                "Memo",
                "Debit",
                "Credit",
                "Running Total",
            ],
            [
                "",
                "",
                "Opening Balance",
                "",
                "",
                "",
                openingBalance.toFixed(2),
            ],
            ...transactions.map((row) => [
                formatDate(row.transaction_date),
                row.reference,
                row.transaction_type,
                row.memo,
                Number(row.debit || 0).toFixed(2),
                Number(row.credit || 0).toFixed(2),
                Number(row.balance || 0).toFixed(2),
            ]),
            [
                "",
                "",
                "Closing Balance",
                "",
                "",
                "",
                Number(summary?.closingBalance || 0).toFixed(2),
            ],
        ];

        const csv = rows
            .map((row) =>
                row
                    .map((cell) =>
                        `"${String(cell ?? "").replace(/"/g, '""')}"`
                    )
                    .join(",")
            )
            .join("\r\n");

        const blob = new Blob(
            ["\uFEFF" + csv],
            { type: "text/csv;charset=utf-8;" }
        );

        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");

        anchor.href = url;
        anchor.download = `purchase-detail-ledger-${supplier.supplier_code || supplier.supplier_id}.csv`;

        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();

        URL.revokeObjectURL(url);
    };

    if (initialLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex items-center gap-3 text-slate-600">
                    <RefreshCw className="animate-spin" size={20} />

                    <span className="font-medium">
                        Loading Purchase Detail Ledger...
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-6">
            <div className="mx-auto max-w-7xl space-y-6">

                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                        <Link
                            href="/dashboard"
                            className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                            title="Back to Dashboard"
                        >
                            <ArrowLeft size={19} />
                        </Link>

                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                                Purchase Detail Ledger
                            </h1>

                            <p className="mt-1 text-sm text-slate-500">
                                Supplier-wise purchase invoices, payments and running balances
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => loadLedger()}
                        disabled={loading}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                    >
                        <RefreshCw
                            size={16}
                            className={loading ? "animate-spin" : ""}
                        />
                        Refresh
                    </button>
                </div>

                {/* Filters */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center gap-2">
                        <Search size={18} className="text-blue-600" />

                        <h2 className="font-semibold text-slate-800">
                            Ledger Filters
                        </h2>
                    </div>

                    <form
                        onSubmit={handleSearch}
                        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
                    >
                        <div>
                            <label
                                htmlFor="startDate"
                                className="mb-2 block text-sm font-semibold text-slate-700"
                            >
                                From Date
                            </label>

                            <div className="relative">
                                <CalendarDays
                                    size={17}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                />

                                <input
                                    id="startDate"
                                    type="date"
                                    value={startDate}
                                    max={endDate || undefined}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                />
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="endDate"
                                className="mb-2 block text-sm font-semibold text-slate-700"
                            >
                                To Date
                            </label>

                            <div className="relative">
                                <CalendarDays
                                    size={17}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                />

                                <input
                                    id="endDate"
                                    type="date"
                                    value={endDate}
                                    min={startDate || undefined}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                />
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="supplierId"
                                className="mb-2 block text-sm font-semibold text-slate-700"
                            >
                                Vendors
                            </label>

                            <div className="relative">
                                <Building2
                                    size={17}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                />

                                <select
                                    id="supplierId"
                                    value={supplierId}
                                    onChange={(e) => setSupplierId(e.target.value)}
                                    className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                >
                                    <option value="">
                                        Select Vendor
                                    </option>

                                    {suppliers.map((item) => (
                                        <option
                                            key={item.supplier_id}
                                            value={item.supplier_id}
                                        >
                                            {item.supplier_code} - {item.supplier_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex items-end gap-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                <Search size={16} />
                                Search
                            </button>

                            <button
                                type="button"
                                onClick={handleReset}
                                disabled={loading}
                                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                            >
                                Reset
                            </button>
                        </div>
                    </form>

                    {suppliers.length === 0 && (
                        <p className="mt-3 text-sm text-amber-700">
                            No vendors with purchase records were found for your company.
                        </p>
                    )}
                </div>

                {/* Error */}
                {error && (
                    <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        <AlertCircle
                            size={19}
                            className="mt-0.5 shrink-0"
                        />

                        <span>{error}</span>
                    </div>
                )}

                {/* Ledger */}
                {supplier && (
                    <>
                        {/* Supplier information */}
                        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Supplier Details
                                    </p>

                                    <h2 className="mt-1 text-xl font-bold text-slate-900">
                                        {supplier.supplier_name}
                                    </h2>

                                    <p className="mt-1 text-sm text-slate-500">
                                        Vendor Code: {supplier.supplier_code}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={exportCSV}
                                    disabled={transactions.length === 0}
                                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <Download size={16} />
                                    Export CSV
                                </button>
                            </div>
                        </div>

                        {/* Summary cards */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-slate-500">
                                        Opening Balance
                                    </p>

                                    <Wallet
                                        size={19}
                                        className="text-slate-500"
                                    />
                                </div>

                                <p className="mt-3 text-xl font-bold text-slate-900">
                                    {formatAmount(openingBalance)}
                                </p>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-slate-500">
                                        Total Purchases
                                    </p>

                                    <TrendingUp
                                        size={19}
                                        className="text-blue-600"
                                    />
                                </div>

                                <p className="mt-3 text-xl font-bold text-blue-700">
                                    {formatAmount(summary?.totalPurchases)}
                                </p>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-slate-500">
                                        Total Payments
                                    </p>

                                    <TrendingDown
                                        size={19}
                                        className="text-emerald-600"
                                    />
                                </div>

                                <p className="mt-3 text-xl font-bold text-emerald-700">
                                    {formatAmount(summary?.totalPayments)}
                                </p>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-slate-500">
                                        Closing Balance
                                    </p>

                                    <Wallet
                                        size={19}
                                        className="text-purple-600"
                                    />
                                </div>

                                <p className="mt-3 text-xl font-bold text-purple-700">
                                    {formatAmount(summary?.closingBalance)}
                                </p>
                            </div>
                        </div>

                        {/* Transactions table */}
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h2 className="font-bold text-slate-900">
                                        Supplier Detail Ledger
                                    </h2>

                                    <p className="mt-1 text-xs text-slate-500">
                                        Select a transaction number to view its complete details below.
                                        Purchases increase payable; payments reduce payable.
                                    </p>
                                </div>

                                <div className="relative w-full sm:max-w-xs">
                                    <Search
                                        size={16}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                    />

                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search transaction..."
                                        className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[950px] border-collapse text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
                                            <th className="border-b border-slate-200 px-4 py-3">
                                                Transaction Date
                                            </th>

                                            <th className="border-b border-slate-200 px-4 py-3">
                                                Transaction Number
                                            </th>

                                            <th className="border-b border-slate-200 px-4 py-3">
                                                Memo
                                            </th>

                                            <th className="border-b border-slate-200 px-4 py-3 text-right">
                                                Debit
                                            </th>

                                            <th className="border-b border-slate-200 px-4 py-3 text-right">
                                                Credit
                                            </th>

                                            <th className="border-b border-slate-200 px-4 py-3 text-right">
                                                Running Total
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {/* Opening balance */}
                                        <tr className="bg-blue-50/60">
                                            <td className="border-b border-slate-100 px-4 py-3 font-medium text-slate-700">
                                                {startDate
                                                    ? formatDate(`${startDate}T00:00:00`)
                                                    : "-"}
                                            </td>

                                            <td className="border-b border-slate-100 px-4 py-3 text-slate-500">
                                                -
                                            </td>

                                            <td className="border-b border-slate-100 px-4 py-3 font-semibold text-slate-800">
                                                Opening Balance
                                            </td>

                                            <td className="border-b border-slate-100 px-4 py-3 text-right">
                                                -
                                            </td>

                                            <td className="border-b border-slate-100 px-4 py-3 text-right">
                                                -
                                            </td>

                                            <td className="border-b border-slate-100 px-4 py-3 text-right font-bold text-slate-900">
                                                {formatAmount(openingBalance)}
                                            </td>
                                        </tr>

                                        {filteredTransactions.map((row) => {
                                            const key = `${row.transaction_type}-${row.transaction_id}`;
                                            const isExpanded =
                                                expandedTransaction === key;

                                            return (
                                                <Fragment key={key}>
                                                    <tr
                                                        className={`transition-colors ${
                                                            isExpanded
                                                                ? "bg-blue-50"
                                                                : "hover:bg-slate-50"
                                                        }`}
                                                    >
                                                        <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3 text-slate-700">
                                                            {formatDate(row.transaction_date)}
                                                        </td>

                                                        <td className="border-b border-slate-100 px-4 py-3">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    toggleTransaction(row)
                                                                }
                                                                aria-expanded={isExpanded}
                                                                className="inline-flex items-center gap-2 text-left font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                                                            >
                                                                <FileText size={15} />

                                                                {row.reference || "-"}

                                                                {isExpanded ? (
                                                                    <ChevronUp size={15} />
                                                                ) : (
                                                                    <ChevronDown size={15} />
                                                                )}
                                                            </button>
                                                        </td>

                                                        <td className="border-b border-slate-100 px-4 py-3">
                                                            <div className="font-medium text-slate-800">
                                                                {row.memo || row.transaction_type}
                                                            </div>

                                                            <div className="mt-1 text-xs text-slate-400">
                                                                {row.transaction_type}
                                                            </div>
                                                        </td>

                                                        <td className="border-b border-slate-100 px-4 py-3 text-right tabular-nums text-emerald-700">
                                                            {Number(row.debit) > 0
                                                                ? formatAmount(row.debit)
                                                                : "-"}
                                                        </td>

                                                        <td className="border-b border-slate-100 px-4 py-3 text-right tabular-nums text-blue-700">
                                                            {Number(row.credit) > 0
                                                                ? formatAmount(row.credit)
                                                                : "-"}
                                                        </td>

                                                        <td className="border-b border-slate-100 px-4 py-3 text-right font-semibold tabular-nums text-slate-900">
                                                            {formatAmount(row.balance)}
                                                        </td>
                                                    </tr>

                                                    {isExpanded && (
                                                        <tr>
                                                            <td
                                                                colSpan={6}
                                                                className="border-b border-slate-200 p-0"
                                                            >
                                                                <TransactionDetails row={row} />
                                                            </td>
                                                        </tr>
                                                    )}
                                                </Fragment>
                                            );
                                        })}

                                        {filteredTransactions.length === 0 && (
                                            <tr>
                                                <td
                                                    colSpan={6}
                                                    className="px-4 py-12 text-center"
                                                >
                                                    <FileText
                                                        size={30}
                                                        className="mx-auto mb-3 text-slate-300"
                                                    />

                                                    <p className="font-semibold text-slate-700">
                                                        No transactions found
                                                    </p>

                                                    <p className="mt-1 text-xs text-slate-500">
                                                        No matching approved purchases or supplier payments were found.
                                                    </p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>

                                    <tfoot>
                                        <tr className="bg-slate-50 font-bold text-slate-900">
                                            <td
                                                colSpan={3}
                                                className="border-t border-slate-200 px-4 py-4"
                                            >
                                                Period Totals
                                            </td>

                                            <td className="border-t border-slate-200 px-4 py-4 text-right text-emerald-700">
                                                {formatAmount(summary?.totalPayments)}
                                            </td>

                                            <td className="border-t border-slate-200 px-4 py-4 text-right text-blue-700">
                                                {formatAmount(summary?.totalPurchases)}
                                            </td>

                                            <td className="border-t border-slate-200 px-4 py-4 text-right">
                                                {formatAmount(summary?.closingBalance)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                                <span>
                                    Showing {filteredTransactions.length} of{" "}
                                    {transactions.length} transactions
                                </span>

                                <span>
                                    All amounts are displayed in the supplier ledger&apos;s stored currency.
                                </span>
                            </div>
                        </div>
                    </>
                )}

                {/* No supplier selected */}
                {!supplier && !error && (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-16 text-center">
                        <Building2
                            size={38}
                            className="mx-auto mb-3 text-slate-300"
                        />

                        <h3 className="font-semibold text-slate-800">
                            Select a Vendor
                        </h3>

                        <p className="mt-2 text-sm text-slate-500">
                            Choose a vendor and click Search to view the Purchase Detail Ledger.
                        </p>
                    </div>
                )}

                {/* Loading indicator */}
                {loading && (
                    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xl">
                        <RefreshCw
                            size={16}
                            className="animate-spin"
                        />

                        Loading ledger...
                    </div>
                )}
            </div>
        </div>
    );
}
