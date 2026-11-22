-- Tables and columns the current code uses that the old schema dump lacked.
-- Reconstructed from the SQL in app/api/bill-of-materials, assembly-build,
-- assembly-unbuild, reports/purchases and auth/customers.
-- company_id / *_by columns are plain integers: companies and users live in
-- the central database, so no foreign keys to them here.

-- ---------- drift fixes on existing tables ----------

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS receivable_account_id integer
  REFERENCES public.chart_of_accounts(account_id) ON DELETE RESTRICT;

ALTER TABLE public.warehouses
  ADD COLUMN IF NOT EXISTS company_id integer;

-- Target of ON CONFLICT (company_id, product_id, warehouse_id) in the
-- assembly approve routes.
ALTER TABLE public.stock
  ADD CONSTRAINT stock_company_product_warehouse_key
  UNIQUE (company_id, product_id, warehouse_id);

-- ---------- bill of materials ----------

CREATE TABLE public.bill_of_materials (
    bom_id                  SERIAL PRIMARY KEY,
    company_id              INTEGER NOT NULL,
    bom_name                VARCHAR(255) NOT NULL,
    assembly_product_id     INTEGER REFERENCES public.products(product_id),
    assembly_sub_product_id INTEGER REFERENCES public.sub_products(sub_product_id),
    memo                    TEXT,
    unit_of_measure         VARCHAR(50),
    created_by              INTEGER,
    updated_by              INTEGER,
    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT bom_one_assembly_item_chk CHECK (
        (assembly_product_id IS NOT NULL)::int + (assembly_sub_product_id IS NOT NULL)::int = 1)
);
CREATE INDEX idx_bom_company ON public.bill_of_materials(company_id);

CREATE TABLE public.bom_revisions (
    revision_id   SERIAL PRIMARY KEY,
    bom_id        INTEGER NOT NULL REFERENCES public.bill_of_materials(bom_id) ON DELETE CASCADE,
    revision_name VARCHAR(100) NOT NULL,
    run_rate      NUMERIC(18,6) NOT NULL DEFAULT 0 CHECK (run_rate >= 0),
    has_process   BOOLEAN NOT NULL DEFAULT FALSE,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT bom_revisions_bom_revision_key UNIQUE (bom_id, revision_id)
);
CREATE UNIQUE INDEX bom_revisions_bom_name_uq
  ON public.bom_revisions (bom_id, lower(revision_name));

CREATE TABLE public.bom_revision_components (
    component_id     SERIAL PRIMARY KEY,
    revision_id      INTEGER NOT NULL REFERENCES public.bom_revisions(revision_id) ON DELETE CASCADE,
    product_id       INTEGER REFERENCES public.products(product_id),
    sub_product_id   INTEGER REFERENCES public.sub_products(sub_product_id),
    item_description TEXT,
    uom              VARCHAR(50),
    bom_quantity     NUMERIC(18,6) NOT NULL CHECK (bom_quantity > 0),
    quantity_type    VARCHAR(20) NOT NULL DEFAULT 'QUANTITY'
                     CHECK (quantity_type IN ('QUANTITY', 'PERCENTAGE')),
    item_source      VARCHAR(30) NOT NULL DEFAULT 'STOCK',
    CONSTRAINT brc_one_item_chk CHECK (
        (product_id IS NOT NULL)::int + (sub_product_id IS NOT NULL)::int = 1)
);
CREATE INDEX idx_brc_revision ON public.bom_revision_components(revision_id);

CREATE TABLE public.bom_processes (
    process_id          SERIAL PRIMARY KEY,
    revision_id         INTEGER NOT NULL UNIQUE REFERENCES public.bom_revisions(revision_id) ON DELETE CASCADE,
    process_name        VARCHAR(255) NOT NULL,
    location            VARCHAR(255),
    process_description TEXT,
    process_memo        TEXT,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.bom_process_steps (
    process_step_id       SERIAL PRIMARY KEY,
    process_id            INTEGER NOT NULL REFERENCES public.bom_processes(process_id) ON DELETE CASCADE,
    sequence              INTEGER NOT NULL CHECK (sequence > 0),
    operation_name        VARCHAR(255) NOT NULL,
    work_center           VARCHAR(255),
    operation_description TEXT,
    CONSTRAINT bom_process_steps_seq_key UNIQUE (process_id, sequence)
);

-- ---------- assembly build ----------

CREATE TABLE public.assembly_builds (
    assembly_build_id       SERIAL PRIMARY KEY,
    company_id              INTEGER NOT NULL,
    transaction_number      VARCHAR(50) NOT NULL,
    transaction_date        DATE NOT NULL DEFAULT CURRENT_DATE,
    warehouse_id            INTEGER NOT NULL REFERENCES public.warehouses(warehouse_id),
    customer_id             INTEGER REFERENCES public.customers(customer_id),
    bom_id                  INTEGER NOT NULL REFERENCES public.bill_of_materials(bom_id),
    revision_id             INTEGER NOT NULL REFERENCES public.bom_revisions(revision_id),
    assembly_product_id     INTEGER REFERENCES public.products(product_id),
    assembly_sub_product_id INTEGER REFERENCES public.sub_products(sub_product_id),
    build_quantity          NUMERIC(18,6) NOT NULL CHECK (build_quantity > 0),
    uom                     VARCHAR(100),
    employee                VARCHAR(255),
    machine                 VARCHAR(255),
    shift                   VARCHAR(100),
    work_order_number       VARCHAR(255),
    details                 TEXT,
    memo                    TEXT,
    status                  VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
                            CHECK (status IN ('DRAFT', 'APPROVED', 'CANCELLED')),
    component_amount        NUMERIC(18,4) NOT NULL DEFAULT 0,
    byproduct_amount        NUMERIC(18,4) NOT NULL DEFAULT 0,
    finished_unit_cost      NUMERIC(18,6) NOT NULL DEFAULT 0,
    posted_by               INTEGER,
    posted_at               TIMESTAMP,
    created_by              INTEGER,
    updated_by              INTEGER,
    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT assembly_builds_company_number_key UNIQUE (company_id, transaction_number),
    CONSTRAINT assembly_builds_one_item_chk CHECK (
        (assembly_product_id IS NOT NULL)::int + (assembly_sub_product_id IS NOT NULL)::int = 1)
);

CREATE TABLE public.assembly_build_components (
    assembly_build_component_id SERIAL PRIMARY KEY,
    assembly_build_id  INTEGER NOT NULL REFERENCES public.assembly_builds(assembly_build_id) ON DELETE CASCADE,
    component_id       INTEGER REFERENCES public.bom_revision_components(component_id) ON DELETE SET NULL,
    product_id         INTEGER REFERENCES public.products(product_id),
    sub_product_id     INTEGER REFERENCES public.sub_products(sub_product_id),
    item_description   TEXT NOT NULL,
    uom                VARCHAR(100),
    item_balance       NUMERIC(18,6) NOT NULL DEFAULT 0,
    required_quantity  NUMERIC(18,6) NOT NULL CHECK (required_quantity > 0),
    issued_quantity    NUMERIC(18,6) NOT NULL CHECK (issued_quantity > 0),
    unit_cost          NUMERIC(18,6) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
    amount             NUMERIC(18,4) NOT NULL DEFAULT 0,
    details            TEXT,
    CONSTRAINT abc_one_item_chk CHECK (
        (product_id IS NOT NULL)::int + (sub_product_id IS NOT NULL)::int = 1)
);
CREATE INDEX idx_abc_build ON public.assembly_build_components(assembly_build_id);

CREATE TABLE public.assembly_build_byproducts (
    assembly_build_byproduct_id SERIAL PRIMARY KEY,
    assembly_build_id INTEGER NOT NULL REFERENCES public.assembly_builds(assembly_build_id) ON DELETE CASCADE,
    product_id        INTEGER REFERENCES public.products(product_id),
    sub_product_id    INTEGER REFERENCES public.sub_products(sub_product_id),
    item_description  TEXT NOT NULL,
    uom               VARCHAR(100),
    quantity          NUMERIC(18,6) NOT NULL CHECK (quantity > 0),
    unit_cost         NUMERIC(18,6) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
    amount            NUMERIC(18,4) NOT NULL DEFAULT 0,
    details           TEXT,
    CONSTRAINT abb_one_item_chk CHECK (
        (product_id IS NOT NULL)::int + (sub_product_id IS NOT NULL)::int = 1)
);
CREATE INDEX idx_abb_build ON public.assembly_build_byproducts(assembly_build_id);

CREATE TABLE public.assembly_build_downtime (
    assembly_build_downtime_id SERIAL PRIMARY KEY,
    assembly_build_id INTEGER NOT NULL REFERENCES public.assembly_builds(assembly_build_id) ON DELETE CASCADE,
    machine           VARCHAR(255),
    reason            TEXT,
    start_time        TIMESTAMP,
    end_time          TIMESTAMP,
    duration_minutes  NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (duration_minutes >= 0),
    remarks           TEXT
);
CREATE INDEX idx_abd_build ON public.assembly_build_downtime(assembly_build_id);

-- ---------- assembly unbuild ----------

CREATE TABLE public.assembly_unbuilds (
    assembly_unbuild_id     SERIAL PRIMARY KEY,
    company_id              INTEGER NOT NULL,
    transaction_number      VARCHAR(50) NOT NULL,
    transaction_date        DATE NOT NULL DEFAULT CURRENT_DATE,
    warehouse_id            INTEGER NOT NULL REFERENCES public.warehouses(warehouse_id),
    bom_id                  INTEGER NOT NULL REFERENCES public.bill_of_materials(bom_id),
    revision_id             INTEGER NOT NULL REFERENCES public.bom_revisions(revision_id),
    assembly_product_id     INTEGER REFERENCES public.products(product_id),
    assembly_sub_product_id INTEGER REFERENCES public.sub_products(sub_product_id),
    unbuild_quantity        NUMERIC(18,6) NOT NULL CHECK (unbuild_quantity > 0),
    uom                     VARCHAR(100),
    details                 TEXT,
    memo                    TEXT,
    status                  VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
                            CHECK (status IN ('DRAFT', 'APPROVED', 'CANCELLED')),
    component_amount        NUMERIC(18,4) NOT NULL DEFAULT 0,
    finished_unit_cost      NUMERIC(18,6) NOT NULL DEFAULT 0,
    created_by              INTEGER,
    updated_by              INTEGER,
    posted_by               INTEGER,
    posted_at               TIMESTAMP,
    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT assembly_unbuilds_company_number_key UNIQUE (company_id, transaction_number),
    CONSTRAINT assembly_unbuilds_one_item_chk CHECK (
        (assembly_product_id IS NOT NULL)::int + (assembly_sub_product_id IS NOT NULL)::int = 1)
);

CREATE TABLE public.assembly_unbuild_components (
    assembly_unbuild_component_id SERIAL PRIMARY KEY,
    assembly_unbuild_id INTEGER NOT NULL REFERENCES public.assembly_unbuilds(assembly_unbuild_id) ON DELETE CASCADE,
    component_id        INTEGER REFERENCES public.bom_revision_components(component_id) ON DELETE SET NULL,
    product_id          INTEGER REFERENCES public.products(product_id),
    sub_product_id      INTEGER REFERENCES public.sub_products(sub_product_id),
    item_description    TEXT NOT NULL,
    uom                 VARCHAR(100),
    item_balance        NUMERIC(18,6) NOT NULL DEFAULT 0,
    bom_quantity        NUMERIC(18,6) NOT NULL DEFAULT 0 CHECK (bom_quantity >= 0),
    quantity_type       VARCHAR(20) NOT NULL DEFAULT 'QUANTITY'
                        CHECK (quantity_type IN ('QUANTITY', 'PERCENTAGE')),
    item_source         VARCHAR(30),
    required_quantity   NUMERIC(18,6) NOT NULL DEFAULT 0 CHECK (required_quantity >= 0),
    returned_quantity   NUMERIC(18,6) NOT NULL DEFAULT 0 CHECK (returned_quantity >= 0),
    unit_cost           NUMERIC(18,6) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
    amount              NUMERIC(18,4) NOT NULL DEFAULT 0,
    details             TEXT,
    CONSTRAINT auc_one_item_chk CHECK (
        (product_id IS NOT NULL)::int + (sub_product_id IS NOT NULL)::int = 1)
);
CREATE INDEX idx_auc_unbuild ON public.assembly_unbuild_components(assembly_unbuild_id);

-- ---------- sub-product stock ----------

CREATE TABLE public.sub_product_stock (
    sub_product_stock_id SERIAL PRIMARY KEY,
    company_id     INTEGER NOT NULL,
    product_id     INTEGER NOT NULL REFERENCES public.products(product_id),
    sub_product_id INTEGER NOT NULL REFERENCES public.sub_products(sub_product_id) ON DELETE CASCADE,
    warehouse_id   INTEGER NOT NULL REFERENCES public.warehouses(warehouse_id) ON DELETE CASCADE,
    quantity       NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Full (not partial) constraint: ON CONFLICT is used with and without
    -- "WHERE company_id IS NOT NULL".
    CONSTRAINT sub_product_stock_company_sub_wh_key UNIQUE (company_id, sub_product_id, warehouse_id)
);

-- ---------- purchase_invoices (read only by reports/purchases) ----------

CREATE VIEW public.purchase_invoices AS
SELECT purchase_id, purchase_number, company_id, supplier_id, warehouse_id,
       purchase_date, subtotal, discount, tax, total_amount,
       paid_amount, balance_amount, status, document_status
FROM public.purchases;
