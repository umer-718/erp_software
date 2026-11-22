-- Central seed: global roles, every permission key the app checks, and full
-- ADMIN access. Safe to re-run.

-- Email is the login name, so it must be unique regardless of case.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_key
  ON public.users (lower((email)::text));

INSERT INTO public.roles (role_name, description, is_system_role, company_id)
SELECT v.role_name, v.description, TRUE, NULL
FROM (
  VALUES
    ('ADMIN',     'Full system administrator'),
    ('SUB_ADMIN', 'Administrator with controlled permissions'),
    ('USER',      'Normal system user')
) AS v(role_name, description)
WHERE NOT EXISTS (
  SELECT 1 FROM public.roles r
  WHERE r.company_id IS NULL AND upper(r.role_name) = v.role_name
);

-- Keys come from hasPermission()/requirePermission() calls, lib/bom.js,
-- lib/permission-keys.js and components/Sidebar.js (both spellings are
-- seeded where the sidebar and API disagree, e.g. warehouse/warehouses).
INSERT INTO public.permissions (permission_key, permission_name, module)
VALUES
  ('dashboard', 'Dashboard', 'Dashboard'),
  ('sales_dashboard', 'Sales Dashboard', 'Dashboard'),
  ('purchase_dashboard', 'Purchase Dashboard', 'Dashboard'),
  ('users', 'Users', 'Users'),
  ('roles', 'Roles', 'Users'),
  ('user_rights', 'User Rights', 'Users'),
  ('register_company', 'Register Company', 'Administration'),
  ('companies', 'Companies', 'Administration'),
  ('help_support', 'Help & Support', 'Administration'),
  ('settings', 'Settings', 'Settings'),
  ('company_settings', 'Company Settings', 'Settings'),
  ('products', 'Products', 'Inventory'),
  ('product_categories', 'Product Categories', 'Inventory'),
  ('units_of_measure', 'Units of Measure', 'Inventory'),
  ('items_ledger', 'Items Ledger', 'Inventory'),
  ('bill_of_materials', 'Bill of Materials', 'Manufacturing'),
  ('assembly_build', 'Assembly Build', 'Manufacturing'),
  ('assembly_unbuild', 'Assembly Unbuild', 'Manufacturing'),
  ('warehouse', 'Warehouses (menu)', 'Warehouse & Stock'),
  ('warehouses', 'Warehouses', 'Warehouse & Stock'),
  ('stock', 'Stock', 'Warehouse & Stock'),
  ('stock_adjustment', 'Stock Adjustment', 'Warehouse & Stock'),
  ('customers', 'Customers', 'Customers'),
  ('customer_balance', 'Customer Balance', 'Customers'),
  ('customer_ledger', 'Customer Ledger', 'Customers'),
  ('customer_detail_ledger', 'Customer Detail Ledger', 'Customers'),
  ('pos', 'POS (Point of Sale)', 'Sales'),
  ('sales', 'Sales', 'Sales'),
  ('sales_invoices', 'Sales Invoices', 'Sales'),
  ('sales_payment', 'Sales Payment (menu)', 'Sales'),
  ('sales_payments', 'Sales Payments', 'Sales'),
  ('sales_quotations', 'Sales Quotations', 'Sales'),
  ('sales_orders', 'Sales Orders', 'Sales'),
  ('sales_returns', 'Sales Returns', 'Sales'),
  ('delivery_challans', 'Delivery Challans', 'Sales'),
  ('pending_delivery_challans', 'Pending Delivery Challans', 'Sales'),
  ('vendors', 'Vendors', 'Purchase'),
  ('suppliers', 'Suppliers', 'Purchase'),
  ('supplier_balance', 'Supplier Balance', 'Purchase'),
  ('vendors_ledger', 'Vendors Ledger', 'Purchase'),
  ('supplier_ledger', 'Supplier Ledger', 'Purchase'),
  ('purchase_detail_ledger', 'Purchase Detail Ledger', 'Purchase'),
  ('purchase', 'Purchase', 'Purchase'),
  ('purchases', 'Purchases', 'Purchase'),
  ('purchase_payment', 'Purchase Payment (menu)', 'Purchase'),
  ('purchase_payments', 'Purchase Payments', 'Purchase'),
  ('purchase_requisitions', 'Purchase Requisitions', 'Purchase'),
  ('procurement_requisitions', 'Procurement Requisitions', 'Purchase'),
  ('requisitions_for_procurement', 'Requisitions for Procurement', 'Purchase'),
  ('rfqs', 'Requests for Quotation', 'Purchase'),
  ('purchase_quotations', 'Purchase Quotations', 'Purchase'),
  ('purchase_orders', 'Purchase Orders', 'Purchase'),
  ('pending_item_receipts', 'Pending Item Receipts', 'Purchase'),
  ('item_receipts', 'Item Receipts', 'Purchase'),
  ('purchase_invoices', 'Purchase Invoices', 'Purchase'),
  ('chart_of_accounts', 'Chart of Accounts', 'Accounting'),
  ('journal_entries', 'Journal Entries', 'Accounting'),
  ('financial_ledger', 'Financial Ledger', 'Accounting'),
  ('cash_bank', 'Cash & Bank', 'Accounting'),
  ('make_payment', 'Make Payment', 'Accounting'),
  ('make_receipt', 'Make Receipt', 'Accounting'),
  ('receivable', 'Receivable', 'Accounting'),
  ('payable', 'Payable', 'Accounting'),
  ('reports', 'Reports', 'Reports'),
  ('sales_report', 'Sales Report', 'Reports'),
  ('payment_report', 'Payment Report', 'Reports'),
  ('purchase_report', 'Purchase Report', 'Reports'),
  ('stock_report', 'Stock Report', 'Reports'),
  ('profit_loss', 'Profit & Loss', 'Reports'),
  ('balance_sheet', 'Balance Sheet', 'Reports')
ON CONFLICT (permission_key) DO NOTHING;

INSERT INTO public.role_permissions
  (role_id, permission_id, can_view, can_create, can_update, can_delete)
SELECT r.role_id, p.permission_id, TRUE, TRUE, TRUE, TRUE
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.company_id IS NULL AND upper(r.role_name) = 'ADMIN'
ON CONFLICT (role_id, permission_id) DO UPDATE
SET can_view = TRUE, can_create = TRUE, can_update = TRUE, can_delete = TRUE,
    updated_at = CURRENT_TIMESTAMP;
