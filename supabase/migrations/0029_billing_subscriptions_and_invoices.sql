-- =============================================================================
-- Migration: 0029_billing_subscriptions_and_invoices.sql
-- Description: Section H - Multi-tenant billing, subscriptions, invoices,
--              seat limits, and tier feature entitlements.
-- =============================================================================

-- 1. Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  plan_tier text NOT NULL DEFAULT 'starter' CHECK (plan_tier IN ('starter', 'pro', 'enterprise')),
  billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual')),
  seat_limit integer NOT NULL DEFAULT 25,
  price_per_seat numeric(10, 2) NOT NULL DEFAULT 2.00,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('trial', 'active', 'past_due', 'grace_period', 'cancelled')),
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  payment_provider text DEFAULT 'razorpay' CHECK (payment_provider IN ('razorpay', 'stripe', 'manual')),
  customer_id text,
  subscription_id text,
  tax_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- 2. Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  amount numeric(10, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'paid' CHECK (status IN ('draft', 'open', 'paid', 'uncollectible', 'void')),
  billing_period_start timestamptz NOT NULL,
  billing_period_end timestamptz NOT NULL,
  paid_at timestamptz,
  pdf_url text,
  receipt_number text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(org_id, created_at DESC);

-- 3. Row Level Security for Subscriptions & Invoices
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_subscriptions_isolation ON subscriptions;
CREATE POLICY tenant_subscriptions_isolation ON subscriptions
  FOR ALL
  USING (org_id = auth_org_id())
  WITH CHECK (org_id = auth_org_id());

DROP POLICY IF EXISTS tenant_invoices_isolation ON invoices;
CREATE POLICY tenant_invoices_isolation ON invoices
  FOR ALL
  USING (org_id = auth_org_id())
  WITH CHECK (org_id = auth_org_id());

-- 4. Seed Subscriptions & Invoices for Existing Organizations
-- WonderBiz: Enterprise (500 seats)
INSERT INTO subscriptions (org_id, plan_tier, billing_cycle, seat_limit, price_per_seat, currency, status, payment_provider, subscription_id)
SELECT id, 'enterprise', 'annual', 500, 1.80, 'USD', 'active', 'manual', 'sub_enterprise_wonderbiz'
FROM organizations WHERE slug = 'wonderbiz'
ON CONFLICT (org_id) DO UPDATE SET plan_tier = 'enterprise', seat_limit = 500;

-- Acme Innovations: Pro (100 seats)
INSERT INTO subscriptions (org_id, plan_tier, billing_cycle, seat_limit, price_per_seat, currency, status, payment_provider, subscription_id)
SELECT id, 'pro', 'monthly', 100, 2.50, 'USD', 'active', 'stripe', 'sub_pro_acme'
FROM organizations WHERE slug = 'acme'
ON CONFLICT (org_id) DO UPDATE SET plan_tier = 'pro', seat_limit = 100;

-- Nova Startups: Starter (25 seats)
INSERT INTO subscriptions (org_id, plan_tier, billing_cycle, seat_limit, price_per_seat, currency, status, payment_provider, subscription_id)
SELECT id, 'starter', 'monthly', 25, 3.00, 'USD', 'trial', 'razorpay', 'sub_starter_nova'
FROM organizations WHERE slug = 'nova'
ON CONFLICT (org_id) DO UPDATE SET plan_tier = 'starter', seat_limit = 25;

-- Seed Sample Paid Invoices for Tenant Billing History
INSERT INTO invoices (org_id, invoice_number, amount, currency, status, billing_period_start, billing_period_end, paid_at, receipt_number)
SELECT id, 'INV-2026-WB-001', 900.00, 'USD', 'paid', now() - interval '60 days', now() - interval '30 days', now() - interval '60 days', 'RCPT-1001'
FROM organizations WHERE slug = 'wonderbiz';

INSERT INTO invoices (org_id, invoice_number, amount, currency, status, billing_period_start, billing_period_end, paid_at, receipt_number)
SELECT id, 'INV-2026-ACM-001', 250.00, 'USD', 'paid', now() - interval '30 days', now(), now() - interval '30 days', 'RCPT-1002'
FROM organizations WHERE slug = 'acme';
