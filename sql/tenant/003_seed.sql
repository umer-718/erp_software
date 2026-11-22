-- Starter data for a newly registered company.
-- Codes 1400, 2100, 4100 and 5200 are looked up by code in the posting routes
-- (purchase-invoices approve, cash-bank); keep them stable.

INSERT INTO chart_of_accounts (account_code, account_name, account_type, is_group, is_cash_bank)
VALUES
  ('1000', 'Assets',      'ASSET',     TRUE, FALSE),
  ('2000', 'Liabilities', 'LIABILITY', TRUE, FALSE),
  ('3000', 'Equity',      'EQUITY',    TRUE, FALSE),
  ('4000', 'Revenue',     'REVENUE',   TRUE, FALSE),
  ('5000', 'Expenses',    'EXPENSE',   TRUE, FALSE)
ON CONFLICT (account_code) DO NOTHING;

INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, is_group, is_cash_bank)
SELECT v.code, v.name, v.type, parent.account_id, FALSE, v.cash_bank
FROM (
  VALUES
    ('1100', 'Cash in Hand',                 'ASSET',     '1000', TRUE),
    ('1110', 'Bank Account',                 'ASSET',     '1000', TRUE),
    ('1200', 'Accounts Receivable',          'ASSET',     '1000', FALSE),
    ('1400', 'Inventory',                    'ASSET',     '1000', FALSE),
    ('2100', 'Accounts Payable',             'LIABILITY', '2000', FALSE),
    ('2200', 'Sales Tax Payable',            'LIABILITY', '2000', FALSE),
    ('3100', 'Owner''s Capital',             'EQUITY',    '3000', FALSE),
    ('3200', 'Retained Earnings',            'EQUITY',    '3000', FALSE),
    ('4100', 'Sales Revenue',                'REVENUE',   '4000', FALSE),
    ('4200', 'Other Income',                 'REVENUE',   '4000', FALSE),
    ('5100', 'Cost of Goods Sold',           'EXPENSE',   '5000', FALSE),
    ('5200', 'Purchases & General Expenses', 'EXPENSE',   '5000', FALSE)
) AS v(code, name, type, parent_code, cash_bank)
JOIN chart_of_accounts parent ON parent.account_code = v.parent_code
ON CONFLICT (account_code) DO NOTHING;

INSERT INTO units_of_measure (unit_code, unit_name, description)
SELECT v.code, v.name, v.description
FROM (
  VALUES
    ('PCS', 'Pieces',    'Individual items'),
    ('BOX', 'Box',       'Box / carton'),
    ('DZN', 'Dozen',     '12 pieces'),
    ('KG',  'Kilogram',  'Weight in kilograms'),
    ('G',   'Gram',      'Weight in grams'),
    ('LTR', 'Litre',     'Volume in litres'),
    ('ML',  'Millilitre','Volume in millilitres'),
    ('MTR', 'Metre',     'Length in metres')
) AS v(code, name, description)
WHERE NOT EXISTS (
  SELECT 1 FROM units_of_measure u WHERE lower(u.unit_code) = lower(v.code)
);

INSERT INTO warehouses (warehouse_code, warehouse_name, description)
VALUES ('MAIN', 'Main Warehouse', 'Default warehouse created at registration')
ON CONFLICT (warehouse_code) DO NOTHING;
