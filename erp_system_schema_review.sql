--
-- PostgreSQL database dump
--

\restrict D9McBfk6eIGxxEeyXGYYW1JRGmqwyPmbqlNEKIwKPCOa8sGSEKdrPJDHDNqhVeH

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    audit_id integer NOT NULL,
    user_id integer,
    username character varying(100),
    action character varying(50) NOT NULL,
    module character varying(100) NOT NULL,
    record_id integer,
    description text,
    old_data jsonb,
    new_data jsonb,
    ip_address character varying(100),
    user_agent text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: audit_logs_audit_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_audit_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_audit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_audit_id_seq OWNED BY public.audit_logs.audit_id;


--
-- Name: chart_of_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chart_of_accounts (
    account_id integer NOT NULL,
    account_code character varying(30) NOT NULL,
    account_name character varying(150) NOT NULL,
    account_type character varying(20) NOT NULL,
    parent_account_id integer,
    opening_balance numeric(14,2) DEFAULT 0 NOT NULL,
    current_balance numeric(14,2) DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_group boolean DEFAULT false NOT NULL,
    is_cash_bank boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chart_of_accounts_account_type_check CHECK (((account_type)::text = ANY ((ARRAY['ASSET'::character varying, 'LIABILITY'::character varying, 'EQUITY'::character varying, 'REVENUE'::character varying, 'EXPENSE'::character varying])::text[])))
);


--
-- Name: chart_of_accounts_account_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chart_of_accounts_account_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chart_of_accounts_account_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chart_of_accounts_account_id_seq OWNED BY public.chart_of_accounts.account_id;


--
-- Name: companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.companies (
    company_id integer NOT NULL,
    company_name character varying(200) NOT NULL,
    phone character varying(50) DEFAULT ''::character varying,
    email character varying(255) DEFAULT ''::character varying,
    address text DEFAULT ''::text,
    currency character varying(10) DEFAULT 'PKR'::character varying NOT NULL,
    logo_url text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    country character varying(100),
    state_province character varying(100),
    city character varying(100),
    location character varying(255),
    province character varying(100),
    postal_code character varying(20),
    logo_path text
);


--
-- Name: companies_company_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.companies_company_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: companies_company_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.companies_company_id_seq OWNED BY public.companies.company_id;


--
-- Name: company_databases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_databases (
    company_id integer NOT NULL,
    database_name character varying(63) NOT NULL,
    status character varying(20) DEFAULT 'PROVISIONING'::character varying NOT NULL,
    schema_version integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT company_databases_name_check CHECK (((database_name)::text ~ '^erp_company_[0-9]{3,}$'::text)),
    CONSTRAINT company_databases_schema_version_check CHECK ((schema_version >= 0)),
    CONSTRAINT company_databases_status_check CHECK (((status)::text = ANY ((ARRAY['PROVISIONING'::character varying, 'ACTIVE'::character varying, 'FAILED'::character varying])::text[])))
);


--
-- Name: company_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_settings (
    setting_id integer NOT NULL,
    company_name character varying(200) DEFAULT 'My Company'::character varying NOT NULL,
    phone character varying(50),
    email character varying(150),
    address text,
    currency character varying(20) DEFAULT 'PKR'::character varying NOT NULL,
    logo_url text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: company_settings_setting_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.company_settings_setting_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: company_settings_setting_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.company_settings_setting_id_seq OWNED BY public.company_settings.setting_id;


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    customer_id integer NOT NULL,
    customer_code character varying(50) NOT NULL,
    customer_name character varying(150) NOT NULL,
    phone character varying(50),
    email character varying(150),
    address text,
    opening_balance numeric(14,2) DEFAULT 0 NOT NULL,
    credit_limit numeric(14,2) DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: customers_customer_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customers_customer_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customers_customer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customers_customer_id_seq OWNED BY public.customers.customer_id;


--
-- Name: delivery_challan_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_challan_items (
    delivery_challan_item_id bigint NOT NULL,
    delivery_challan_id bigint NOT NULL,
    source_order_item_id bigint,
    product_id integer,
    item_name character varying(255) NOT NULL,
    item_description text,
    item_balance numeric(18,3) DEFAULT 0 NOT NULL,
    uom character varying(50),
    quantity numeric(18,3) DEFAULT 0 NOT NULL,
    unit_price numeric(18,2) DEFAULT 0 NOT NULL,
    amount numeric(18,2) DEFAULT 0 NOT NULL,
    tax_code character varying(100),
    tax_rate numeric(7,3) DEFAULT 0 NOT NULL,
    tax_amount numeric(18,2) DEFAULT 0 NOT NULL,
    gross_amount numeric(18,2) DEFAULT 0 NOT NULL,
    memo text,
    line_number integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT delivery_challan_items_price_check CHECK (((unit_price >= (0)::numeric) AND (amount >= (0)::numeric) AND (tax_rate >= (0)::numeric) AND (tax_amount >= (0)::numeric) AND (gross_amount >= (0)::numeric))),
    CONSTRAINT delivery_challan_items_quantity_check CHECK ((quantity >= (0)::numeric))
);


--
-- Name: delivery_challan_items_delivery_challan_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.delivery_challan_items ALTER COLUMN delivery_challan_item_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.delivery_challan_items_delivery_challan_item_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: delivery_challans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_challans (
    delivery_challan_id bigint NOT NULL,
    company_id integer NOT NULL,
    transaction_number character varying(50) NOT NULL,
    transaction_date date DEFAULT CURRENT_DATE NOT NULL,
    customer_id integer,
    warehouse_id integer,
    source_order_id bigint,
    status character varying(30) DEFAULT 'APPROVED'::character varying NOT NULL,
    document_status character varying(50) DEFAULT 'Pending Invoice'::character varying NOT NULL,
    subsidiary_name character varying(255),
    department character varying(150),
    challan_class character varying(150) DEFAULT 'Outbound Shipment'::character varying,
    driver_name character varying(150),
    driver_mobile_no character varying(50),
    vehicle_no character varying(100),
    project character varying(150),
    reference_no character varying(100),
    memo text,
    currency character varying(10) DEFAULT 'PKR'::character varying NOT NULL,
    exchange_rate numeric(18,6) DEFAULT 1 NOT NULL,
    total_amount numeric(18,2) DEFAULT 0 NOT NULL,
    tax_amount numeric(18,2) DEFAULT 0 NOT NULL,
    gross_amount numeric(18,2) DEFAULT 0 NOT NULL,
    created_by integer,
    updated_by integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT delivery_challans_amounts_check CHECK (((total_amount >= (0)::numeric) AND (tax_amount >= (0)::numeric) AND (gross_amount >= (0)::numeric))),
    CONSTRAINT delivery_challans_exchange_rate_check CHECK ((exchange_rate > (0)::numeric)),
    CONSTRAINT delivery_challans_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'APPROVED'::character varying, 'VOID'::character varying])::text[])))
);


--
-- Name: delivery_challans_delivery_challan_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.delivery_challans ALTER COLUMN delivery_challan_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.delivery_challans_delivery_challan_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: inventory_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_transactions (
    inventory_transaction_id integer NOT NULL,
    product_id integer NOT NULL,
    transaction_date date DEFAULT CURRENT_DATE NOT NULL,
    transaction_type character varying(50) NOT NULL,
    transaction_number character varying(100),
    location character varying(100) DEFAULT 'Main Warehouse'::character varying NOT NULL,
    uom character varying(50),
    memo text,
    transaction_rate numeric(18,2) DEFAULT 0,
    old_rate numeric(18,2) DEFAULT 0,
    actual_rate numeric(18,2) DEFAULT 0,
    new_rate numeric(18,2) DEFAULT 0,
    receive_quantity numeric(18,3) DEFAULT 0,
    receive_rate numeric(18,2) DEFAULT 0,
    receive_amount numeric(18,2) DEFAULT 0,
    issue_quantity numeric(18,3) DEFAULT 0,
    issue_rate numeric(18,2) DEFAULT 0,
    issue_amount numeric(18,2) DEFAULT 0,
    running_quantity numeric(18,3) DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    sub_product_id integer,
    company_id integer
);


--
-- Name: inventory_transactions_inventory_transaction_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventory_transactions_inventory_transaction_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventory_transactions_inventory_transaction_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventory_transactions_inventory_transaction_id_seq OWNED BY public.inventory_transactions.inventory_transaction_id;


--
-- Name: item_receipt_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_receipt_items (
    item_receipt_item_id integer NOT NULL,
    item_receipt_id integer NOT NULL,
    purchase_order_item_id integer,
    pending_item_receipt_item_id integer,
    product_id integer,
    item_description text NOT NULL,
    uom character varying(50),
    quantity_received numeric(18,4) NOT NULL,
    unit_cost numeric(18,4) DEFAULT 0 NOT NULL,
    line_total numeric(18,4) DEFAULT 0 NOT NULL,
    remarks text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT item_receipt_items_cost_check CHECK ((unit_cost >= (0)::numeric)),
    CONSTRAINT item_receipt_items_quantity_check CHECK ((quantity_received > (0)::numeric)),
    CONSTRAINT item_receipt_items_total_check CHECK ((line_total >= (0)::numeric))
);


--
-- Name: item_receipt_items_item_receipt_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.item_receipt_items ALTER COLUMN item_receipt_item_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.item_receipt_items_item_receipt_item_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: item_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_receipts (
    item_receipt_id integer NOT NULL,
    receipt_number character varying(50) NOT NULL,
    company_id integer NOT NULL,
    supplier_id integer NOT NULL,
    warehouse_id integer NOT NULL,
    purchase_order_id integer,
    pending_item_receipt_id integer,
    source_type character varying(40) DEFAULT 'MANUAL'::character varying NOT NULL,
    receipt_date date DEFAULT CURRENT_DATE NOT NULL,
    status character varying(20) DEFAULT 'DRAFT'::character varying NOT NULL,
    remarks text,
    posted_at timestamp without time zone,
    posted_by integer,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT item_receipts_source_check CHECK (((source_type)::text = ANY ((ARRAY['MANUAL'::character varying, 'PENDING_ITEM_RECEIPT'::character varying, 'PURCHASE_ORDER'::character varying])::text[]))),
    CONSTRAINT item_receipts_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'APPROVED'::character varying, 'CANCELLED'::character varying])::text[])))
);


--
-- Name: item_receipts_item_receipt_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.item_receipts ALTER COLUMN item_receipt_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.item_receipts_item_receipt_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: journal_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.journal_entries (
    journal_id integer NOT NULL,
    journal_number character varying(50) NOT NULL,
    journal_date date DEFAULT CURRENT_DATE NOT NULL,
    reference_type character varying(50),
    reference_id integer,
    description text,
    status character varying(20) DEFAULT 'POSTED'::character varying NOT NULL,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    company_id integer,
    CONSTRAINT journal_entries_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'POSTED'::character varying, 'CANCELLED'::character varying])::text[])))
);


--
-- Name: journal_entries_journal_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.journal_entries_journal_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: journal_entries_journal_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.journal_entries_journal_id_seq OWNED BY public.journal_entries.journal_id;


--
-- Name: journal_entry_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.journal_entry_lines (
    journal_line_id integer NOT NULL,
    journal_id integer NOT NULL,
    account_id integer NOT NULL,
    description text,
    debit numeric(14,2) DEFAULT 0 NOT NULL,
    credit numeric(14,2) DEFAULT 0 NOT NULL,
    party_type character varying(20),
    party_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    entity_name character varying(255),
    CONSTRAINT journal_entry_lines_check CHECK ((((debit > (0)::numeric) AND (credit = (0)::numeric)) OR ((credit > (0)::numeric) AND (debit = (0)::numeric))))
);


--
-- Name: journal_entry_lines_journal_line_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.journal_entry_lines_journal_line_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: journal_entry_lines_journal_line_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.journal_entry_lines_journal_line_id_seq OWNED BY public.journal_entry_lines.journal_line_id;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    reset_id bigint NOT NULL,
    user_id bigint NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    company_id integer
);


--
-- Name: password_reset_tokens_reset_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.password_reset_tokens_reset_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: password_reset_tokens_reset_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.password_reset_tokens_reset_id_seq OWNED BY public.password_reset_tokens.reset_id;


--
-- Name: pending_item_receipt_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pending_item_receipt_items (
    pending_item_receipt_item_id integer CONSTRAINT pending_item_receipt_items_pending_item_receipt_item_i_not_null NOT NULL,
    pending_item_receipt_id integer NOT NULL,
    purchase_order_item_id integer,
    product_id integer,
    item_description text NOT NULL,
    uom character varying(50),
    quantity_expected numeric(18,4) DEFAULT 0 NOT NULL,
    remarks text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pending_item_receipt_quantity_check CHECK ((quantity_expected > (0)::numeric))
);


--
-- Name: pending_item_receipt_items_pending_item_receipt_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.pending_item_receipt_items ALTER COLUMN pending_item_receipt_item_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.pending_item_receipt_items_pending_item_receipt_item_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pending_item_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pending_item_receipts (
    pending_item_receipt_id integer NOT NULL,
    receipt_number character varying(50) NOT NULL,
    company_id integer NOT NULL,
    supplier_id integer NOT NULL,
    purchase_order_id integer,
    source_type character varying(20) DEFAULT 'MANUAL'::character varying NOT NULL,
    document_date date DEFAULT CURRENT_DATE NOT NULL,
    expected_receipt_date date,
    status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    remarks text,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pending_item_receipt_source_check CHECK (((source_type)::text = ANY ((ARRAY['MANUAL'::character varying, 'PURCHASE_ORDER'::character varying])::text[]))),
    CONSTRAINT pending_item_receipt_source_order_check CHECK (((((source_type)::text = 'MANUAL'::text) AND (purchase_order_id IS NULL)) OR (((source_type)::text = 'PURCHASE_ORDER'::text) AND (purchase_order_id IS NOT NULL)))),
    CONSTRAINT pending_item_receipt_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'PENDING'::character varying, 'CANCELLED'::character varying])::text[])))
);


--
-- Name: pending_item_receipts_pending_item_receipt_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.pending_item_receipts ALTER COLUMN pending_item_receipt_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.pending_item_receipts_pending_item_receipt_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissions (
    permission_id integer NOT NULL,
    permission_key character varying(100) NOT NULL,
    permission_name character varying(100) NOT NULL,
    module character varying(50) NOT NULL,
    description character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: permissions_permission_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.permissions_permission_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: permissions_permission_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.permissions_permission_id_seq OWNED BY public.permissions.permission_id;


--
-- Name: procurement_requisition_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.procurement_requisition_items (
    procurement_requisition_item_id integer CONSTRAINT procurement_requisition_ite_procurement_requisition_it_not_null NOT NULL,
    procurement_requisition_id integer CONSTRAINT procurement_requisition_ite_procurement_requisition_id_not_null NOT NULL,
    source_requisition_id integer NOT NULL,
    source_requisition_item_id integer CONSTRAINT procurement_requisition_ite_source_requisition_item_id_not_null NOT NULL,
    product_id integer,
    item_description text,
    uom character varying(50),
    quantity numeric(18,3) NOT NULL,
    department character varying(150),
    class_name character varying(150),
    warehouse_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT procurement_requisition_items_quantity_check CHECK ((quantity > (0)::numeric))
);


--
-- Name: procurement_requisition_items_procurement_requisition_item__seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.procurement_requisition_items_procurement_requisition_item__seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: procurement_requisition_items_procurement_requisition_item__seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.procurement_requisition_items_procurement_requisition_item__seq OWNED BY public.procurement_requisition_items.procurement_requisition_item_id;


--
-- Name: procurement_requisition_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.procurement_requisition_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: procurement_requisitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.procurement_requisitions (
    procurement_requisition_id integer NOT NULL,
    company_id integer NOT NULL,
    transaction_number character varying(50) NOT NULL,
    transaction_date date DEFAULT CURRENT_DATE NOT NULL,
    status character varying(30) DEFAULT 'CREATED'::character varying NOT NULL,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: procurement_requisitions_procurement_requisition_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.procurement_requisitions_procurement_requisition_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: procurement_requisitions_procurement_requisition_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.procurement_requisitions_procurement_requisition_id_seq OWNED BY public.procurement_requisitions.procurement_requisition_id;


--
-- Name: product_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_categories (
    category_id integer NOT NULL,
    category_name character varying(100) NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: product_categories_category_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_categories_category_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_categories_category_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_categories_category_id_seq OWNED BY public.product_categories.category_id;


--
-- Name: product_units; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_units (
    unit_id integer NOT NULL,
    product_id integer NOT NULL,
    unit_name character varying(50) NOT NULL,
    barcode character varying(100),
    conversion_factor numeric(14,3) DEFAULT 1 NOT NULL,
    is_base_unit boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT product_units_factor_positive CHECK ((conversion_factor > (0)::numeric))
);


--
-- Name: product_units_unit_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_units_unit_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_units_unit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_units_unit_id_seq OWNED BY public.product_units.unit_id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    product_id integer NOT NULL,
    sku character varying(100) NOT NULL,
    product_name character varying(200) NOT NULL,
    category character varying(100),
    unit character varying(50) DEFAULT 'pcs'::character varying NOT NULL,
    cost_price numeric(14,2) DEFAULT 0 CONSTRAINT products_purchase_price_not_null NOT NULL,
    sale_price numeric(14,2) DEFAULT 0 NOT NULL,
    minimum_stock numeric(14,3) DEFAULT 0 CONSTRAINT products_min_stock_not_null NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    sales_account_id integer,
    receivable_account_id integer,
    description text,
    item_type character varying(50) DEFAULT 'Stock Item'::character varying NOT NULL,
    brand_name character varying(150),
    model character varying(150),
    item_color character varying(100),
    item_size character varying(100),
    item_design character varying(150),
    sales_unit character varying(50),
    sales_description text,
    image text,
    banner_sequence integer DEFAULT 0 NOT NULL,
    purchase_unit character varying(50),
    purchase_description text,
    purchase_account_id integer,
    inventory_account_id integer,
    cogs_account_id integer,
    barcode character varying(100)
);


--
-- Name: products_product_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.products_product_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: products_product_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.products_product_id_seq OWNED BY public.products.product_id;


--
-- Name: purchase_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_items (
    purchase_item_id integer NOT NULL,
    purchase_id integer NOT NULL,
    product_id integer NOT NULL,
    quantity numeric(14,3) NOT NULL,
    unit_cost numeric(14,2) DEFAULT 0 NOT NULL,
    discount numeric(14,2) DEFAULT 0 NOT NULL,
    tax numeric(14,2) DEFAULT 0 NOT NULL,
    line_total numeric(14,2) DEFAULT 0 NOT NULL,
    item_receipt_item_id integer,
    item_description text,
    uom character varying(50),
    CONSTRAINT purchase_items_quantity_check CHECK ((quantity > (0)::numeric))
);


--
-- Name: purchase_items_purchase_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_items_purchase_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_items_purchase_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_items_purchase_item_id_seq OWNED BY public.purchase_items.purchase_item_id;


--
-- Name: purchase_order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_order_items (
    purchase_order_item_id integer NOT NULL,
    purchase_order_id integer NOT NULL,
    product_id integer,
    item_description text NOT NULL,
    uom character varying(50),
    quantity numeric(18,4) NOT NULL,
    unit_price numeric(18,4) DEFAULT 0 NOT NULL,
    discount_amount numeric(18,2) DEFAULT 0 NOT NULL,
    tax_rate numeric(10,4) DEFAULT 0 NOT NULL,
    tax_amount numeric(18,2) DEFAULT 0 NOT NULL,
    line_total numeric(18,2) DEFAULT 0 NOT NULL,
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT purchase_order_items_discount_check CHECK ((discount_amount >= (0)::numeric)),
    CONSTRAINT purchase_order_items_line_total_check CHECK ((line_total >= (0)::numeric)),
    CONSTRAINT purchase_order_items_quantity_check CHECK ((quantity > (0)::numeric)),
    CONSTRAINT purchase_order_items_tax_amount_check CHECK ((tax_amount >= (0)::numeric)),
    CONSTRAINT purchase_order_items_tax_rate_check CHECK ((tax_rate >= (0)::numeric)),
    CONSTRAINT purchase_order_items_unit_price_check CHECK ((unit_price >= (0)::numeric))
);


--
-- Name: purchase_order_items_purchase_order_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_order_items_purchase_order_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_order_items_purchase_order_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_order_items_purchase_order_item_id_seq OWNED BY public.purchase_order_items.purchase_order_item_id;


--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_orders (
    purchase_order_id integer NOT NULL,
    purchase_order_number character varying(50) NOT NULL,
    company_id integer NOT NULL,
    supplier_id integer NOT NULL,
    purchase_quotation_id integer,
    order_date date DEFAULT CURRENT_DATE NOT NULL,
    expected_delivery_date date,
    status character varying(30) DEFAULT 'DRAFT'::character varying NOT NULL,
    currency_code character varying(10) DEFAULT 'PKR'::character varying NOT NULL,
    exchange_rate numeric(18,6) DEFAULT 1 NOT NULL,
    subtotal numeric(18,2) DEFAULT 0 NOT NULL,
    discount_amount numeric(18,2) DEFAULT 0 NOT NULL,
    tax_amount numeric(18,2) DEFAULT 0 NOT NULL,
    grand_total numeric(18,2) DEFAULT 0 NOT NULL,
    terms_conditions text,
    remarks text,
    created_by integer,
    updated_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT purchase_orders_amounts_check CHECK (((subtotal >= (0)::numeric) AND (discount_amount >= (0)::numeric) AND (tax_amount >= (0)::numeric) AND (grand_total >= (0)::numeric))),
    CONSTRAINT purchase_orders_exchange_rate_check CHECK ((exchange_rate > (0)::numeric)),
    CONSTRAINT purchase_orders_expected_date_check CHECK (((expected_delivery_date IS NULL) OR (expected_delivery_date >= order_date))),
    CONSTRAINT purchase_orders_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'PENDING'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying, 'CLOSED'::character varying, 'CANCELLED'::character varying])::text[])))
);


--
-- Name: purchase_orders_purchase_order_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_orders_purchase_order_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_orders_purchase_order_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_orders_purchase_order_id_seq OWNED BY public.purchase_orders.purchase_order_id;


--
-- Name: purchase_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_payments (
    payment_id integer NOT NULL,
    payment_number character varying(50) NOT NULL,
    purchase_id integer NOT NULL,
    supplier_id integer NOT NULL,
    payment_date date DEFAULT CURRENT_DATE NOT NULL,
    amount numeric(14,2) NOT NULL,
    payment_method character varying(30) DEFAULT 'CASH'::character varying NOT NULL,
    reference_number character varying(100),
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT purchase_payments_amount_check CHECK ((amount > (0)::numeric))
);


--
-- Name: purchase_payments_payment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_payments_payment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_payments_payment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_payments_payment_id_seq OWNED BY public.purchase_payments.payment_id;


--
-- Name: purchase_quotation_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_quotation_items (
    purchase_quotation_item_id integer NOT NULL,
    purchase_quotation_id integer NOT NULL,
    product_id integer,
    rfq_item_id integer,
    item_description text NOT NULL,
    uom character varying(50),
    quantity numeric(18,4) NOT NULL,
    unit_price numeric(18,4) DEFAULT 0 NOT NULL,
    discount_amount numeric(18,2) DEFAULT 0 NOT NULL,
    tax_rate numeric(8,4) DEFAULT 0 NOT NULL,
    tax_amount numeric(18,2) DEFAULT 0 NOT NULL,
    line_total numeric(18,2) DEFAULT 0 NOT NULL,
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT purchase_quotation_items_discount_amount_check CHECK ((discount_amount >= (0)::numeric)),
    CONSTRAINT purchase_quotation_items_quantity_check CHECK ((quantity > (0)::numeric)),
    CONSTRAINT purchase_quotation_items_tax_rate_check CHECK ((tax_rate >= (0)::numeric)),
    CONSTRAINT purchase_quotation_items_unit_price_check CHECK ((unit_price >= (0)::numeric))
);


--
-- Name: purchase_quotation_items_purchase_quotation_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_quotation_items_purchase_quotation_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_quotation_items_purchase_quotation_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_quotation_items_purchase_quotation_item_id_seq OWNED BY public.purchase_quotation_items.purchase_quotation_item_id;


--
-- Name: purchase_quotations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_quotations (
    purchase_quotation_id integer NOT NULL,
    quotation_number character varying(50) NOT NULL,
    company_id integer NOT NULL,
    supplier_id integer NOT NULL,
    source_type character varying(20) DEFAULT 'MANUAL'::character varying NOT NULL,
    rfq_id integer,
    rfq_vendor_id integer,
    quotation_date date DEFAULT CURRENT_DATE NOT NULL,
    valid_until date,
    status character varying(20) DEFAULT 'DRAFT'::character varying NOT NULL,
    currency_code character varying(10) DEFAULT 'PKR'::character varying NOT NULL,
    exchange_rate numeric(18,6) DEFAULT 1 NOT NULL,
    subtotal numeric(18,2) DEFAULT 0 NOT NULL,
    discount_amount numeric(18,2) DEFAULT 0 NOT NULL,
    tax_amount numeric(18,2) DEFAULT 0 NOT NULL,
    grand_total numeric(18,2) DEFAULT 0 NOT NULL,
    terms_conditions text,
    remarks text,
    created_by integer,
    updated_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT purchase_quotations_exchange_rate_check CHECK ((exchange_rate > (0)::numeric)),
    CONSTRAINT purchase_quotations_source_check CHECK (((((source_type)::text = 'MANUAL'::text) AND (rfq_id IS NULL) AND (rfq_vendor_id IS NULL)) OR (((source_type)::text = 'RFQ'::text) AND (rfq_id IS NOT NULL) AND (rfq_vendor_id IS NOT NULL)))),
    CONSTRAINT purchase_quotations_source_type_check CHECK (((source_type)::text = ANY ((ARRAY['MANUAL'::character varying, 'RFQ'::character varying])::text[]))),
    CONSTRAINT purchase_quotations_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'PENDING'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying, 'CONVERTED'::character varying, 'CANCELLED'::character varying])::text[])))
);


--
-- Name: purchase_quotations_purchase_quotation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_quotations_purchase_quotation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_quotations_purchase_quotation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_quotations_purchase_quotation_id_seq OWNED BY public.purchase_quotations.purchase_quotation_id;


--
-- Name: purchase_requisition_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_requisition_attachments (
    attachment_id integer NOT NULL,
    requisition_id integer NOT NULL,
    file_name character varying(255) NOT NULL,
    file_path text NOT NULL,
    uploaded_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: purchase_requisition_attachments_attachment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_requisition_attachments_attachment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_requisition_attachments_attachment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_requisition_attachments_attachment_id_seq OWNED BY public.purchase_requisition_attachments.attachment_id;


--
-- Name: purchase_requisition_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_requisition_items (
    requisition_item_id integer NOT NULL,
    requisition_id integer NOT NULL,
    product_id integer,
    item_description text,
    item_balance numeric(18,3) DEFAULT 0,
    uom character varying(50),
    quantity numeric(18,3) NOT NULL,
    memo text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT purchase_requisition_items_quantity_check CHECK ((quantity > (0)::numeric))
);


--
-- Name: purchase_requisition_items_requisition_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_requisition_items_requisition_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_requisition_items_requisition_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_requisition_items_requisition_item_id_seq OWNED BY public.purchase_requisition_items.requisition_item_id;


--
-- Name: purchase_requisition_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_requisition_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_requisition_related_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_requisition_related_transactions (
    related_transaction_id integer CONSTRAINT purchase_requisition_related_tr_related_transaction_id_not_null NOT NULL,
    requisition_id integer CONSTRAINT purchase_requisition_related_transactio_requisition_id_not_null NOT NULL,
    transaction_type character varying(50) CONSTRAINT purchase_requisition_related_transact_transaction_type_not_null NOT NULL,
    transaction_id integer,
    transaction_number character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: purchase_requisition_related_transac_related_transaction_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_requisition_related_transac_related_transaction_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_requisition_related_transac_related_transaction_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_requisition_related_transac_related_transaction_id_seq OWNED BY public.purchase_requisition_related_transactions.related_transaction_id;


--
-- Name: purchase_requisitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_requisitions (
    requisition_id integer NOT NULL,
    company_id integer NOT NULL,
    transaction_number character varying(50) NOT NULL,
    transaction_date date DEFAULT CURRENT_DATE NOT NULL,
    status character varying(20) DEFAULT 'DRAFT'::character varying NOT NULL,
    warehouse_id integer,
    department character varying(150),
    class_name character varying(150),
    project character varying(150),
    memo text,
    reference_number character varying(100),
    document_status character varying(100) DEFAULT 'Pending Purchase Order / RFQ'::character varying NOT NULL,
    created_by integer,
    updated_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT purchase_requisitions_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'SUBMITTED'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying])::text[])))
);


--
-- Name: purchase_requisitions_requisition_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_requisitions_requisition_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_requisitions_requisition_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_requisitions_requisition_id_seq OWNED BY public.purchase_requisitions.requisition_id;


--
-- Name: purchases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchases (
    purchase_id integer NOT NULL,
    purchase_number character varying(50) NOT NULL,
    supplier_id integer NOT NULL,
    warehouse_id integer NOT NULL,
    purchase_date date DEFAULT CURRENT_DATE NOT NULL,
    subtotal numeric(14,2) DEFAULT 0 NOT NULL,
    discount numeric(14,2) DEFAULT 0 NOT NULL,
    tax numeric(14,2) DEFAULT 0 NOT NULL,
    total_amount numeric(14,2) DEFAULT 0 NOT NULL,
    paid_amount numeric(14,2) DEFAULT 0 NOT NULL,
    balance_amount numeric(14,2) DEFAULT 0 NOT NULL,
    status character varying(30) DEFAULT 'UNPAID'::character varying NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    document_status character varying(20) DEFAULT 'APPROVED'::character varying,
    source_type character varying(20) DEFAULT 'MANUAL'::character varying,
    item_receipt_id integer,
    approved_at timestamp without time zone,
    approved_by integer,
    company_id integer NOT NULL,
    CONSTRAINT purchases_document_status_check CHECK (((document_status)::text = ANY ((ARRAY['DRAFT'::character varying, 'APPROVED'::character varying, 'CANCELLED'::character varying])::text[]))),
    CONSTRAINT purchases_source_type_check CHECK (((source_type)::text = ANY ((ARRAY['MANUAL'::character varying, 'ITEM_RECEIPT'::character varying])::text[])))
);


--
-- Name: purchases_purchase_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchases_purchase_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchases_purchase_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchases_purchase_id_seq OWNED BY public.purchases.purchase_id;


--
-- Name: rfq_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rfq_items (
    rfq_item_id integer NOT NULL,
    rfq_id integer NOT NULL,
    source_requisition_id integer,
    source_requisition_item_id integer,
    product_id integer,
    item_description text,
    uom character varying(50),
    quantity numeric(18,3) NOT NULL,
    department character varying(150),
    class_name character varying(150),
    warehouse_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    source_type character varying(30) DEFAULT 'PURCHASE_REQUISITION'::character varying NOT NULL,
    procurement_requisition_id integer,
    procurement_requisition_item_id integer,
    CONSTRAINT rfq_items_quantity_check CHECK ((quantity > (0)::numeric)),
    CONSTRAINT rfq_items_source_type_check CHECK (((((source_type)::text = 'PURCHASE_REQUISITION'::text) AND (source_requisition_id IS NOT NULL) AND (source_requisition_item_id IS NOT NULL) AND (procurement_requisition_id IS NULL) AND (procurement_requisition_item_id IS NULL)) OR (((source_type)::text = 'PROCUREMENT_REQUISITION'::text) AND (source_requisition_id IS NOT NULL) AND (source_requisition_item_id IS NOT NULL) AND (procurement_requisition_id IS NOT NULL) AND (procurement_requisition_item_id IS NOT NULL)) OR (((source_type)::text = 'DIRECT'::text) AND (source_requisition_id IS NULL) AND (source_requisition_item_id IS NULL) AND (procurement_requisition_id IS NULL) AND (procurement_requisition_item_id IS NULL) AND (product_id IS NOT NULL))))
);


--
-- Name: rfq_items_rfq_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.rfq_items ALTER COLUMN rfq_item_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.rfq_items_rfq_item_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: rfq_vendor_quotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rfq_vendor_quotes (
    rfq_vendor_quote_id integer NOT NULL,
    rfq_vendor_id integer NOT NULL,
    rfq_item_id integer NOT NULL,
    quoted_quantity numeric(18,3) DEFAULT 0 NOT NULL,
    unit_price numeric(18,4) DEFAULT 0 NOT NULL,
    tax_rate numeric(8,3) DEFAULT 0 NOT NULL,
    discount_amount numeric(18,4) DEFAULT 0 NOT NULL,
    currency_code character varying(10) DEFAULT 'PKR'::character varying NOT NULL,
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT rfq_vendor_quotes_discount_amount_check CHECK ((discount_amount >= (0)::numeric)),
    CONSTRAINT rfq_vendor_quotes_quoted_quantity_check CHECK ((quoted_quantity >= (0)::numeric)),
    CONSTRAINT rfq_vendor_quotes_tax_rate_check CHECK ((tax_rate >= (0)::numeric)),
    CONSTRAINT rfq_vendor_quotes_unit_price_check CHECK ((unit_price >= (0)::numeric))
);


--
-- Name: rfq_vendor_quotes_rfq_vendor_quote_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.rfq_vendor_quotes ALTER COLUMN rfq_vendor_quote_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.rfq_vendor_quotes_rfq_vendor_quote_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: rfq_vendors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rfq_vendors (
    rfq_vendor_id integer NOT NULL,
    rfq_id integer NOT NULL,
    supplier_id integer NOT NULL,
    status character varying(30) DEFAULT 'INVITED'::character varying NOT NULL,
    response_date date,
    validity_date date,
    delivery_days integer,
    payment_terms text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT rfq_vendors_status_check CHECK (((status)::text = ANY ((ARRAY['INVITED'::character varying, 'RESPONDED'::character varying, 'DECLINED'::character varying])::text[])))
);


--
-- Name: rfq_vendors_rfq_vendor_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.rfq_vendors ALTER COLUMN rfq_vendor_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.rfq_vendors_rfq_vendor_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: rfqs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rfqs (
    rfq_id integer NOT NULL,
    company_id integer NOT NULL,
    transaction_number character varying(50) NOT NULL,
    transaction_date date DEFAULT CURRENT_DATE NOT NULL,
    status character varying(30) DEFAULT 'DRAFT'::character varying NOT NULL,
    memo text,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    project character varying(150),
    reference_number character varying(100),
    CONSTRAINT rfqs_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'APPROVED'::character varying, 'SENT'::character varying, 'PARTIALLY_RECEIVED'::character varying, 'RECEIVED'::character varying, 'CLOSED'::character varying, 'CANCELLED'::character varying])::text[])))
);


--
-- Name: rfqs_rfq_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.rfqs ALTER COLUMN rfq_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.rfqs_rfq_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    role_permission_id integer NOT NULL,
    role_id integer NOT NULL,
    permission_id integer NOT NULL,
    can_view boolean DEFAULT false NOT NULL,
    can_create boolean DEFAULT false NOT NULL,
    can_update boolean DEFAULT false NOT NULL,
    can_delete boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: role_permissions_role_permission_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.role_permissions_role_permission_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: role_permissions_role_permission_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.role_permissions_role_permission_id_seq OWNED BY public.role_permissions.role_permission_id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    role_id integer NOT NULL,
    role_name character varying(50) NOT NULL,
    description character varying(255),
    is_system_role boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    company_id integer
);


--
-- Name: roles_role_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_role_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_role_id_seq OWNED BY public.roles.role_id;


--
-- Name: sales_invoice_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_invoice_items (
    invoice_item_id integer NOT NULL,
    invoice_id integer NOT NULL,
    product_id integer NOT NULL,
    quantity numeric(14,3) NOT NULL,
    unit_price numeric(14,2) DEFAULT 0 NOT NULL,
    discount numeric(14,2) DEFAULT 0 NOT NULL,
    tax numeric(14,2) DEFAULT 0 NOT NULL,
    line_total numeric(14,2) DEFAULT 0 NOT NULL,
    sub_product_id integer,
    CONSTRAINT sales_invoice_items_quantity_check CHECK ((quantity > (0)::numeric))
);


--
-- Name: sales_invoice_items_invoice_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_invoice_items_invoice_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_invoice_items_invoice_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sales_invoice_items_invoice_item_id_seq OWNED BY public.sales_invoice_items.invoice_item_id;


--
-- Name: sales_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_invoices (
    invoice_id integer NOT NULL,
    invoice_number character varying(50) NOT NULL,
    customer_id integer NOT NULL,
    warehouse_id integer NOT NULL,
    invoice_date date DEFAULT CURRENT_DATE NOT NULL,
    subtotal numeric(14,2) DEFAULT 0 NOT NULL,
    discount numeric(14,2) DEFAULT 0 NOT NULL,
    tax numeric(14,2) DEFAULT 0 NOT NULL,
    total_amount numeric(14,2) DEFAULT 0 NOT NULL,
    paid_amount numeric(14,2) DEFAULT 0 NOT NULL,
    balance_amount numeric(14,2) DEFAULT 0 NOT NULL,
    status character varying(30) DEFAULT 'UNPAID'::character varying NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    delivery_challan_id integer,
    company_id integer
);


--
-- Name: sales_invoices_invoice_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_invoices_invoice_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_invoices_invoice_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sales_invoices_invoice_id_seq OWNED BY public.sales_invoices.invoice_id;


--
-- Name: sales_order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_order_items (
    order_item_id bigint NOT NULL,
    order_id bigint NOT NULL,
    product_id integer,
    item_name character varying(255) NOT NULL,
    item_description text,
    item_balance numeric(18,3) DEFAULT 0 NOT NULL,
    uom character varying(50),
    quantity numeric(18,3) DEFAULT 0 NOT NULL,
    retail_price numeric(18,2) DEFAULT 0 NOT NULL,
    discount_percent numeric(7,3) DEFAULT 0 NOT NULL,
    unit_price numeric(18,2) DEFAULT 0 NOT NULL,
    amount numeric(18,2) DEFAULT 0 NOT NULL,
    tax_code character varying(100),
    tax_rate numeric(7,3) DEFAULT 0 NOT NULL,
    tax_amount numeric(18,2) DEFAULT 0 NOT NULL,
    gross_amount numeric(18,2) DEFAULT 0 NOT NULL,
    memo text,
    line_number integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT sales_order_items_amounts_nonnegative CHECK (((retail_price >= (0)::numeric) AND (unit_price >= (0)::numeric) AND (amount >= (0)::numeric) AND (tax_amount >= (0)::numeric) AND (gross_amount >= (0)::numeric))),
    CONSTRAINT sales_order_items_discount_valid CHECK (((discount_percent >= (0)::numeric) AND (discount_percent <= (100)::numeric))),
    CONSTRAINT sales_order_items_quantity_nonnegative CHECK ((quantity >= (0)::numeric)),
    CONSTRAINT sales_order_items_tax_rate_nonnegative CHECK ((tax_rate >= (0)::numeric))
);


--
-- Name: sales_order_items_order_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.sales_order_items ALTER COLUMN order_item_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.sales_order_items_order_item_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sales_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_orders (
    order_id bigint NOT NULL,
    company_id integer NOT NULL,
    order_number character varying(50) NOT NULL,
    source_quotation_id bigint,
    customer_id integer,
    warehouse_id integer,
    transaction_date date DEFAULT CURRENT_DATE NOT NULL,
    status character varying(30) DEFAULT 'DRAFT'::character varying NOT NULL,
    document_status character varying(50) DEFAULT 'Pending Delivery Challan'::character varying NOT NULL,
    department character varying(150),
    project character varying(150),
    order_class character varying(150),
    sales_rep character varying(150),
    payment_term character varying(100),
    memo text,
    terms_conditions text,
    currency character varying(10) DEFAULT 'PKR'::character varying NOT NULL,
    exchange_rate numeric(18,6) DEFAULT 1 NOT NULL,
    subtotal numeric(18,2) DEFAULT 0 NOT NULL,
    tax_amount numeric(18,2) DEFAULT 0 NOT NULL,
    gross_amount numeric(18,2) DEFAULT 0 NOT NULL,
    customer_credit_limit numeric(18,2) DEFAULT 0 NOT NULL,
    customer_balance numeric(18,2) DEFAULT 0 NOT NULL,
    available_credit_limit numeric(18,2) DEFAULT 0 NOT NULL,
    related_transaction text,
    attachment_name character varying(255),
    attachment_url text,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT sales_orders_amounts_nonnegative CHECK (((subtotal >= (0)::numeric) AND (tax_amount >= (0)::numeric) AND (gross_amount >= (0)::numeric))),
    CONSTRAINT sales_orders_exchange_rate_positive CHECK ((exchange_rate > (0)::numeric))
);


--
-- Name: sales_orders_order_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.sales_orders ALTER COLUMN order_id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.sales_orders_order_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sales_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_payments (
    payment_id integer NOT NULL,
    payment_number character varying(50) NOT NULL,
    invoice_id integer NOT NULL,
    customer_id integer NOT NULL,
    payment_date date DEFAULT CURRENT_DATE NOT NULL,
    amount numeric(14,2) NOT NULL,
    payment_method character varying(30) DEFAULT 'CASH'::character varying NOT NULL,
    reference_number character varying(100),
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    account_id integer,
    company_id integer,
    CONSTRAINT sales_payments_amount_check CHECK ((amount > (0)::numeric))
);


--
-- Name: sales_payments_payment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_payments_payment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_payments_payment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sales_payments_payment_id_seq OWNED BY public.sales_payments.payment_id;


--
-- Name: sales_quotation_counters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_quotation_counters (
    company_id integer NOT NULL,
    last_number bigint DEFAULT 0 NOT NULL
);


--
-- Name: sales_quotation_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_quotation_items (
    quotation_item_id bigint NOT NULL,
    quotation_id bigint NOT NULL,
    product_id integer,
    item_name character varying(255) NOT NULL,
    item_description text,
    item_balance numeric(18,4) DEFAULT 0 NOT NULL,
    uom character varying(50),
    quantity numeric(18,4) DEFAULT 1 NOT NULL,
    unit_price numeric(18,4) DEFAULT 0 NOT NULL,
    amount numeric(18,2) DEFAULT 0 NOT NULL,
    tax_code character varying(100),
    tax_rate numeric(8,4) DEFAULT 0 NOT NULL,
    tax_amount numeric(18,2) DEFAULT 0 NOT NULL,
    gross_amount numeric(18,2) DEFAULT 0 NOT NULL,
    memo text,
    line_number integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: sales_quotation_items_quotation_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_quotation_items_quotation_item_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_quotation_items_quotation_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sales_quotation_items_quotation_item_id_seq OWNED BY public.sales_quotation_items.quotation_item_id;


--
-- Name: sales_quotations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_quotations (
    quotation_id bigint NOT NULL,
    company_id integer NOT NULL,
    quotation_number character varying(50) NOT NULL,
    customer_id integer,
    warehouse_id integer,
    quotation_date date DEFAULT CURRENT_DATE NOT NULL,
    expiry_date date,
    status character varying(30) DEFAULT 'Draft'::character varying NOT NULL,
    department character varying(150),
    project character varying(150),
    quotation_class character varying(150),
    sales_rep character varying(150),
    payment_term character varying(100),
    memo text,
    terms_conditions text,
    subtotal numeric(18,2) DEFAULT 0 NOT NULL,
    tax_amount numeric(18,2) DEFAULT 0 NOT NULL,
    gross_amount numeric(18,2) DEFAULT 0 NOT NULL,
    related_transaction text,
    attachment_name character varying(255),
    attachment_url text,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT sales_quotations_status_check CHECK (((status)::text = ANY ((ARRAY['Draft'::character varying, 'Approved'::character varying, 'Rejected'::character varying, 'Expired'::character varying, 'Converted'::character varying])::text[])))
);


--
-- Name: sales_quotations_quotation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_quotations_quotation_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_quotations_quotation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sales_quotations_quotation_id_seq OWNED BY public.sales_quotations.quotation_id;


--
-- Name: sales_return_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_return_items (
    return_item_id bigint NOT NULL,
    return_id bigint NOT NULL,
    invoice_item_id integer,
    product_id integer NOT NULL,
    sub_product_id integer,
    description text,
    quantity numeric(18,4) NOT NULL,
    unit_price numeric(18,4) DEFAULT 0 NOT NULL,
    discount numeric(18,2) DEFAULT 0 NOT NULL,
    tax numeric(18,2) DEFAULT 0 NOT NULL,
    line_total numeric(18,2) DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT sales_return_items_amount_check CHECK (((unit_price >= (0)::numeric) AND (discount >= (0)::numeric) AND (tax >= (0)::numeric) AND (line_total >= (0)::numeric))),
    CONSTRAINT sales_return_items_quantity_check CHECK ((quantity > (0)::numeric))
);


--
-- Name: sales_return_items_return_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_return_items_return_item_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_return_items_return_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sales_return_items_return_item_id_seq OWNED BY public.sales_return_items.return_item_id;


--
-- Name: sales_returns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_returns (
    return_id bigint NOT NULL,
    return_number character varying(50) NOT NULL,
    company_id integer NOT NULL,
    invoice_id integer,
    customer_id integer NOT NULL,
    warehouse_id integer NOT NULL,
    return_date date DEFAULT CURRENT_DATE NOT NULL,
    status character varying(20) DEFAULT 'DRAFT'::character varying NOT NULL,
    subtotal numeric(18,2) DEFAULT 0 NOT NULL,
    discount numeric(18,2) DEFAULT 0 NOT NULL,
    tax numeric(18,2) DEFAULT 0 NOT NULL,
    total_amount numeric(18,2) DEFAULT 0 NOT NULL,
    refund_method character varying(30) DEFAULT 'CUSTOMER_CREDIT'::character varying NOT NULL,
    refund_amount numeric(18,2) DEFAULT 0 NOT NULL,
    notes text,
    created_by integer,
    approved_by integer,
    approved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    refund_account_id integer,
    CONSTRAINT sales_returns_amount_check CHECK (((subtotal >= (0)::numeric) AND (discount >= (0)::numeric) AND (tax >= (0)::numeric) AND (total_amount >= (0)::numeric) AND (refund_amount >= (0)::numeric))),
    CONSTRAINT sales_returns_refund_method_check CHECK (((refund_method)::text = ANY ((ARRAY['CUSTOMER_CREDIT'::character varying, 'CASH'::character varying, 'BANK'::character varying])::text[]))),
    CONSTRAINT sales_returns_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying, 'CANCELLED'::character varying])::text[])))
);


--
-- Name: sales_returns_return_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_returns_return_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_returns_return_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sales_returns_return_id_seq OWNED BY public.sales_returns.return_id;


--
-- Name: stock; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock (
    stock_id integer NOT NULL,
    product_id integer NOT NULL,
    warehouse_id integer NOT NULL,
    quantity numeric(14,3) DEFAULT 0 NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    company_id integer
);


--
-- Name: stock_adjustment_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_adjustment_items (
    adjustment_item_id integer NOT NULL,
    adjustment_id integer NOT NULL,
    product_id integer NOT NULL,
    quantity numeric(14,3) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT stock_adjustment_items_quantity_check CHECK ((quantity > (0)::numeric))
);


--
-- Name: stock_adjustment_items_adjustment_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stock_adjustment_items_adjustment_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_adjustment_items_adjustment_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stock_adjustment_items_adjustment_item_id_seq OWNED BY public.stock_adjustment_items.adjustment_item_id;


--
-- Name: stock_adjustments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_adjustments (
    adjustment_id integer NOT NULL,
    product_id integer,
    warehouse_id integer NOT NULL,
    adjustment_type character varying(20) NOT NULL,
    quantity numeric(14,3),
    reason character varying(255),
    notes text,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    reference_number character varying(100),
    CONSTRAINT stock_adjustments_adjustment_type_check CHECK (((adjustment_type)::text = ANY ((ARRAY['INCREASE'::character varying, 'DECREASE'::character varying])::text[]))),
    CONSTRAINT stock_adjustments_quantity_check CHECK ((quantity > (0)::numeric))
);


--
-- Name: stock_adjustments_adjustment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stock_adjustments_adjustment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_adjustments_adjustment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stock_adjustments_adjustment_id_seq OWNED BY public.stock_adjustments.adjustment_id;


--
-- Name: stock_stock_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stock_stock_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_stock_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stock_stock_id_seq OWNED BY public.stock.stock_id;


--
-- Name: sub_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sub_products (
    sub_product_id integer NOT NULL,
    product_id integer NOT NULL,
    sku character varying(100) NOT NULL,
    sub_product_name character varying(200) NOT NULL,
    description text,
    unit character varying(50) DEFAULT 'PCS'::character varying NOT NULL,
    cost_price numeric(14,2) DEFAULT 0 NOT NULL,
    sale_price numeric(14,2) DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    color character varying(100),
    size character varying(100),
    design character varying(150),
    barcode character varying(100),
    units_per_parent numeric(14,3) DEFAULT 1 NOT NULL
);


--
-- Name: sub_products_sub_product_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sub_products_sub_product_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sub_products_sub_product_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sub_products_sub_product_id_seq OWNED BY public.sub_products.sub_product_id;


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suppliers (
    supplier_id integer NOT NULL,
    supplier_code character varying(50) NOT NULL,
    supplier_name character varying(150) NOT NULL,
    phone character varying(50),
    email character varying(150),
    address text,
    opening_balance numeric(14,2) DEFAULT 0 NOT NULL,
    credit_limit numeric(14,2) DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: suppliers_supplier_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.suppliers_supplier_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: suppliers_supplier_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.suppliers_supplier_id_seq OWNED BY public.suppliers.supplier_id;


--
-- Name: unit_stock; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unit_stock (
    unit_stock_id integer NOT NULL,
    unit_id integer NOT NULL,
    warehouse_id integer NOT NULL,
    quantity numeric(14,3) DEFAULT 0 NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT unit_stock_quantity_nonnegative CHECK ((quantity >= (0)::numeric))
);


--
-- Name: unit_stock_unit_stock_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.unit_stock_unit_stock_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: unit_stock_unit_stock_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.unit_stock_unit_stock_id_seq OWNED BY public.unit_stock.unit_stock_id;


--
-- Name: units_of_measure; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.units_of_measure (
    unit_id integer NOT NULL,
    unit_code character varying(30) NOT NULL,
    unit_name character varying(100) NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: units_of_measure_unit_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.units_of_measure_unit_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: units_of_measure_unit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.units_of_measure_unit_id_seq OWNED BY public.units_of_measure.unit_id;


--
-- Name: user_companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_companies (
    user_id integer NOT NULL,
    company_id integer NOT NULL,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    role_id integer NOT NULL,
    company_password_hash text
);


--
-- Name: user_login_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_login_history (
    login_id bigint NOT NULL,
    user_id integer NOT NULL,
    company_id integer NOT NULL,
    logged_in_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: user_login_history_login_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.user_login_history ALTER COLUMN login_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.user_login_history_login_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    session_id uuid NOT NULL,
    user_id bigint NOT NULL,
    company_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_activity_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    ip_address text,
    user_agent text
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    user_id integer NOT NULL,
    full_name character varying(150) NOT NULL,
    username character varying(100) NOT NULL,
    email character varying(150),
    password_hash text NOT NULL,
    role_id integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_login timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    company_id integer,
    location character varying(255)
);


--
-- Name: users_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_user_id_seq OWNED BY public.users.user_id;


--
-- Name: warehouses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.warehouses (
    warehouse_id integer NOT NULL,
    warehouse_code character varying(100) NOT NULL,
    warehouse_name character varying(200) NOT NULL,
    location character varying(255),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    description text
);


--
-- Name: warehouses_warehouse_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.warehouses_warehouse_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: warehouses_warehouse_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.warehouses_warehouse_id_seq OWNED BY public.warehouses.warehouse_id;


--
-- Name: audit_logs audit_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN audit_id SET DEFAULT nextval('public.audit_logs_audit_id_seq'::regclass);


--
-- Name: chart_of_accounts account_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chart_of_accounts ALTER COLUMN account_id SET DEFAULT nextval('public.chart_of_accounts_account_id_seq'::regclass);


--
-- Name: companies company_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies ALTER COLUMN company_id SET DEFAULT nextval('public.companies_company_id_seq'::regclass);


--
-- Name: company_settings setting_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_settings ALTER COLUMN setting_id SET DEFAULT nextval('public.company_settings_setting_id_seq'::regclass);


--
-- Name: customers customer_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers ALTER COLUMN customer_id SET DEFAULT nextval('public.customers_customer_id_seq'::regclass);


--
-- Name: inventory_transactions inventory_transaction_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_transactions ALTER COLUMN inventory_transaction_id SET DEFAULT nextval('public.inventory_transactions_inventory_transaction_id_seq'::regclass);


--
-- Name: journal_entries journal_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries ALTER COLUMN journal_id SET DEFAULT nextval('public.journal_entries_journal_id_seq'::regclass);


--
-- Name: journal_entry_lines journal_line_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entry_lines ALTER COLUMN journal_line_id SET DEFAULT nextval('public.journal_entry_lines_journal_line_id_seq'::regclass);


--
-- Name: password_reset_tokens reset_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens ALTER COLUMN reset_id SET DEFAULT nextval('public.password_reset_tokens_reset_id_seq'::regclass);


--
-- Name: permissions permission_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions ALTER COLUMN permission_id SET DEFAULT nextval('public.permissions_permission_id_seq'::regclass);


--
-- Name: procurement_requisition_items procurement_requisition_item_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procurement_requisition_items ALTER COLUMN procurement_requisition_item_id SET DEFAULT nextval('public.procurement_requisition_items_procurement_requisition_item__seq'::regclass);


--
-- Name: procurement_requisitions procurement_requisition_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procurement_requisitions ALTER COLUMN procurement_requisition_id SET DEFAULT nextval('public.procurement_requisitions_procurement_requisition_id_seq'::regclass);


--
-- Name: product_categories category_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories ALTER COLUMN category_id SET DEFAULT nextval('public.product_categories_category_id_seq'::regclass);


--
-- Name: product_units unit_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_units ALTER COLUMN unit_id SET DEFAULT nextval('public.product_units_unit_id_seq'::regclass);


--
-- Name: products product_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products ALTER COLUMN product_id SET DEFAULT nextval('public.products_product_id_seq'::regclass);


--
-- Name: purchase_items purchase_item_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_items ALTER COLUMN purchase_item_id SET DEFAULT nextval('public.purchase_items_purchase_item_id_seq'::regclass);


--
-- Name: purchase_order_items purchase_order_item_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items ALTER COLUMN purchase_order_item_id SET DEFAULT nextval('public.purchase_order_items_purchase_order_item_id_seq'::regclass);


--
-- Name: purchase_orders purchase_order_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders ALTER COLUMN purchase_order_id SET DEFAULT nextval('public.purchase_orders_purchase_order_id_seq'::regclass);


--
-- Name: purchase_payments payment_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_payments ALTER COLUMN payment_id SET DEFAULT nextval('public.purchase_payments_payment_id_seq'::regclass);


--
-- Name: purchase_quotation_items purchase_quotation_item_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_quotation_items ALTER COLUMN purchase_quotation_item_id SET DEFAULT nextval('public.purchase_quotation_items_purchase_quotation_item_id_seq'::regclass);


--
-- Name: purchase_quotations purchase_quotation_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_quotations ALTER COLUMN purchase_quotation_id SET DEFAULT nextval('public.purchase_quotations_purchase_quotation_id_seq'::regclass);


--
-- Name: purchase_requisition_attachments attachment_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requisition_attachments ALTER COLUMN attachment_id SET DEFAULT nextval('public.purchase_requisition_attachments_attachment_id_seq'::regclass);


--
-- Name: purchase_requisition_items requisition_item_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requisition_items ALTER COLUMN requisition_item_id SET DEFAULT nextval('public.purchase_requisition_items_requisition_item_id_seq'::regclass);


--
-- Name: purchase_requisition_related_transactions related_transaction_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requisition_related_transactions ALTER COLUMN related_transaction_id SET DEFAULT nextval('public.purchase_requisition_related_transac_related_transaction_id_seq'::regclass);


--
-- Name: purchase_requisitions requisition_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requisitions ALTER COLUMN requisition_id SET DEFAULT nextval('public.purchase_requisitions_requisition_id_seq'::regclass);


--
-- Name: purchases purchase_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases ALTER COLUMN purchase_id SET DEFAULT nextval('public.purchases_purchase_id_seq'::regclass);


--
-- Name: role_permissions role_permission_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions ALTER COLUMN role_permission_id SET DEFAULT nextval('public.role_permissions_role_permission_id_seq'::regclass);


--
-- Name: roles role_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN role_id SET DEFAULT nextval('public.roles_role_id_seq'::regclass);


--
-- Name: sales_invoice_items invoice_item_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_invoice_items ALTER COLUMN invoice_item_id SET DEFAULT nextval('public.sales_invoice_items_invoice_item_id_seq'::regclass);


--
-- Name: sales_invoices invoice_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_invoices ALTER COLUMN invoice_id SET DEFAULT nextval('public.sales_invoices_invoice_id_seq'::regclass);


--
-- Name: sales_payments payment_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_payments ALTER COLUMN payment_id SET DEFAULT nextval('public.sales_payments_payment_id_seq'::regclass);


--
-- Name: sales_quotation_items quotation_item_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_quotation_items ALTER COLUMN quotation_item_id SET DEFAULT nextval('public.sales_quotation_items_quotation_item_id_seq'::regclass);


--
-- Name: sales_quotations quotation_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_quotations ALTER COLUMN quotation_id SET DEFAULT nextval('public.sales_quotations_quotation_id_seq'::regclass);


--
-- Name: sales_return_items return_item_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_return_items ALTER COLUMN return_item_id SET DEFAULT nextval('public.sales_return_items_return_item_id_seq'::regclass);


--
-- Name: sales_returns return_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_returns ALTER COLUMN return_id SET DEFAULT nextval('public.sales_returns_return_id_seq'::regclass);


--
-- Name: stock stock_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock ALTER COLUMN stock_id SET DEFAULT nextval('public.stock_stock_id_seq'::regclass);


--
-- Name: stock_adjustment_items adjustment_item_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_adjustment_items ALTER COLUMN adjustment_item_id SET DEFAULT nextval('public.stock_adjustment_items_adjustment_item_id_seq'::regclass);


--
-- Name: stock_adjustments adjustment_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_adjustments ALTER COLUMN adjustment_id SET DEFAULT nextval('public.stock_adjustments_adjustment_id_seq'::regclass);


--
-- Name: sub_products sub_product_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_products ALTER COLUMN sub_product_id SET DEFAULT nextval('public.sub_products_sub_product_id_seq'::regclass);


--
-- Name: suppliers supplier_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN supplier_id SET DEFAULT nextval('public.suppliers_supplier_id_seq'::regclass);


--
-- Name: unit_stock unit_stock_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unit_stock ALTER COLUMN unit_stock_id SET DEFAULT nextval('public.unit_stock_unit_stock_id_seq'::regclass);


--
-- Name: units_of_measure unit_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.units_of_measure ALTER COLUMN unit_id SET DEFAULT nextval('public.units_of_measure_unit_id_seq'::regclass);


--
-- Name: users user_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN user_id SET DEFAULT nextval('public.users_user_id_seq'::regclass);


--
-- Name: warehouses warehouse_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouses ALTER COLUMN warehouse_id SET DEFAULT nextval('public.warehouses_warehouse_id_seq'::regclass);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (audit_id);


--
-- Name: chart_of_accounts chart_of_accounts_account_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT chart_of_accounts_account_code_key UNIQUE (account_code);


--
-- Name: chart_of_accounts chart_of_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT chart_of_accounts_pkey PRIMARY KEY (account_id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (company_id);


--
-- Name: company_databases company_databases_database_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_databases
    ADD CONSTRAINT company_databases_database_name_key UNIQUE (database_name);


--
-- Name: company_databases company_databases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_databases
    ADD CONSTRAINT company_databases_pkey PRIMARY KEY (company_id);


--
-- Name: company_settings company_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_settings
    ADD CONSTRAINT company_settings_pkey PRIMARY KEY (setting_id);


--
-- Name: customers customers_customer_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_customer_code_key UNIQUE (customer_code);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (customer_id);


--
-- Name: delivery_challan_items delivery_challan_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_challan_items
    ADD CONSTRAINT delivery_challan_items_pkey PRIMARY KEY (delivery_challan_item_id);


--
-- Name: delivery_challans delivery_challans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_challans
    ADD CONSTRAINT delivery_challans_pkey PRIMARY KEY (delivery_challan_id);


--
-- Name: delivery_challans delivery_challans_transaction_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_challans
    ADD CONSTRAINT delivery_challans_transaction_number_key UNIQUE (transaction_number);


--
-- Name: inventory_transactions inventory_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_pkey PRIMARY KEY (inventory_transaction_id);


--
-- Name: item_receipt_items item_receipt_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_receipt_items
    ADD CONSTRAINT item_receipt_items_pkey PRIMARY KEY (item_receipt_item_id);


--
-- Name: item_receipts item_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_receipts
    ADD CONSTRAINT item_receipts_pkey PRIMARY KEY (item_receipt_id);


--
-- Name: item_receipts item_receipts_receipt_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_receipts
    ADD CONSTRAINT item_receipts_receipt_number_key UNIQUE (receipt_number);


--
-- Name: journal_entries journal_entries_journal_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_journal_number_key UNIQUE (journal_number);


--
-- Name: journal_entries journal_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_pkey PRIMARY KEY (journal_id);


--
-- Name: journal_entry_lines journal_entry_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entry_lines
    ADD CONSTRAINT journal_entry_lines_pkey PRIMARY KEY (journal_line_id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (reset_id);


--
-- Name: password_reset_tokens password_reset_tokens_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_hash_key UNIQUE (token_hash);


--
-- Name: pending_item_receipt_items pending_item_receipt_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_item_receipt_items
    ADD CONSTRAINT pending_item_receipt_items_pkey PRIMARY KEY (pending_item_receipt_item_id);


--
-- Name: pending_item_receipts pending_item_receipt_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_item_receipts
    ADD CONSTRAINT pending_item_receipt_number_unique UNIQUE (company_id, receipt_number);


--
-- Name: pending_item_receipts pending_item_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_item_receipts
    ADD CONSTRAINT pending_item_receipts_pkey PRIMARY KEY (pending_item_receipt_id);


--
-- Name: permissions permissions_permission_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_permission_key_key UNIQUE (permission_key);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (permission_id);


--
-- Name: procurement_requisition_items procurement_requisition_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procurement_requisition_items
    ADD CONSTRAINT procurement_requisition_items_pkey PRIMARY KEY (procurement_requisition_item_id);


--
-- Name: procurement_requisitions procurement_requisitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procurement_requisitions
    ADD CONSTRAINT procurement_requisitions_pkey PRIMARY KEY (procurement_requisition_id);


--
-- Name: product_categories product_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_pkey PRIMARY KEY (category_id);


--
-- Name: product_units product_units_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_units
    ADD CONSTRAINT product_units_name_unique UNIQUE (product_id, unit_name);


--
-- Name: product_units product_units_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_units
    ADD CONSTRAINT product_units_pkey PRIMARY KEY (unit_id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (product_id);


--
-- Name: products products_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_sku_key UNIQUE (sku);


--
-- Name: purchase_items purchase_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_items
    ADD CONSTRAINT purchase_items_pkey PRIMARY KEY (purchase_item_id);


--
-- Name: purchase_order_items purchase_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_pkey PRIMARY KEY (purchase_order_item_id);


--
-- Name: purchase_orders purchase_orders_company_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_company_number_unique UNIQUE (company_id, purchase_order_number);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (purchase_order_id);


--
-- Name: purchase_orders purchase_orders_quotation_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_quotation_unique UNIQUE (purchase_quotation_id);


--
-- Name: purchase_payments purchase_payments_payment_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_payments
    ADD CONSTRAINT purchase_payments_payment_number_key UNIQUE (payment_number);


--
-- Name: purchase_payments purchase_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_payments
    ADD CONSTRAINT purchase_payments_pkey PRIMARY KEY (payment_id);


--
-- Name: purchase_quotation_items purchase_quotation_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_quotation_items
    ADD CONSTRAINT purchase_quotation_items_pkey PRIMARY KEY (purchase_quotation_item_id);


--
-- Name: purchase_quotations purchase_quotations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_quotations
    ADD CONSTRAINT purchase_quotations_pkey PRIMARY KEY (purchase_quotation_id);


--
-- Name: purchase_requisition_attachments purchase_requisition_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requisition_attachments
    ADD CONSTRAINT purchase_requisition_attachments_pkey PRIMARY KEY (attachment_id);


--
-- Name: purchase_requisition_items purchase_requisition_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requisition_items
    ADD CONSTRAINT purchase_requisition_items_pkey PRIMARY KEY (requisition_item_id);


--
-- Name: purchase_requisition_related_transactions purchase_requisition_related_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requisition_related_transactions
    ADD CONSTRAINT purchase_requisition_related_transactions_pkey PRIMARY KEY (related_transaction_id);


--
-- Name: purchase_requisitions purchase_requisitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requisitions
    ADD CONSTRAINT purchase_requisitions_pkey PRIMARY KEY (requisition_id);


--
-- Name: purchases purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_pkey PRIMARY KEY (purchase_id);


--
-- Name: purchases purchases_purchase_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_purchase_number_key UNIQUE (purchase_number);


--
-- Name: rfq_items rfq_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_items
    ADD CONSTRAINT rfq_items_pkey PRIMARY KEY (rfq_item_id);


--
-- Name: rfq_items rfq_items_source_requisition_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_items
    ADD CONSTRAINT rfq_items_source_requisition_item_id_key UNIQUE (source_requisition_item_id);


--
-- Name: rfq_vendor_quotes rfq_vendor_quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_vendor_quotes
    ADD CONSTRAINT rfq_vendor_quotes_pkey PRIMARY KEY (rfq_vendor_quote_id);


--
-- Name: rfq_vendor_quotes rfq_vendor_quotes_rfq_vendor_id_rfq_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_vendor_quotes
    ADD CONSTRAINT rfq_vendor_quotes_rfq_vendor_id_rfq_item_id_key UNIQUE (rfq_vendor_id, rfq_item_id);


--
-- Name: rfq_vendors rfq_vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_vendors
    ADD CONSTRAINT rfq_vendors_pkey PRIMARY KEY (rfq_vendor_id);


--
-- Name: rfq_vendors rfq_vendors_rfq_id_supplier_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_vendors
    ADD CONSTRAINT rfq_vendors_rfq_id_supplier_id_key UNIQUE (rfq_id, supplier_id);


--
-- Name: rfqs rfqs_company_id_transaction_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfqs
    ADD CONSTRAINT rfqs_company_id_transaction_number_key UNIQUE (company_id, transaction_number);


--
-- Name: rfqs rfqs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfqs
    ADD CONSTRAINT rfqs_pkey PRIMARY KEY (rfq_id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_permission_id);


--
-- Name: role_permissions role_permissions_role_id_permission_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_permission_id_key UNIQUE (role_id, permission_id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (role_id);


--
-- Name: sales_invoice_items sales_invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_invoice_items
    ADD CONSTRAINT sales_invoice_items_pkey PRIMARY KEY (invoice_item_id);


--
-- Name: sales_invoices sales_invoices_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT sales_invoices_invoice_number_key UNIQUE (invoice_number);


--
-- Name: sales_invoices sales_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT sales_invoices_pkey PRIMARY KEY (invoice_id);


--
-- Name: sales_order_items sales_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_order_items
    ADD CONSTRAINT sales_order_items_pkey PRIMARY KEY (order_item_id);


--
-- Name: sales_orders sales_orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_order_number_key UNIQUE (order_number);


--
-- Name: sales_orders sales_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_pkey PRIMARY KEY (order_id);


--
-- Name: sales_orders sales_orders_source_quotation_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_source_quotation_id_key UNIQUE (source_quotation_id);


--
-- Name: sales_payments sales_payments_payment_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_payments
    ADD CONSTRAINT sales_payments_payment_number_key UNIQUE (payment_number);


--
-- Name: sales_payments sales_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_payments
    ADD CONSTRAINT sales_payments_pkey PRIMARY KEY (payment_id);


--
-- Name: sales_quotation_counters sales_quotation_counters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_quotation_counters
    ADD CONSTRAINT sales_quotation_counters_pkey PRIMARY KEY (company_id);


--
-- Name: sales_quotation_items sales_quotation_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_quotation_items
    ADD CONSTRAINT sales_quotation_items_pkey PRIMARY KEY (quotation_item_id);


--
-- Name: sales_quotations sales_quotations_company_id_quotation_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_quotations
    ADD CONSTRAINT sales_quotations_company_id_quotation_number_key UNIQUE (company_id, quotation_number);


--
-- Name: sales_quotations sales_quotations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_quotations
    ADD CONSTRAINT sales_quotations_pkey PRIMARY KEY (quotation_id);


--
-- Name: sales_return_items sales_return_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_return_items
    ADD CONSTRAINT sales_return_items_pkey PRIMARY KEY (return_item_id);


--
-- Name: sales_returns sales_returns_company_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_returns
    ADD CONSTRAINT sales_returns_company_number_unique UNIQUE (company_id, return_number);


--
-- Name: sales_returns sales_returns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_returns
    ADD CONSTRAINT sales_returns_pkey PRIMARY KEY (return_id);


--
-- Name: stock_adjustment_items stock_adjustment_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_adjustment_items
    ADD CONSTRAINT stock_adjustment_items_pkey PRIMARY KEY (adjustment_item_id);


--
-- Name: stock_adjustments stock_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_adjustments
    ADD CONSTRAINT stock_adjustments_pkey PRIMARY KEY (adjustment_id);


--
-- Name: stock stock_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock
    ADD CONSTRAINT stock_pkey PRIMARY KEY (stock_id);


--
-- Name: stock stock_product_id_warehouse_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock
    ADD CONSTRAINT stock_product_id_warehouse_id_key UNIQUE (product_id, warehouse_id);


--
-- Name: sub_products sub_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_products
    ADD CONSTRAINT sub_products_pkey PRIMARY KEY (sub_product_id);


--
-- Name: sub_products sub_products_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_products
    ADD CONSTRAINT sub_products_sku_key UNIQUE (sku);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (supplier_id);


--
-- Name: suppliers suppliers_supplier_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_supplier_code_key UNIQUE (supplier_code);


--
-- Name: unit_stock unit_stock_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unit_stock
    ADD CONSTRAINT unit_stock_pkey PRIMARY KEY (unit_stock_id);


--
-- Name: unit_stock unit_stock_unit_warehouse_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unit_stock
    ADD CONSTRAINT unit_stock_unit_warehouse_unique UNIQUE (unit_id, warehouse_id);


--
-- Name: units_of_measure units_of_measure_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.units_of_measure
    ADD CONSTRAINT units_of_measure_pkey PRIMARY KEY (unit_id);


--
-- Name: procurement_requisitions uq_procurement_requisition_company_number; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procurement_requisitions
    ADD CONSTRAINT uq_procurement_requisition_company_number UNIQUE (company_id, transaction_number);


--
-- Name: procurement_requisition_items uq_procurement_source_item; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procurement_requisition_items
    ADD CONSTRAINT uq_procurement_source_item UNIQUE (source_requisition_item_id);


--
-- Name: purchase_requisitions uq_purchase_requisition_company_number; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requisitions
    ADD CONSTRAINT uq_purchase_requisition_company_number UNIQUE (company_id, transaction_number);


--
-- Name: user_companies user_companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_companies
    ADD CONSTRAINT user_companies_pkey PRIMARY KEY (user_id, company_id);


--
-- Name: user_login_history user_login_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_login_history
    ADD CONSTRAINT user_login_history_pkey PRIMARY KEY (login_id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (session_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: warehouses warehouses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_pkey PRIMARY KEY (warehouse_id);


--
-- Name: warehouses warehouses_warehouse_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_warehouse_code_key UNIQUE (warehouse_code);


--
-- Name: companies_company_name_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX companies_company_name_unique_idx ON public.companies USING btree (lower(regexp_replace(btrim((company_name)::text), '[[:space:]]+'::text, ' '::text, 'g'::text)));


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at);


--
-- Name: idx_audit_logs_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_module ON public.audit_logs USING btree (module);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_delivery_challan_items_header; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_challan_items_header ON public.delivery_challan_items USING btree (delivery_challan_id);


--
-- Name: idx_delivery_challan_items_source_line; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_challan_items_source_line ON public.delivery_challan_items USING btree (source_order_item_id);


--
-- Name: idx_delivery_challans_company_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_challans_company_date ON public.delivery_challans USING btree (company_id, transaction_date DESC);


--
-- Name: idx_delivery_challans_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_challans_customer ON public.delivery_challans USING btree (customer_id);


--
-- Name: idx_delivery_challans_source_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_challans_source_order ON public.delivery_challans USING btree (source_order_id);


--
-- Name: idx_delivery_challans_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_challans_status ON public.delivery_challans USING btree (status, document_status);


--
-- Name: idx_inventory_transactions_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_transactions_company ON public.inventory_transactions USING btree (company_id, product_id, transaction_date);


--
-- Name: idx_inventory_transactions_return_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_transactions_return_lookup ON public.inventory_transactions USING btree (product_id, transaction_number, transaction_type);


--
-- Name: idx_inventory_transactions_sub_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_transactions_sub_product_id ON public.inventory_transactions USING btree (sub_product_id);


--
-- Name: idx_item_receipt_items_header; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_receipt_items_header ON public.item_receipt_items USING btree (item_receipt_id);


--
-- Name: idx_item_receipt_items_pending_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_receipt_items_pending_item ON public.item_receipt_items USING btree (pending_item_receipt_item_id);


--
-- Name: idx_item_receipt_items_po_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_receipt_items_po_item ON public.item_receipt_items USING btree (purchase_order_item_id);


--
-- Name: idx_item_receipt_items_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_receipt_items_product ON public.item_receipt_items USING btree (product_id);


--
-- Name: idx_item_receipts_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_receipts_company ON public.item_receipts USING btree (company_id);


--
-- Name: idx_item_receipts_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_receipts_pending ON public.item_receipts USING btree (pending_item_receipt_id);


--
-- Name: idx_item_receipts_purchase_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_receipts_purchase_order ON public.item_receipts USING btree (purchase_order_id);


--
-- Name: idx_item_receipts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_receipts_status ON public.item_receipts USING btree (status);


--
-- Name: idx_item_receipts_supplier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_receipts_supplier ON public.item_receipts USING btree (supplier_id);


--
-- Name: idx_item_receipts_warehouse; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_receipts_warehouse ON public.item_receipts USING btree (warehouse_id);


--
-- Name: idx_journal_entries_company_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_journal_entries_company_date ON public.journal_entries USING btree (company_id, journal_date);


--
-- Name: idx_journal_entries_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_journal_entries_date ON public.journal_entries USING btree (journal_date);


--
-- Name: idx_journal_entries_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_journal_entries_reference ON public.journal_entries USING btree (reference_type, reference_id);


--
-- Name: idx_journal_lines_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_journal_lines_account ON public.journal_entry_lines USING btree (account_id);


--
-- Name: idx_journal_lines_journal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_journal_lines_journal ON public.journal_entry_lines USING btree (journal_id);


--
-- Name: idx_password_reset_tokens_company_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_tokens_company_user ON public.password_reset_tokens USING btree (company_id, user_id);


--
-- Name: idx_password_reset_tokens_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_tokens_expiry ON public.password_reset_tokens USING btree (expires_at);


--
-- Name: idx_password_reset_tokens_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_tokens_user ON public.password_reset_tokens USING btree (user_id);


--
-- Name: idx_pending_receipt_items_header; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pending_receipt_items_header ON public.pending_item_receipt_items USING btree (pending_item_receipt_id);


--
-- Name: idx_pending_receipt_items_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pending_receipt_items_product ON public.pending_item_receipt_items USING btree (product_id);


--
-- Name: idx_pending_receipts_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pending_receipts_company ON public.pending_item_receipts USING btree (company_id);


--
-- Name: idx_pending_receipts_po; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pending_receipts_po ON public.pending_item_receipts USING btree (purchase_order_id);


--
-- Name: idx_pending_receipts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pending_receipts_status ON public.pending_item_receipts USING btree (status);


--
-- Name: idx_pending_receipts_supplier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pending_receipts_supplier ON public.pending_item_receipts USING btree (supplier_id);


--
-- Name: idx_procurement_req_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_procurement_req_company ON public.procurement_requisitions USING btree (company_id);


--
-- Name: idx_procurement_req_items_header; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_procurement_req_items_header ON public.procurement_requisition_items USING btree (procurement_requisition_id);


--
-- Name: idx_procurement_req_items_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_procurement_req_items_source ON public.procurement_requisition_items USING btree (source_requisition_item_id);


--
-- Name: idx_purchase_items_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_items_product ON public.purchase_items USING btree (product_id);


--
-- Name: idx_purchase_items_purchase; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_items_purchase ON public.purchase_items USING btree (purchase_id);


--
-- Name: idx_purchase_items_receipt_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_items_receipt_item ON public.purchase_items USING btree (item_receipt_item_id);


--
-- Name: idx_purchase_order_items_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_order_items_order ON public.purchase_order_items USING btree (purchase_order_id);


--
-- Name: idx_purchase_orders_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_orders_company ON public.purchase_orders USING btree (company_id);


--
-- Name: idx_purchase_orders_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_orders_date ON public.purchase_orders USING btree (order_date);


--
-- Name: idx_purchase_orders_supplier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_orders_supplier ON public.purchase_orders USING btree (supplier_id);


--
-- Name: idx_purchase_payments_purchase; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_payments_purchase ON public.purchase_payments USING btree (purchase_id);


--
-- Name: idx_purchase_payments_supplier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_payments_supplier ON public.purchase_payments USING btree (supplier_id);


--
-- Name: idx_purchase_requisition_items_header; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_requisition_items_header ON public.purchase_requisition_items USING btree (requisition_id);


--
-- Name: idx_purchase_requisitions_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_requisitions_company ON public.purchase_requisitions USING btree (company_id);


--
-- Name: idx_purchase_requisitions_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_requisitions_date ON public.purchase_requisitions USING btree (transaction_date);


--
-- Name: idx_purchase_requisitions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_requisitions_status ON public.purchase_requisitions USING btree (status);


--
-- Name: idx_purchases_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchases_company_id ON public.purchases USING btree (company_id);


--
-- Name: idx_purchases_document_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchases_document_status ON public.purchases USING btree (document_status);


--
-- Name: idx_purchases_item_receipt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchases_item_receipt ON public.purchases USING btree (item_receipt_id);


--
-- Name: idx_purchases_source_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchases_source_type ON public.purchases USING btree (source_type);


--
-- Name: idx_purchases_supplier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchases_supplier ON public.purchases USING btree (supplier_id);


--
-- Name: idx_purchases_warehouse; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchases_warehouse ON public.purchases USING btree (warehouse_id);


--
-- Name: idx_rfq_items_procurement_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rfq_items_procurement_source ON public.rfq_items USING btree (procurement_requisition_id, procurement_requisition_item_id);


--
-- Name: idx_rfq_items_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rfq_items_source ON public.rfq_items USING btree (source_requisition_item_id);


--
-- Name: idx_rfq_quotes_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rfq_quotes_vendor ON public.rfq_vendor_quotes USING btree (rfq_vendor_id);


--
-- Name: idx_rfq_vendors_supplier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rfq_vendors_supplier ON public.rfq_vendors USING btree (supplier_id);


--
-- Name: idx_rfqs_company_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rfqs_company_date ON public.rfqs USING btree (company_id, transaction_date DESC);


--
-- Name: idx_sales_invoice_items_invoice; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_invoice_items_invoice ON public.sales_invoice_items USING btree (invoice_id);


--
-- Name: idx_sales_invoice_items_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_invoice_items_product ON public.sales_invoice_items USING btree (product_id);


--
-- Name: idx_sales_invoices_company_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_invoices_company_date ON public.sales_invoices USING btree (company_id, invoice_date);


--
-- Name: idx_sales_invoices_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_invoices_customer ON public.sales_invoices USING btree (customer_id);


--
-- Name: idx_sales_invoices_warehouse; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_invoices_warehouse ON public.sales_invoices USING btree (warehouse_id);


--
-- Name: idx_sales_order_items_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_order_items_order ON public.sales_order_items USING btree (order_id);


--
-- Name: idx_sales_orders_company_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_orders_company_date ON public.sales_orders USING btree (company_id, transaction_date DESC);


--
-- Name: idx_sales_orders_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_orders_customer ON public.sales_orders USING btree (customer_id);


--
-- Name: idx_sales_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_orders_status ON public.sales_orders USING btree (status);


--
-- Name: idx_sales_payments_company_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_payments_company_date ON public.sales_payments USING btree (company_id, payment_date);


--
-- Name: idx_sales_payments_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_payments_customer ON public.sales_payments USING btree (customer_id);


--
-- Name: idx_sales_payments_invoice; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_payments_invoice ON public.sales_payments USING btree (invoice_id);


--
-- Name: idx_sales_quotation_items_quotation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_quotation_items_quotation ON public.sales_quotation_items USING btree (quotation_id);


--
-- Name: idx_sales_quotations_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_quotations_company ON public.sales_quotations USING btree (company_id);


--
-- Name: idx_sales_quotations_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_quotations_customer ON public.sales_quotations USING btree (customer_id);


--
-- Name: idx_sales_quotations_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_quotations_date ON public.sales_quotations USING btree (quotation_date);


--
-- Name: idx_sales_quotations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_quotations_status ON public.sales_quotations USING btree (status);


--
-- Name: idx_sales_return_items_invoice_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_return_items_invoice_item ON public.sales_return_items USING btree (invoice_item_id);


--
-- Name: idx_sales_return_items_return; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_return_items_return ON public.sales_return_items USING btree (return_id);


--
-- Name: idx_sales_returns_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_returns_company ON public.sales_returns USING btree (company_id);


--
-- Name: idx_sales_returns_company_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_returns_company_status ON public.sales_returns USING btree (company_id, status);


--
-- Name: idx_sales_returns_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_returns_date ON public.sales_returns USING btree (return_date);


--
-- Name: idx_sales_returns_invoice; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_returns_invoice ON public.sales_returns USING btree (invoice_id);


--
-- Name: idx_stock_company_product_warehouse; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_company_product_warehouse ON public.stock USING btree (company_id, product_id, warehouse_id);


--
-- Name: idx_sub_products_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sub_products_product_id ON public.sub_products USING btree (product_id);


--
-- Name: idx_user_login_history_company_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_login_history_company_time ON public.user_login_history USING btree (company_id, logged_in_at DESC);


--
-- Name: idx_user_login_history_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_login_history_user ON public.user_login_history USING btree (user_id);


--
-- Name: idx_user_sessions_activity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_activity ON public.user_sessions USING btree (last_activity_at);


--
-- Name: idx_user_sessions_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_expiry ON public.user_sessions USING btree (expires_at);


--
-- Name: idx_user_sessions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_user ON public.user_sessions USING btree (user_id, company_id);


--
-- Name: idx_users_username_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_username_lower ON public.users USING btree (lower((username)::text));


--
-- Name: product_categories_name_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX product_categories_name_unique ON public.product_categories USING btree (lower((category_name)::text));


--
-- Name: product_units_barcode_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX product_units_barcode_unique ON public.product_units USING btree (barcode) WHERE ((barcode IS NOT NULL) AND ((barcode)::text <> ''::text));


--
-- Name: product_units_one_base_per_product; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX product_units_one_base_per_product ON public.product_units USING btree (product_id) WHERE (is_base_unit = true);


--
-- Name: products_barcode_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX products_barcode_unique ON public.products USING btree (barcode) WHERE ((barcode IS NOT NULL) AND ((barcode)::text <> ''::text));


--
-- Name: purchase_quotation_items_header_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX purchase_quotation_items_header_idx ON public.purchase_quotation_items USING btree (purchase_quotation_id);


--
-- Name: purchase_quotation_items_product_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX purchase_quotation_items_product_idx ON public.purchase_quotation_items USING btree (product_id);


--
-- Name: purchase_quotations_company_number_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX purchase_quotations_company_number_unique ON public.purchase_quotations USING btree (company_id, quotation_number);


--
-- Name: purchase_quotations_rfq_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX purchase_quotations_rfq_idx ON public.purchase_quotations USING btree (rfq_id);


--
-- Name: purchase_quotations_supplier_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX purchase_quotations_supplier_idx ON public.purchase_quotations USING btree (supplier_id);


--
-- Name: roles_company_name_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX roles_company_name_unique ON public.roles USING btree (company_id, upper((role_name)::text)) WHERE (company_id IS NOT NULL);


--
-- Name: roles_global_name_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX roles_global_name_unique ON public.roles USING btree (upper((role_name)::text)) WHERE (company_id IS NULL);


--
-- Name: sales_invoices_delivery_challan_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sales_invoices_delivery_challan_unique_idx ON public.sales_invoices USING btree (delivery_challan_id) WHERE (delivery_challan_id IS NOT NULL);


--
-- Name: sub_products_barcode_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sub_products_barcode_unique ON public.sub_products USING btree (barcode) WHERE ((barcode IS NOT NULL) AND ((barcode)::text <> ''::text));


--
-- Name: units_of_measure_code_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX units_of_measure_code_unique ON public.units_of_measure USING btree (lower((unit_code)::text));


--
-- Name: uq_rfq_items_procurement_item; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_rfq_items_procurement_item ON public.rfq_items USING btree (procurement_requisition_item_id) WHERE (procurement_requisition_item_id IS NOT NULL);


--
-- Name: chart_of_accounts chart_of_accounts_parent_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT chart_of_accounts_parent_account_id_fkey FOREIGN KEY (parent_account_id) REFERENCES public.chart_of_accounts(account_id) ON DELETE SET NULL;


--
-- Name: company_databases company_databases_company_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_databases
    ADD CONSTRAINT company_databases_company_fk FOREIGN KEY (company_id) REFERENCES public.companies(company_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: delivery_challan_items delivery_challan_items_delivery_challan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_challan_items
    ADD CONSTRAINT delivery_challan_items_delivery_challan_id_fkey FOREIGN KEY (delivery_challan_id) REFERENCES public.delivery_challans(delivery_challan_id) ON DELETE CASCADE;


--
-- Name: delivery_challan_items delivery_challan_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_challan_items
    ADD CONSTRAINT delivery_challan_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE SET NULL;


--
-- Name: delivery_challan_items delivery_challan_items_source_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_challan_items
    ADD CONSTRAINT delivery_challan_items_source_order_item_id_fkey FOREIGN KEY (source_order_item_id) REFERENCES public.sales_order_items(order_item_id) ON DELETE SET NULL;


--
-- Name: delivery_challans delivery_challans_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_challans
    ADD CONSTRAINT delivery_challans_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(company_id);


--
-- Name: delivery_challans delivery_challans_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_challans
    ADD CONSTRAINT delivery_challans_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id) ON DELETE SET NULL;


--
-- Name: delivery_challans delivery_challans_source_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_challans
    ADD CONSTRAINT delivery_challans_source_order_id_fkey FOREIGN KEY (source_order_id) REFERENCES public.sales_orders(order_id) ON DELETE SET NULL;


--
-- Name: delivery_challans delivery_challans_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_challans
    ADD CONSTRAINT delivery_challans_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(warehouse_id) ON DELETE SET NULL;


--
-- Name: inventory_transactions inventory_transactions_company_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_company_fk FOREIGN KEY (company_id) REFERENCES public.companies(company_id) NOT VALID;


--
-- Name: inventory_transactions inventory_transactions_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE CASCADE;


--
-- Name: inventory_transactions inventory_transactions_sub_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_sub_product_id_fkey FOREIGN KEY (sub_product_id) REFERENCES public.sub_products(sub_product_id);


--
-- Name: item_receipt_items item_receipt_items_header_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_receipt_items
    ADD CONSTRAINT item_receipt_items_header_fk FOREIGN KEY (item_receipt_id) REFERENCES public.item_receipts(item_receipt_id) ON DELETE CASCADE;


--
-- Name: item_receipt_items item_receipt_items_pending_item_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_receipt_items
    ADD CONSTRAINT item_receipt_items_pending_item_fk FOREIGN KEY (pending_item_receipt_item_id) REFERENCES public.pending_item_receipt_items(pending_item_receipt_item_id);


--
-- Name: item_receipt_items item_receipt_items_po_item_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_receipt_items
    ADD CONSTRAINT item_receipt_items_po_item_fk FOREIGN KEY (purchase_order_item_id) REFERENCES public.purchase_order_items(purchase_order_item_id);


--
-- Name: item_receipt_items item_receipt_items_product_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_receipt_items
    ADD CONSTRAINT item_receipt_items_product_fk FOREIGN KEY (product_id) REFERENCES public.products(product_id);


--
-- Name: item_receipts item_receipts_pending_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_receipts
    ADD CONSTRAINT item_receipts_pending_fk FOREIGN KEY (pending_item_receipt_id) REFERENCES public.pending_item_receipts(pending_item_receipt_id);


--
-- Name: item_receipts item_receipts_purchase_order_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_receipts
    ADD CONSTRAINT item_receipts_purchase_order_fk FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(purchase_order_id);


--
-- Name: item_receipts item_receipts_supplier_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_receipts
    ADD CONSTRAINT item_receipts_supplier_fk FOREIGN KEY (supplier_id) REFERENCES public.suppliers(supplier_id);


--
-- Name: item_receipts item_receipts_warehouse_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_receipts
    ADD CONSTRAINT item_receipts_warehouse_fk FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(warehouse_id);


--
-- Name: journal_entries journal_entries_company_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_company_fk FOREIGN KEY (company_id) REFERENCES public.companies(company_id) NOT VALID;


--
-- Name: journal_entry_lines journal_entry_lines_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entry_lines
    ADD CONSTRAINT journal_entry_lines_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.chart_of_accounts(account_id) ON DELETE RESTRICT;


--
-- Name: journal_entry_lines journal_entry_lines_journal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entry_lines
    ADD CONSTRAINT journal_entry_lines_journal_id_fkey FOREIGN KEY (journal_id) REFERENCES public.journal_entries(journal_id) ON DELETE CASCADE;


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: pending_item_receipt_items pending_item_receipt_items_header_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_item_receipt_items
    ADD CONSTRAINT pending_item_receipt_items_header_fk FOREIGN KEY (pending_item_receipt_id) REFERENCES public.pending_item_receipts(pending_item_receipt_id) ON DELETE CASCADE;


--
-- Name: procurement_requisition_items procurement_requisition_items_procurement_requisition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procurement_requisition_items
    ADD CONSTRAINT procurement_requisition_items_procurement_requisition_id_fkey FOREIGN KEY (procurement_requisition_id) REFERENCES public.procurement_requisitions(procurement_requisition_id) ON DELETE CASCADE;


--
-- Name: procurement_requisition_items procurement_requisition_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procurement_requisition_items
    ADD CONSTRAINT procurement_requisition_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id);


--
-- Name: procurement_requisition_items procurement_requisition_items_source_requisition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procurement_requisition_items
    ADD CONSTRAINT procurement_requisition_items_source_requisition_id_fkey FOREIGN KEY (source_requisition_id) REFERENCES public.purchase_requisitions(requisition_id);


--
-- Name: procurement_requisition_items procurement_requisition_items_source_requisition_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procurement_requisition_items
    ADD CONSTRAINT procurement_requisition_items_source_requisition_item_id_fkey FOREIGN KEY (source_requisition_item_id) REFERENCES public.purchase_requisition_items(requisition_item_id);


--
-- Name: procurement_requisition_items procurement_requisition_items_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procurement_requisition_items
    ADD CONSTRAINT procurement_requisition_items_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(warehouse_id);


--
-- Name: procurement_requisitions procurement_requisitions_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procurement_requisitions
    ADD CONSTRAINT procurement_requisitions_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(company_id);


--
-- Name: procurement_requisitions procurement_requisitions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procurement_requisitions
    ADD CONSTRAINT procurement_requisitions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id);


--
-- Name: product_units product_units_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_units
    ADD CONSTRAINT product_units_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE CASCADE;


--
-- Name: products products_cogs_account_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_cogs_account_fk FOREIGN KEY (cogs_account_id) REFERENCES public.chart_of_accounts(account_id) ON DELETE RESTRICT;


--
-- Name: products products_inventory_account_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_inventory_account_fk FOREIGN KEY (inventory_account_id) REFERENCES public.chart_of_accounts(account_id) ON DELETE RESTRICT;


--
-- Name: products products_purchase_account_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_purchase_account_fk FOREIGN KEY (purchase_account_id) REFERENCES public.chart_of_accounts(account_id) ON DELETE RESTRICT;


--
-- Name: products products_receivable_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_receivable_account_id_fkey FOREIGN KEY (receivable_account_id) REFERENCES public.chart_of_accounts(account_id) ON DELETE RESTRICT;


--
-- Name: products products_sales_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_sales_account_id_fkey FOREIGN KEY (sales_account_id) REFERENCES public.chart_of_accounts(account_id) ON DELETE RESTRICT;


--
-- Name: purchase_items purchase_items_item_receipt_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_items
    ADD CONSTRAINT purchase_items_item_receipt_item_id_fkey FOREIGN KEY (item_receipt_item_id) REFERENCES public.item_receipt_items(item_receipt_item_id) ON DELETE RESTRICT;


--
-- Name: purchase_items purchase_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_items
    ADD CONSTRAINT purchase_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE RESTRICT;


--
-- Name: purchase_items purchase_items_purchase_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_items
    ADD CONSTRAINT purchase_items_purchase_id_fkey FOREIGN KEY (purchase_id) REFERENCES public.purchases(purchase_id) ON DELETE CASCADE;


--
-- Name: purchase_order_items purchase_order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id);


--
-- Name: purchase_order_items purchase_order_items_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(purchase_order_id) ON DELETE CASCADE;


--
-- Name: purchase_orders purchase_orders_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(company_id);


--
-- Name: purchase_orders purchase_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id);


--
-- Name: purchase_orders purchase_orders_purchase_quotation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_purchase_quotation_id_fkey FOREIGN KEY (purchase_quotation_id) REFERENCES public.purchase_quotations(purchase_quotation_id) ON DELETE RESTRICT;


--
-- Name: purchase_orders purchase_orders_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(supplier_id);


--
-- Name: purchase_orders purchase_orders_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(user_id);


--
-- Name: purchase_payments purchase_payments_purchase_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_payments
    ADD CONSTRAINT purchase_payments_purchase_id_fkey FOREIGN KEY (purchase_id) REFERENCES public.purchases(purchase_id) ON DELETE RESTRICT;


--
-- Name: purchase_payments purchase_payments_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_payments
    ADD CONSTRAINT purchase_payments_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(supplier_id) ON DELETE RESTRICT;


--
-- Name: purchase_quotation_items purchase_quotation_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_quotation_items
    ADD CONSTRAINT purchase_quotation_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id);


--
-- Name: purchase_quotation_items purchase_quotation_items_purchase_quotation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_quotation_items
    ADD CONSTRAINT purchase_quotation_items_purchase_quotation_id_fkey FOREIGN KEY (purchase_quotation_id) REFERENCES public.purchase_quotations(purchase_quotation_id) ON DELETE CASCADE;


--
-- Name: purchase_quotation_items purchase_quotation_items_rfq_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_quotation_items
    ADD CONSTRAINT purchase_quotation_items_rfq_item_id_fkey FOREIGN KEY (rfq_item_id) REFERENCES public.rfq_items(rfq_item_id);


--
-- Name: purchase_quotations purchase_quotations_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_quotations
    ADD CONSTRAINT purchase_quotations_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(company_id);


--
-- Name: purchase_quotations purchase_quotations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_quotations
    ADD CONSTRAINT purchase_quotations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id);


--
-- Name: purchase_quotations purchase_quotations_rfq_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_quotations
    ADD CONSTRAINT purchase_quotations_rfq_id_fkey FOREIGN KEY (rfq_id) REFERENCES public.rfqs(rfq_id);


--
-- Name: purchase_quotations purchase_quotations_rfq_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_quotations
    ADD CONSTRAINT purchase_quotations_rfq_vendor_id_fkey FOREIGN KEY (rfq_vendor_id) REFERENCES public.rfq_vendors(rfq_vendor_id);


--
-- Name: purchase_quotations purchase_quotations_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_quotations
    ADD CONSTRAINT purchase_quotations_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(supplier_id);


--
-- Name: purchase_quotations purchase_quotations_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_quotations
    ADD CONSTRAINT purchase_quotations_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(user_id);


--
-- Name: purchase_requisition_attachments purchase_requisition_attachments_requisition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requisition_attachments
    ADD CONSTRAINT purchase_requisition_attachments_requisition_id_fkey FOREIGN KEY (requisition_id) REFERENCES public.purchase_requisitions(requisition_id) ON DELETE CASCADE;


--
-- Name: purchase_requisition_attachments purchase_requisition_attachments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requisition_attachments
    ADD CONSTRAINT purchase_requisition_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(user_id);


--
-- Name: purchase_requisition_items purchase_requisition_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requisition_items
    ADD CONSTRAINT purchase_requisition_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id);


--
-- Name: purchase_requisition_items purchase_requisition_items_requisition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requisition_items
    ADD CONSTRAINT purchase_requisition_items_requisition_id_fkey FOREIGN KEY (requisition_id) REFERENCES public.purchase_requisitions(requisition_id) ON DELETE CASCADE;


--
-- Name: purchase_requisition_related_transactions purchase_requisition_related_transactions_requisition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requisition_related_transactions
    ADD CONSTRAINT purchase_requisition_related_transactions_requisition_id_fkey FOREIGN KEY (requisition_id) REFERENCES public.purchase_requisitions(requisition_id) ON DELETE CASCADE;


--
-- Name: purchase_requisitions purchase_requisitions_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requisitions
    ADD CONSTRAINT purchase_requisitions_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(company_id);


--
-- Name: purchase_requisitions purchase_requisitions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requisitions
    ADD CONSTRAINT purchase_requisitions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id);


--
-- Name: purchase_requisitions purchase_requisitions_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requisitions
    ADD CONSTRAINT purchase_requisitions_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(user_id);


--
-- Name: purchase_requisitions purchase_requisitions_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requisitions
    ADD CONSTRAINT purchase_requisitions_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(warehouse_id);


--
-- Name: purchases purchases_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(company_id);


--
-- Name: purchases purchases_item_receipt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_item_receipt_id_fkey FOREIGN KEY (item_receipt_id) REFERENCES public.item_receipts(item_receipt_id) ON DELETE RESTRICT;


--
-- Name: purchases purchases_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(supplier_id) ON DELETE RESTRICT;


--
-- Name: purchases purchases_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(warehouse_id) ON DELETE RESTRICT;


--
-- Name: rfq_items rfq_items_procurement_requisition_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_items
    ADD CONSTRAINT rfq_items_procurement_requisition_fk FOREIGN KEY (procurement_requisition_id) REFERENCES public.procurement_requisitions(procurement_requisition_id);


--
-- Name: rfq_items rfq_items_procurement_requisition_item_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_items
    ADD CONSTRAINT rfq_items_procurement_requisition_item_fk FOREIGN KEY (procurement_requisition_item_id) REFERENCES public.procurement_requisition_items(procurement_requisition_item_id);


--
-- Name: rfq_items rfq_items_rfq_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_items
    ADD CONSTRAINT rfq_items_rfq_id_fkey FOREIGN KEY (rfq_id) REFERENCES public.rfqs(rfq_id) ON DELETE CASCADE;


--
-- Name: rfq_items rfq_items_source_requisition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_items
    ADD CONSTRAINT rfq_items_source_requisition_id_fkey FOREIGN KEY (source_requisition_id) REFERENCES public.purchase_requisitions(requisition_id);


--
-- Name: rfq_items rfq_items_source_requisition_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_items
    ADD CONSTRAINT rfq_items_source_requisition_item_id_fkey FOREIGN KEY (source_requisition_item_id) REFERENCES public.purchase_requisition_items(requisition_item_id);


--
-- Name: rfq_vendor_quotes rfq_vendor_quotes_rfq_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_vendor_quotes
    ADD CONSTRAINT rfq_vendor_quotes_rfq_item_id_fkey FOREIGN KEY (rfq_item_id) REFERENCES public.rfq_items(rfq_item_id) ON DELETE CASCADE;


--
-- Name: rfq_vendor_quotes rfq_vendor_quotes_rfq_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_vendor_quotes
    ADD CONSTRAINT rfq_vendor_quotes_rfq_vendor_id_fkey FOREIGN KEY (rfq_vendor_id) REFERENCES public.rfq_vendors(rfq_vendor_id) ON DELETE CASCADE;


--
-- Name: rfq_vendors rfq_vendors_rfq_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_vendors
    ADD CONSTRAINT rfq_vendors_rfq_id_fkey FOREIGN KEY (rfq_id) REFERENCES public.rfqs(rfq_id) ON DELETE CASCADE;


--
-- Name: rfq_vendors rfq_vendors_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_vendors
    ADD CONSTRAINT rfq_vendors_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(supplier_id);


--
-- Name: rfqs rfqs_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfqs
    ADD CONSTRAINT rfqs_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(company_id);


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(permission_id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(role_id) ON DELETE CASCADE;


--
-- Name: roles roles_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(company_id) ON DELETE CASCADE;


--
-- Name: sales_invoice_items sales_invoice_items_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_invoice_items
    ADD CONSTRAINT sales_invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.sales_invoices(invoice_id) ON DELETE CASCADE;


--
-- Name: sales_invoice_items sales_invoice_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_invoice_items
    ADD CONSTRAINT sales_invoice_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE RESTRICT;


--
-- Name: sales_invoice_items sales_invoice_items_sub_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_invoice_items
    ADD CONSTRAINT sales_invoice_items_sub_product_id_fkey FOREIGN KEY (sub_product_id) REFERENCES public.sub_products(sub_product_id);


--
-- Name: sales_invoices sales_invoices_company_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT sales_invoices_company_fk FOREIGN KEY (company_id) REFERENCES public.companies(company_id) NOT VALID;


--
-- Name: sales_invoices sales_invoices_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT sales_invoices_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id) ON DELETE RESTRICT;


--
-- Name: sales_invoices sales_invoices_delivery_challan_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT sales_invoices_delivery_challan_fk FOREIGN KEY (delivery_challan_id) REFERENCES public.delivery_challans(delivery_challan_id) ON DELETE RESTRICT;


--
-- Name: sales_invoices sales_invoices_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT sales_invoices_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(warehouse_id) ON DELETE RESTRICT;


--
-- Name: sales_order_items sales_order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_order_items
    ADD CONSTRAINT sales_order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.sales_orders(order_id) ON DELETE CASCADE;


--
-- Name: sales_order_items sales_order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_order_items
    ADD CONSTRAINT sales_order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE SET NULL;


--
-- Name: sales_orders sales_orders_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(company_id);


--
-- Name: sales_orders sales_orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id) ON DELETE SET NULL;


--
-- Name: sales_orders sales_orders_source_quotation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_source_quotation_id_fkey FOREIGN KEY (source_quotation_id) REFERENCES public.sales_quotations(quotation_id) ON DELETE SET NULL;


--
-- Name: sales_orders sales_orders_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(warehouse_id) ON DELETE SET NULL;


--
-- Name: sales_payments sales_payments_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_payments
    ADD CONSTRAINT sales_payments_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.chart_of_accounts(account_id) ON DELETE RESTRICT;


--
-- Name: sales_payments sales_payments_company_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_payments
    ADD CONSTRAINT sales_payments_company_fk FOREIGN KEY (company_id) REFERENCES public.companies(company_id) NOT VALID;


--
-- Name: sales_payments sales_payments_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_payments
    ADD CONSTRAINT sales_payments_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id) ON DELETE RESTRICT;


--
-- Name: sales_payments sales_payments_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_payments
    ADD CONSTRAINT sales_payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.sales_invoices(invoice_id) ON DELETE RESTRICT;


--
-- Name: sales_quotation_counters sales_quotation_counters_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_quotation_counters
    ADD CONSTRAINT sales_quotation_counters_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(company_id) ON DELETE CASCADE;


--
-- Name: sales_quotation_items sales_quotation_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_quotation_items
    ADD CONSTRAINT sales_quotation_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE SET NULL;


--
-- Name: sales_quotation_items sales_quotation_items_quotation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_quotation_items
    ADD CONSTRAINT sales_quotation_items_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES public.sales_quotations(quotation_id) ON DELETE CASCADE;


--
-- Name: sales_quotations sales_quotations_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_quotations
    ADD CONSTRAINT sales_quotations_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(company_id);


--
-- Name: sales_quotations sales_quotations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_quotations
    ADD CONSTRAINT sales_quotations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: sales_quotations sales_quotations_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_quotations
    ADD CONSTRAINT sales_quotations_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id) ON DELETE SET NULL;


--
-- Name: sales_quotations sales_quotations_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_quotations
    ADD CONSTRAINT sales_quotations_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: sales_quotations sales_quotations_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_quotations
    ADD CONSTRAINT sales_quotations_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(warehouse_id) ON DELETE SET NULL;


--
-- Name: sales_return_items sales_return_items_invoice_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_return_items
    ADD CONSTRAINT sales_return_items_invoice_item_id_fkey FOREIGN KEY (invoice_item_id) REFERENCES public.sales_invoice_items(invoice_item_id);


--
-- Name: sales_return_items sales_return_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_return_items
    ADD CONSTRAINT sales_return_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id);


--
-- Name: sales_return_items sales_return_items_return_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_return_items
    ADD CONSTRAINT sales_return_items_return_id_fkey FOREIGN KEY (return_id) REFERENCES public.sales_returns(return_id) ON DELETE CASCADE;


--
-- Name: sales_return_items sales_return_items_sub_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_return_items
    ADD CONSTRAINT sales_return_items_sub_product_id_fkey FOREIGN KEY (sub_product_id) REFERENCES public.sub_products(sub_product_id);


--
-- Name: sales_returns sales_returns_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_returns
    ADD CONSTRAINT sales_returns_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(company_id);


--
-- Name: sales_returns sales_returns_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_returns
    ADD CONSTRAINT sales_returns_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id);


--
-- Name: sales_returns sales_returns_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_returns
    ADD CONSTRAINT sales_returns_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.sales_invoices(invoice_id);


--
-- Name: sales_returns sales_returns_refund_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_returns
    ADD CONSTRAINT sales_returns_refund_account_id_fkey FOREIGN KEY (refund_account_id) REFERENCES public.chart_of_accounts(account_id);


--
-- Name: sales_returns sales_returns_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_returns
    ADD CONSTRAINT sales_returns_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(warehouse_id);


--
-- Name: stock_adjustment_items stock_adjustment_items_adjustment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_adjustment_items
    ADD CONSTRAINT stock_adjustment_items_adjustment_id_fkey FOREIGN KEY (adjustment_id) REFERENCES public.stock_adjustments(adjustment_id) ON DELETE CASCADE;


--
-- Name: stock_adjustment_items stock_adjustment_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_adjustment_items
    ADD CONSTRAINT stock_adjustment_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE RESTRICT;


--
-- Name: stock_adjustments stock_adjustments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_adjustments
    ADD CONSTRAINT stock_adjustments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id);


--
-- Name: stock_adjustments stock_adjustments_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_adjustments
    ADD CONSTRAINT stock_adjustments_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id);


--
-- Name: stock_adjustments stock_adjustments_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_adjustments
    ADD CONSTRAINT stock_adjustments_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(warehouse_id);


--
-- Name: stock stock_company_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock
    ADD CONSTRAINT stock_company_fk FOREIGN KEY (company_id) REFERENCES public.companies(company_id) NOT VALID;


--
-- Name: stock stock_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock
    ADD CONSTRAINT stock_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE CASCADE;


--
-- Name: stock stock_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock
    ADD CONSTRAINT stock_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(warehouse_id) ON DELETE CASCADE;


--
-- Name: sub_products sub_products_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_products
    ADD CONSTRAINT sub_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE RESTRICT;


--
-- Name: unit_stock unit_stock_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unit_stock
    ADD CONSTRAINT unit_stock_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.product_units(unit_id) ON DELETE CASCADE;


--
-- Name: unit_stock unit_stock_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unit_stock
    ADD CONSTRAINT unit_stock_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(warehouse_id) ON DELETE CASCADE;


--
-- Name: user_companies user_companies_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_companies
    ADD CONSTRAINT user_companies_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(company_id) ON DELETE CASCADE;


--
-- Name: user_companies user_companies_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_companies
    ADD CONSTRAINT user_companies_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(role_id) ON DELETE RESTRICT;


--
-- Name: user_companies user_companies_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_companies
    ADD CONSTRAINT user_companies_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: user_login_history user_login_history_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_login_history
    ADD CONSTRAINT user_login_history_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(company_id) ON DELETE CASCADE;


--
-- Name: user_login_history user_login_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_login_history
    ADD CONSTRAINT user_login_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: users users_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(company_id);


--
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(role_id) ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict D9McBfk6eIGxxEeyXGYYW1JRGmqwyPmbqlNEKIwKPCOa8sGSEKdrPJDHDNqhVeH

