
"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    RefreshCw,
    Search,
    Download,
    CalendarDays,
    Users,
    FileText,
    Wallet,
    TrendingUp,
    TrendingDown,
    AlertCircle,
    X,
    Filter,
    ChevronDown,
    ChevronUp,
    Package,
    User,
    Receipt,
    CreditCard,
    Info,
    Building2,
} from "lucide-react";

const API_URL = "/api/customer-detail-ledger";

// --------------------------------------------------
// Date helpers
// --------------------------------------------------

function todayDate() {
    const date = new Date();
    const offset = date.getTimezoneOffset();

    return new Date(date.getTime() - offset * 60000)
        .toISOString()
        .slice(0, 10);
}

function firstDayOfMonth() {
    const date = new Date();
    date.setDate(1);

    const offset = date.getTimezoneOffset();

    return new Date(date.getTime() - offset * 60000)
        .toISOString()
        .slice(0, 10);
}

// --------------------------------------------------
// Formatting helpers
// --------------------------------------------------

function formatCurrency(value) {
    return new Intl.NumberFormat("en-PK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number(value || 0));
}

function formatDate(value) {
    if (!value) return "-";

    const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
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

function escapeCSV(value) {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
}

function transactionLabel(type) {
    switch (type) {
        case "SALES_INVOICE":
            return "Sales Invoice";

        case "SALES_PAYMENT":
            return "Customer Payment";

        case "SALES_RETURN":
            return "Sales Return";

        case "JOURNAL":
            return "Journal Entry";

        default:
            return "Transaction";
    }
}

// --------------------------------------------------
// Reusable detail components
// --------------------------------------------------

function Detail({ label, value, currency = false }) {
    let displayValue = value;

    if (value === null || value === undefined || value === "") {
        displayValue = "-";
    } else if (currency) {
        displayValue = formatCurrency(value);
    }

    return (
        <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {label}
            </p>

            <p className="mt-1 break-words text-sm font-semibold text-slate-800">
                {String(displayValue)}
            </p>
        </div>
    );
}

function SectionTitle({ icon: Icon, children }) {
    return (
        <div className="mb-4 flex items-center gap-2 border-b border-slate-200 pb-3">
            <Icon size={17} className="text-blue-600" />

            <h3 className="font-bold text-slate-800">
                {children}
            </h3>
        </div>
    );
}

function StatusBadge({ value }) {
    if (!value) return <span className="text-slate-400">-</span>;

    const status = String(value).toUpperCase();

    const colors = {
        APPROVED: "bg-emerald-100 text-emerald-700",
        POSTED: "bg-emerald-100 text-emerald-700",
        PAID: "bg-emerald-100 text-emerald-700",
        PARTIAL: "bg-amber-100 text-amber-700",
        UNPAID: "bg-rose-100 text-rose-700",
        DRAFT: "bg-slate-100 text-slate-700",
        REJECTED: "bg-rose-100 text-rose-700",
        CANCELLED: "bg-slate-100 text-slate-700",
    };

    return (
        <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                colors[status] || "bg-blue-100 text-blue-700"
            }`}
        >
            {status.replaceAll("_", " ")}
        </span>
    );
}

// --------------------------------------------------
// Customer information
// --------------------------------------------------

function CustomerInformation({ customer }) {
    if (!customer || !customer.customer_id) {
        return null;
    }

    return (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
            <SectionTitle icon={User}>
                Customer Information
            </SectionTitle>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Detail
                    label="Customer Name"
                    value={customer.customer_name}
                />

                <Detail
                    label="Customer Code"
                    value={customer.customer_code}
                />

                <Detail
                    label="Customer ID"
                    value={customer.customer_id}
                />

                <Detail
                    label="Phone"
                    value={customer.phone}
                />

                <Detail
                    label="Email"
                    value={customer.email}
                />

                <Detail
                    label="Address"
                    value={customer.address}
                />
            </div>
        </section>
    );
}

// --------------------------------------------------
// Invoice / return item table
// --------------------------------------------------

function ItemDetailsTable({
    items = [],
    total,
    title = "Items",
}) {
    if (!items.length) {
        return (
            <div className="p-8 text-center text-sm text-slate-500">
                <Package
                    size={26}
                    className="mx-auto mb-2 text-slate-300"
                />

                No item details are available.
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-sm">
                <thead>
                    <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
                        <th className="border-y border-slate-200 px-4 py-3">
                            #
                        </th>

                        <th className="border-y border-slate-200 px-4 py-3">
                            Product
                        </th>

                        <th className="border-y border-slate-200 px-4 py-3">
                            Description
                        </th>

                        <th className="border-y border-slate-200 px-4 py-3 text-right">
                            Quantity
                        </th>

                        <th className="border-y border-slate-200 px-4 py-3 text-right">
                            Unit Price
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
                    {items.map((row, index) => {
                        const item = row.item || row;
                        const product = row.product || {};

                        const productName =
                            product.product_name ||
                            product.name ||
                            item.product_name ||
                            item.product_id ||
                            "-";

                        const description =
                            item.description ||
                            item.item_description ||
                            product.product_description ||
                            productName;

                        const unitPrice =
                            item.unit_price ??
                            item.unit_cost ??
                            item.rate ??
                            0;

                        const lineTotal =
                            item.line_total ??
                            item.total_amount ??
                            0;

                        return (
                            <tr
                                key={
                                    item.invoice_item_id ||
                                    item.return_item_id ||
                                    item.sales_return_item_id ||
                                    index
                                }
                                className="hover:bg-slate-50"
                            >
                                <td className="border-b border-slate-100 px-4 py-3">
                                    {index + 1}
                                </td>

                                <td className="border-b border-slate-100 px-4 py-3 font-medium text-slate-800">
                                    {productName}
                                </td>

                                <td className="border-b border-slate-100 px-4 py-3 text-slate-600">
                                    {description}
                                </td>

                                <td className="border-b border-slate-100 px-4 py-3 text-right tabular-nums">
                                    {formatCurrency(item.quantity)}
                                </td>

                                <td className="border-b border-slate-100 px-4 py-3 text-right tabular-nums">
                                    {formatCurrency(unitPrice)}
                                </td>

                                <td className="border-b border-slate-100 px-4 py-3 text-right tabular-nums">
                                    {formatCurrency(item.discount)}
                                </td>

                                <td className="border-b border-slate-100 px-4 py-3 text-right tabular-nums">
                                    {formatCurrency(item.tax)}
                                </td>

                                <td className="border-b border-slate-100 px-4 py-3 text-right font-semibold tabular-nums">
                                    {formatCurrency(lineTotal)}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>

                {total !== undefined && total !== null && (
                    <tfoot>
                        <tr className="bg-slate-50 font-bold">
                            <td
                                colSpan={7}
                                className="px-4 py-3 text-right"
                            >
                                {title}
                            </td>

                            <td className="px-4 py-3 text-right">
                                {formatCurrency(total)}
                            </td>
                        </tr>
                    </tfoot>
                )}
            </table>
        </div>
    );
}

// --------------------------------------------------
// Journal lines
// --------------------------------------------------

function JournalLines({ lines = [] }) {
    if (!lines.length) {
        return (
            <div className="p-8 text-center text-sm text-slate-500">
                No journal lines available.
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-sm">
                <thead>
                    <tr className="bg-slate-50 text-left text-xs uppercase text-slate-600">
                        <th className="border-y border-slate-200 px-4 py-3">
                            Account Code
                        </th>

                        <th className="border-y border-slate-200 px-4 py-3">
                            Account Name
                        </th>

                        <th className="border-y border-slate-200 px-4 py-3">
                            Description
                        </th>

                        <th className="border-y border-slate-200 px-4 py-3 text-right">
                            Debit
                        </th>

                        <th className="border-y border-slate-200 px-4 py-3 text-right">
                            Credit
                        </th>
                    </tr>
                </thead>

                <tbody>
                    {lines.map((entry, index) => {
                        const line = entry.line || {};
                        const account = entry.account || {};

                        return (
                            <tr
                                key={line.journal_line_id || index}
                                className="hover:bg-slate-50"
                            >
                                <td className="border-b border-slate-100 px-4 py-3">
                                    {account.account_code ||
                                        line.account_id ||
                                        "-"}
                                </td>

                                <td className="border-b border-slate-100 px-4 py-3 font-medium">
                                    {account.account_name || "-"}
                                </td>

                                <td className="border-b border-slate-100 px-4 py-3">
                                    {line.description || "-"}
                                </td>

                                <td className="border-b border-slate-100 px-4 py-3 text-right font-medium text-emerald-700">
                                    {Number(line.debit || 0) > 0
                                        ? formatCurrency(line.debit)
                                        : "-"}
                                </td>

                                <td className="border-b border-slate-100 px-4 py-3 text-right font-medium text-rose-700">
                                    {Number(line.credit || 0) > 0
                                        ? formatCurrency(line.credit)
                                        : "-"}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

// --------------------------------------------------
// Expanded transaction details
// --------------------------------------------------

function CustomerTransactionDetails({ row }) {
    const details = row.details || {};

    const invoice = details.invoice || {};
    const payment = details.payment || {};
    const customer = details.customer || {};
    const salesReturn = details.return || {};
    const journal = details.journal || {};

    const isInvoice = row.sourceType === "SALES_INVOICE";
    const isPayment = row.sourceType === "SALES_PAYMENT";
    const isReturn = row.sourceType === "SALES_RETURN";
    const isJournal = row.sourceType === "JOURNAL";

    const items = isInvoice
        ? details.items || []
        : isPayment
            ? details.invoiceItems || []
            : isReturn
                ? details.items || []
                : [];

    return (
        <div className="space-y-5 bg-slate-50 p-4 md:p-5">

            {/* Transaction header */}
            <section className="rounded-lg border border-slate-200 bg-white p-4">
                <SectionTitle
                    icon={
                        isPayment
                            ? CreditCard
                            : isJournal
                                ? FileText
                                : Receipt
                    }
                >
                    {transactionLabel(row.sourceType)} Information
                </SectionTitle>

                {/* Invoice */}
                {isInvoice && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Detail
                            label="Invoice Number"
                            value={invoice.invoice_number}
                        />

                        <Detail
                            label="Invoice ID"
                            value={invoice.invoice_id}
                        />

                        <Detail
                            label="Invoice Date"
                            value={formatDate(invoice.invoice_date)}
                        />

                        <Detail
                            label="Status"
                            value={<StatusBadge value={invoice.status} />}
                        />

                        <Detail
                            label="Subtotal"
                            value={invoice.subtotal}
                            currency
                        />

                        <Detail
                            label="Discount"
                            value={invoice.discount}
                            currency
                        />

                        <Detail
                            label="Tax"
                            value={invoice.tax}
                            currency
                        />

                        <Detail
                            label="Total Amount"
                            value={invoice.total_amount}
                            currency
                        />

                        <Detail
                            label="Paid Amount"
                            value={invoice.paid_amount}
                            currency
                        />

                        <Detail
                            label="Balance Amount"
                            value={invoice.balance_amount}
                            currency
                        />

                        <Detail
                            label="Warehouse ID"
                            value={invoice.warehouse_id}
                        />

                        <Detail
                            label="Delivery Challan ID"
                            value={invoice.delivery_challan_id}
                        />

                        <Detail
                            label="Created At"
                            value={formatDateTime(invoice.created_at)}
                        />

                        <Detail
                            label="Notes"
                            value={invoice.notes}
                        />
                    </div>
                )}

                {/* Payment */}
                {isPayment && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Detail
                            label="Payment Number"
                            value={payment.payment_number}
                        />

                        <Detail
                            label="Payment ID"
                            value={payment.payment_id}
                        />

                        <Detail
                            label="Payment Date"
                            value={formatDate(payment.payment_date)}
                        />

                        <Detail
                            label="Payment Amount"
                            value={payment.amount}
                            currency
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
                            label="Linked Invoice Number"
                            value={invoice.invoice_number}
                        />

                        <Detail
                            label="Linked Invoice ID"
                            value={payment.invoice_id}
                        />

                        <Detail
                            label="Account ID"
                            value={payment.account_id}
                        />

                        <Detail
                            label="Created At"
                            value={formatDateTime(payment.created_at)}
                        />

                        <Detail
                            label="Notes"
                            value={payment.notes}
                        />
                    </div>
                )}

                {/* Sales Return */}
                {isReturn && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Detail
                            label="Return Number"
                            value={salesReturn.return_number}
                        />

                        <Detail
                            label="Return ID"
                            value={salesReturn.return_id}
                        />

                        <Detail
                            label="Return Date"
                            value={formatDate(salesReturn.return_date)}
                        />

                        <Detail
                            label="Status"
                            value={<StatusBadge value={salesReturn.status} />}
                        />

                        <Detail
                            label="Subtotal"
                            value={salesReturn.subtotal}
                            currency
                        />

                        <Detail
                            label="Discount"
                            value={salesReturn.discount}
                            currency
                        />

                        <Detail
                            label="Tax"
                            value={salesReturn.tax}
                            currency
                        />

                        <Detail
                            label="Return Total"
                            value={salesReturn.total_amount}
                            currency
                        />

                        <Detail
                            label="Refund Method"
                            value={salesReturn.refund_method}
                        />

                        <Detail
                            label="Refund Amount"
                            value={salesReturn.refund_amount}
                            currency
                        />

                        <Detail
                            label="Linked Invoice Number"
                            value={invoice.invoice_number}
                        />

                        <Detail
                            label="Linked Invoice ID"
                            value={salesReturn.invoice_id}
                        />

                        <Detail
                            label="Warehouse ID"
                            value={salesReturn.warehouse_id}
                        />

                        <Detail
                            label="Approved At"
                            value={formatDateTime(salesReturn.approved_at)}
                        />

                        <Detail
                            label="Notes"
                            value={salesReturn.notes}
                        />
                    </div>
                )}

                {/* Journal */}
                {isJournal && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Detail
                            label="Journal Number"
                            value={journal.journal_number}
                        />

                        <Detail
                            label="Journal ID"
                            value={journal.journal_id}
                        />

                        <Detail
                            label="Journal Date"
                            value={formatDate(journal.journal_date)}
                        />

                        <Detail
                            label="Reference Type"
                            value={journal.reference_type}
                        />

                        <Detail
                            label="Reference ID"
                            value={journal.reference_id}
                        />

                        <Detail
                            label="Status"
                            value={<StatusBadge value={journal.status} />}
                        />

                        <Detail
                            label="Description"
                            value={journal.description}
                        />

                        <Detail
                            label="Created At"
                            value={formatDateTime(journal.created_at)}
                        />
                    </div>
                )}
            </section>

            {/* Customer */}
            {!isJournal && (
                <CustomerInformation customer={customer} />
            )}

            {/* Invoice items */}
            {isInvoice && (
                <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                    <div className="p-4 pb-0">
                        <SectionTitle icon={Package}>
                            Sales Invoice Items
                        </SectionTitle>
                    </div>

                    <ItemDetailsTable
                        items={items}
                        total={invoice.total_amount}
                        title="Invoice Total"
                    />
                </section>
            )}

            {/* Payment linked invoice */}
            {isPayment && (
                <>
                    <section className="rounded-lg border border-slate-200 bg-white p-4">
                        <SectionTitle icon={Receipt}>
                            Linked Sales Invoice
                        </SectionTitle>

                        {invoice.invoice_id ? (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                <Detail
                                    label="Invoice Number"
                                    value={invoice.invoice_number}
                                />

                                <Detail
                                    label="Invoice Date"
                                    value={formatDate(invoice.invoice_date)}
                                />

                                <Detail
                                    label="Invoice Total"
                                    value={invoice.total_amount}
                                    currency
                                />

                                <Detail
                                    label="Invoice Status"
                                    value={<StatusBadge value={invoice.status} />}
                                />

                                <Detail
                                    label="Paid Amount"
                                    value={invoice.paid_amount}
                                    currency
                                />

                                <Detail
                                    label="Balance Amount"
                                    value={invoice.balance_amount}
                                    currency
                                />
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500">
                                Linked invoice information is not available.
                            </p>
                        )}
                    </section>

                    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                        <div className="p-4 pb-0">
                            <SectionTitle icon={Package}>
                                Items of Linked Sales Invoice
                            </SectionTitle>
                        </div>

                        <ItemDetailsTable
                            items={items}
                            total={invoice.total_amount}
                            title="Invoice Total"
                        />
                    </section>
                </>
            )}

            {/* Return items */}
            {isReturn && (
                <>
                    <section className="rounded-lg border border-slate-200 bg-white p-4">
                        <SectionTitle icon={Receipt}>
                            Original Sales Invoice
                        </SectionTitle>

                        {invoice.invoice_id ? (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                <Detail
                                    label="Invoice Number"
                                    value={invoice.invoice_number}
                                />

                                <Detail
                                    label="Invoice Date"
                                    value={formatDate(invoice.invoice_date)}
                                />

                                <Detail
                                    label="Invoice Total"
                                    value={invoice.total_amount}
                                    currency
                                />

                                <Detail
                                    label="Invoice Status"
                                    value={<StatusBadge value={invoice.status} />}
                                />
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500">
                                This return is not linked to an invoice.
                            </p>
                        )}
                    </section>

                    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                        <div className="p-4 pb-0">
                            <SectionTitle icon={Package}>
                                Returned Items
                            </SectionTitle>
                        </div>

                        <ItemDetailsTable
                            items={items}
                            total={salesReturn.total_amount}
                            title="Return Total"
                        />
                    </section>
                </>
            )}

            {/* Journal lines */}
            {isJournal && (
                <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                    <div className="p-4 pb-0">
                        <SectionTitle icon={Receipt}>
                            Journal Entry Lines
                        </SectionTitle>
                    </div>

                    <JournalLines lines={details.lines || []} />
                </section>
            )}

            {/* Transaction ledger summary */}
            <section className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Detail
                        label="Ledger Transaction"
                        value={row.transactionNumber}
                    />

                    <Detail
                        label="Ledger Debit"
                        value={row.debit}
                        currency
                    />

                    <Detail
                        label="Ledger Credit"
                        value={row.credit}
                        currency
                    />
                </div>
            </section>
        </div>
    );
}

// --------------------------------------------------
// Main page
// --------------------------------------------------

export default function CustomerDetailLedgerPage() {
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState("");

    const [fromDate, setFromDate] = useState(firstDayOfMonth());
    const [toDate, setToDate] = useState(todayDate());

    const [transactions, setTransactions] = useState([]);

    const [openingBalance, setOpeningBalance] = useState(0);
    const [closingBalance, setClosingBalance] = useState(0);
    const [customerInfo, setCustomerInfo] = useState(null);

    const [search, setSearch] = useState("");

    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    const [error, setError] = useState("");
    const [hasLoaded, setHasLoaded] = useState(false);

    // Expanded transaction
    const [expandedTransaction, setExpandedTransaction] = useState(null);

    // --------------------------------------------------
    // Load ledger
    // --------------------------------------------------

    const loadLedger = useCallback(
        async (customerId, startDate, endDate) => {
            if (!customerId) {
                setTransactions([]);
                setCustomerInfo(null);
                setOpeningBalance(0);
                setClosingBalance(0);
                setExpandedTransaction(null);
                setHasLoaded(false);
                return;
            }

            if (startDate > endDate) {
                setError("From Date cannot be after To Date.");
                return;
            }

            setLoading(true);
            setError("");

            try {
                const params = new URLSearchParams({
                    customerId,
                    fromDate: startDate,
                    toDate: endDate,
                });

                const response = await fetch(
                    `${API_URL}?${params.toString()}`,
                    {
                        method: "GET",
                        cache: "no-store",
                    }
                );

                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message ||
                        "Unable to load customer ledger."
                    );
                }

                setCustomers(result.customers || []);
                setTransactions(result.transactions || []);

                setCustomerInfo(result.customer || null);

                setOpeningBalance(
                    Number(result.openingBalance || 0)
                );

                setClosingBalance(
                    Number(result.closingBalance || 0)
                );

                setExpandedTransaction(null);
                setHasLoaded(true);
            } catch (err) {
                setError(
                    err.message || "Something went wrong."
                );

                setTransactions([]);
                setCustomerInfo(null);

                setOpeningBalance(0);
                setClosingBalance(0);

                setExpandedTransaction(null);
                setHasLoaded(false);
            } finally {
                setLoading(false);
            }
        },
        []
    );

    // --------------------------------------------------
    // Load customers
    // --------------------------------------------------

    const loadCustomers = useCallback(async () => {
        setInitialLoading(true);
        setError("");

        try {
            const response = await fetch(API_URL, {
                method: "GET",
                cache: "no-store",
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Unable to load customers."
                );
            }

            setCustomers(result.customers || []);
        } catch (err) {
            setError(
                err.message || "Unable to load customers."
            );
        } finally {
            setInitialLoading(false);
        }
    }, []);

    useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
        if (cancelled) return;
        await loadCustomers();
    };

    initialize();

    return () => {
        cancelled = true;
    };
}, [loadCustomers]);

    // --------------------------------------------------
    // Selected customer
    // --------------------------------------------------

    const selectedCustomerName = useMemo(() => {
        const customer = customers.find(
            item =>
                String(item.customer_id) ===
                String(selectedCustomer)
        );

        return (
            customer?.customer_name ||
            customerInfo?.customer_name ||
            ""
        );
    }, [customers, selectedCustomer, customerInfo]);

    // --------------------------------------------------
    // Filter transactions
    // --------------------------------------------------

    const filteredTransactions = useMemo(() => {
        const term = search.trim().toLowerCase();

        if (!term) return transactions;

        return transactions.filter(item => {
            const searchable = [
                item.transactionNumber,
                item.memo,
                item.sourceType,
                item.sourceId,
                item.transactionDate,
                JSON.stringify(item.details || {}),
            ]
                .join(" ")
                .toLowerCase();

            return searchable.includes(term);
        });
    }, [transactions, search]);

    // --------------------------------------------------
    // Summary totals
    // --------------------------------------------------

    const totalDebit = useMemo(
        () =>
            transactions.reduce(
                (total, item) =>
                    total + Number(item.debit || 0),
                0
            ),
        [transactions]
    );

    const totalCredit = useMemo(
        () =>
            transactions.reduce(
                (total, item) =>
                    total + Number(item.credit || 0),
                0
            ),
        [transactions]
    );

    // --------------------------------------------------
    // Expand / collapse
    // --------------------------------------------------

    const toggleTransaction = useCallback((item) => {
        const key = `${item.sourceType}-${item.sourceId}`;

        setExpandedTransaction(current =>
            current === key ? null : key
        );
    }, []);

    // --------------------------------------------------
    // Search
    // --------------------------------------------------

    const handleSearch = () => {
        if (!selectedCustomer) {
            setError("Please select a customer.");
            return;
        }

        loadLedger(selectedCustomer, fromDate, toDate);
    };

    // --------------------------------------------------
    // Reset
    // --------------------------------------------------

    const handleReset = () => {
        const start = firstDayOfMonth();
        const end = todayDate();

        setFromDate(start);
        setToDate(end);
        setSearch("");
        setError("");
        setExpandedTransaction(null);

        if (selectedCustomer) {
            loadLedger(selectedCustomer, start, end);
        }
    };

    // --------------------------------------------------
    // Customer change
    // --------------------------------------------------

    const handleCustomerChange = value => {
        setSelectedCustomer(value);

        setTransactions([]);
        setCustomerInfo(null);

        setOpeningBalance(0);
        setClosingBalance(0);

        setExpandedTransaction(null);
        setHasLoaded(false);
        setError("");
        setSearch("");
    };

    // --------------------------------------------------
    // CSV export
    // --------------------------------------------------

    const exportCSV = () => {
        if (!hasLoaded || !transactions.length) return;

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
                "",
                "Opening Balance",
                "",
                "",
                openingBalance.toFixed(2),
            ],

            ...transactions.map(item => [
                item.transactionDate,
                item.transactionNumber,
                transactionLabel(item.sourceType),
                item.memo,
                Number(item.debit || 0).toFixed(2),
                Number(item.credit || 0).toFixed(2),
                Number(item.runningBalance || 0).toFixed(2),
            ]),

            [
                "",
                "",
                "",
                "Closing Balance",
                "",
                "",
                closingBalance.toFixed(2),
            ],
        ];

        const csv = rows
            .map(row => row.map(escapeCSV).join(","))
            .join("\r\n");

        const blob = new Blob(["\uFEFF" + csv], {
            type: "text/csv;charset=utf-8;",
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;

        link.download =
            `Customer-Detail-Ledger-${selectedCustomer}-${fromDate}-to-${toDate}.csv`;

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);
    };

    // --------------------------------------------------
    // Render
    // --------------------------------------------------

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-6">
            <div className="mx-auto max-w-[1600px] space-y-6">

                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                        <Link
                            href="/dashboard"
                            className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-100"
                        >
                            <ArrowLeft size={19} />
                        </Link>

                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                                Customer Detail Ledger
                            </h1>

                            <p className="mt-1 text-sm text-slate-500">
                                Detailed customer transactions and running balances
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            if (selectedCustomer) {
                                handleSearch();
                            } else {
                                loadCustomers();
                            }
                        }}
                        disabled={loading || initialLoading}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <RefreshCw
                            size={16}
                            className={loading ? "animate-spin" : ""}
                        />

                        Refresh
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        <AlertCircle
                            size={19}
                            className="mt-0.5 shrink-0"
                        />

                        <div className="flex-1">
                            {error}
                        </div>

                        <button
                            onClick={() => setError("")}
                            className="text-red-500 hover:text-red-700"
                        >
                            <X size={17} />
                        </button>
                    </div>
                )}

                {/* Filters */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-5 flex items-center gap-2">
                        <Filter
                            size={18}
                            className="text-blue-600"
                        />

                        <h2 className="font-bold text-slate-800">
                            Ledger Filters
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

                        {/* Customer */}
                        <div>
                            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                                <Users size={15} />
                                Customer
                            </label>

                            <select
                                value={selectedCustomer}
                                onChange={e =>
                                    handleCustomerChange(e.target.value)
                                }
                                disabled={initialLoading}
                                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            >
                                <option value="">
                                    {initialLoading
                                        ? "Loading customers..."
                                        : "Select Customer"}
                                </option>

                                {customers.map(customer => (
                                    <option
                                        key={customer.customer_id}
                                        value={customer.customer_id}
                                    >
                                        {customer.customer_code
                                            ? `${customer.customer_code} - `
                                            : ""}
                                        {customer.customer_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* From Date */}
                        <div>
                            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                                <CalendarDays size={15} />
                                From Date
                            </label>

                            <input
                                type="date"
                                value={fromDate}
                                max={toDate}
                                onChange={e =>
                                    setFromDate(e.target.value)
                                }
                                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                        </div>

                        {/* To Date */}
                        <div>
                            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                                <CalendarDays size={15} />
                                To Date
                            </label>

                            <input
                                type="date"
                                value={toDate}
                                min={fromDate}
                                max={todayDate()}
                                onChange={e =>
                                    setToDate(e.target.value)
                                }
                                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex items-end gap-2">
                            <button
                                onClick={handleSearch}
                                disabled={loading || !selectedCustomer}
                                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Search size={17} />
                                View Ledger
                            </button>

                            <button
                                onClick={handleReset}
                                disabled={loading}
                                title="Reset filters"
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                            >
                                <RefreshCw size={17} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Customer information */}
                {hasLoaded && customerInfo && (
                    <div className="flex flex-col justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-4 sm:flex-row sm:items-center">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                                Selected Customer
                            </p>

                            <h2 className="mt-1 text-lg font-bold text-slate-900">
                                {selectedCustomerName}
                            </h2>

                            <p className="mt-1 text-sm text-slate-600">
                                {customerInfo.customer_code ||
                                    "No customer code"}
                            </p>
                        </div>

                        <div className="text-sm text-slate-600">
                            <span className="font-semibold">
                                Period:
                            </span>{" "}
                            {formatDate(fromDate)} - {formatDate(toDate)}
                        </div>
                    </div>
                )}

                {/* Summary cards */}
                {hasLoaded && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

                        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-slate-500">
                                    Opening Balance
                                </p>

                                <Wallet
                                    size={20}
                                    className="text-blue-600"
                                />
                            </div>

                            <p className="mt-3 text-xl font-bold text-slate-900">
                                {formatCurrency(openingBalance)}
                            </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-slate-500">
                                    Total Debit
                                </p>

                                <TrendingUp
                                    size={20}
                                    className="text-emerald-600"
                                />
                            </div>

                            <p className="mt-3 text-xl font-bold text-emerald-700">
                                {formatCurrency(totalDebit)}
                            </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-slate-500">
                                    Total Credit
                                </p>

                                <TrendingDown
                                    size={20}
                                    className="text-rose-600"
                                />
                            </div>

                            <p className="mt-3 text-xl font-bold text-rose-700">
                                {formatCurrency(totalCredit)}
                            </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-slate-500">
                                    Closing Balance
                                </p>

                                <FileText
                                    size={20}
                                    className="text-violet-600"
                                />
                            </div>

                            <p
                                className={`mt-3 text-xl font-bold ${
                                    closingBalance < 0
                                        ? "text-rose-700"
                                        : "text-slate-900"
                                }`}
                            >
                                {formatCurrency(closingBalance)}
                            </p>
                        </div>
                    </div>
                )}

                {/* Transactions */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                    {/* Transaction header */}
                    <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">
                                Transaction Details
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                {hasLoaded
                                    ? `${filteredTransactions.length} transaction(s) found`
                                    : "Select a customer and view the ledger"}
                            </p>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row">

                            {/* Search */}
                            <div className="relative">
                                <Search
                                    size={16}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                />

                                <input
                                    type="text"
                                    placeholder="Search transactions..."
                                    value={search}
                                    onChange={e =>
                                        setSearch(e.target.value)
                                    }
                                    disabled={!hasLoaded}
                                    className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-500 sm:w-64"
                                />
                            </div>

                            {/* Export */}
                            <button
                                onClick={exportCSV}
                                disabled={
                                    !hasLoaded ||
                                    !transactions.length
                                }
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Download size={16} />
                                Export CSV
                            </button>
                        </div>
                    </div>

                    {/* Loading */}
                    {loading && (
                        <div className="flex items-center justify-center gap-3 p-12 text-sm text-slate-500">
                            <RefreshCw
                                size={19}
                                className="animate-spin"
                            />

                            Loading customer ledger...
                        </div>
                    )}

                    {/* Empty selection */}
                    {!loading && !hasLoaded && (
                        <div className="flex flex-col items-center justify-center p-14 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                                <FileText size={27} />
                            </div>

                            <h3 className="mt-4 font-semibold text-slate-800">
                                No Ledger Selected
                            </h3>

                            <p className="mt-1 max-w-md text-sm text-slate-500">
                                Select a customer and date range, then click
                                View Ledger to display the transaction history.
                            </p>
                        </div>
                    )}

                    {/* Ledger table */}
                    {!loading && hasLoaded && (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[1050px] border-collapse text-left">

                                    <thead>
                                        <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                                            <th className="border-b border-slate-200 px-5 py-4 font-bold">
                                                Trandate
                                            </th>

                                            <th className="border-b border-slate-200 px-5 py-4 font-bold">
                                                Transaction Number
                                            </th>

                                            <th className="border-b border-slate-200 px-5 py-4 font-bold">
                                                Memo
                                            </th>

                                            <th className="border-b border-slate-200 px-5 py-4 text-right font-bold">
                                                Debit
                                            </th>

                                            <th className="border-b border-slate-200 px-5 py-4 text-right font-bold">
                                                Credit
                                            </th>

                                            <th className="border-b border-slate-200 px-5 py-4 text-right font-bold">
                                                Running Total
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {/* Opening balance */}
                                        <tr className="bg-blue-50/60">
                                            <td className="whitespace-nowrap border-b border-slate-100 px-5 py-4 text-sm font-semibold text-slate-700">
                                                {formatDate(fromDate)}
                                            </td>

                                            <td className="border-b border-slate-100 px-5 py-4 text-sm">
                                                -
                                            </td>

                                            <td className="border-b border-slate-100 px-5 py-4 text-sm font-bold text-blue-800">
                                                Opening Balance
                                            </td>

                                            <td className="border-b border-slate-100 px-5 py-4 text-right text-sm">
                                                -
                                            </td>

                                            <td className="border-b border-slate-100 px-5 py-4 text-right text-sm">
                                                -
                                            </td>

                                            <td className="whitespace-nowrap border-b border-slate-100 px-5 py-4 text-right text-sm font-bold text-blue-800">
                                                {formatCurrency(openingBalance)}
                                            </td>
                                        </tr>

                                        {/* Transactions */}
                                        {filteredTransactions.map(item => {
                                            const key =
                                                `${item.sourceType}-${item.sourceId}`;

                                            const isExpanded =
                                                expandedTransaction === key;

                                            return (
                                                <Fragment key={key}>
                                                    <tr
                                                        className={`border-b border-slate-100 transition ${
                                                            isExpanded
                                                                ? "bg-blue-50"
                                                                : "hover:bg-slate-50"
                                                        }`}
                                                    >
                                                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                                                            {formatDate(
                                                                item.transactionDate
                                                            )}
                                                        </td>

                                                        {/* Expandable transaction number */}
                                                        <td className="whitespace-nowrap px-5 py-4 text-sm">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    toggleTransaction(item)
                                                                }
                                                                aria-expanded={isExpanded}
                                                                className="inline-flex items-center gap-2 font-semibold text-blue-700 transition hover:text-blue-900 hover:underline"
                                                            >
                                                                <FileText size={15} />

                                                                {item.transactionNumber || "-"}

                                                                {isExpanded ? (
                                                                    <ChevronUp
                                                                        size={16}
                                                                        className="shrink-0"
                                                                    />
                                                                ) : (
                                                                    <ChevronDown
                                                                        size={16}
                                                                        className="shrink-0"
                                                                    />
                                                                )}
                                                            </button>

                                                            <p className="mt-1 text-xs font-normal text-slate-400">
                                                                {transactionLabel(
                                                                    item.sourceType
                                                                )}
                                                            </p>
                                                        </td>

                                                        <td className="max-w-[350px] px-5 py-4 text-sm text-slate-600">
                                                            <span className="block truncate">
                                                                {item.memo || "-"}
                                                            </span>
                                                        </td>

                                                        <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-medium text-emerald-700">
                                                            {Number(item.debit || 0) > 0
                                                                ? formatCurrency(item.debit)
                                                                : "-"}
                                                        </td>

                                                        <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-medium text-rose-700">
                                                            {Number(item.credit || 0) > 0
                                                                ? formatCurrency(item.credit)
                                                                : "-"}
                                                        </td>

                                                        <td
                                                            className={`whitespace-nowrap px-5 py-4 text-right text-sm font-bold ${
                                                                Number(item.runningBalance) < 0
                                                                    ? "text-rose-700"
                                                                    : "text-slate-900"
                                                            }`}
                                                        >
                                                            {formatCurrency(
                                                                item.runningBalance
                                                            )}
                                                        </td>
                                                    </tr>

                                                    {/* Expanded detail panel */}
                                                    {isExpanded && (
                                                        <tr>
                                                            <td
                                                                colSpan={6}
                                                                className="border-b border-slate-200 p-0"
                                                            >
                                                                <CustomerTransactionDetails
                                                                    row={item}
                                                                />
                                                            </td>
                                                        </tr>
                                                    )}
                                                </Fragment>
                                            );
                                        })}

                                        {/* No transactions */}
                                        {filteredTransactions.length === 0 && (
                                            <tr>
                                                <td
                                                    colSpan={6}
                                                    className="px-5 py-12 text-center text-sm text-slate-500"
                                                >
                                                    No transactions found for this customer and date range.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>

                                    {/* Footer */}
                                    <tfoot>
                                        <tr className="border-t-2 border-slate-200 bg-slate-50">
                                            <td
                                                colSpan={3}
                                                className="px-5 py-4 text-sm font-bold text-slate-800"
                                            >
                                                Period Total
                                            </td>

                                            <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-bold text-emerald-700">
                                                {formatCurrency(totalDebit)}
                                            </td>

                                            <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-bold text-rose-700">
                                                {formatCurrency(totalCredit)}
                                            </td>

                                            <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-bold text-slate-900">
                                                {formatCurrency(closingBalance)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {/* Bottom summary */}
                            <div className="flex flex-col justify-between gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 text-sm sm:flex-row sm:items-center">
                                <span className="text-slate-500">
                                    Customer:{" "}
                                    <strong className="text-slate-800">
                                        {selectedCustomerName}
                                    </strong>
                                </span>

                                <span className="font-bold text-slate-800">
                                    Closing Balance:{" "}
                                    {formatCurrency(closingBalance)}
                                </span>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="text-center text-xs text-slate-400">
                    Customer Detail Ledger | Golden Lake ERP
                </div>
            </div>
        </div>
    );
}
