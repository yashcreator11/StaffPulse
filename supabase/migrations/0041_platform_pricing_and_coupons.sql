-- =============================================================================
-- Migration: 0041_platform_pricing_and_coupons.sql
-- Description: Platform Master Pricing configuration and Coupon/Promo Code Engine
-- =============================================================================

-- 1. Platform Pricing Table (Configurable by Master Admin)
CREATE TABLE IF NOT EXISTS platform_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id text NOT NULL UNIQUE CHECK (plan_id IN ('starter', 'pro', 'enterprise')),
  plan_name text NOT NULL,
  base_employees integer NOT NULL DEFAULT 50,
  monthly_base_price numeric(10, 2) NOT NULL,
  annual_base_price numeric(10, 2) NOT NULL,
  monthly_extra_per_emp numeric(10, 2) NOT NULL DEFAULT 25.00,
  annual_extra_per_emp numeric(10, 2) NOT NULL DEFAULT 20.00,
  annual_discount_percent numeric(5, 2) NOT NULL DEFAULT 20.00,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed initial master pricing records
INSERT INTO platform_pricing (plan_id, plan_name, base_employees, monthly_base_price, annual_base_price, monthly_extra_per_emp, annual_extra_per_emp, annual_discount_percent, features)
VALUES
  ('starter', 'Starter Plan', 50, 1499.00, 1199.00, 25.00, 20.00, 20.00, '[
    "Up to 50 Enrolled Employees included",
    "Universal Biometric CSV Parser (ZKTeco, eSSL, Matrix)",
    "Statutory Leave Ledgers (SL, PL, CL, LWP)",
    "Automated In/Out Punch Calculation",
    "Payable Days Deduction Sheet (Tally & Excel)",
    "Single Office Branch"
  ]'::jsonb),
  ('pro', 'Pro Growth Plan', 50, 2999.00, 2399.00, 45.00, 36.00, 20.00, '[
    "Up to 50 Enrolled Employees included",
    "Automated Sandwich Rule Compliance Engine",
    "Direct Biometric Hardware Push Webhook API",
    "Multi-Office & Multi-Department Hierarchies",
    "Manager Multi-Tier Leave Approval Workflows",
    "Late Mark & Early Departure Deduction Rules",
    "Dedicated Email & Slack Priority Support"
  ]'::jsonb),
  ('enterprise', 'Enterprise Scale', 50, 4999.00, 3999.00, 65.00, 50.00, 20.00, '[
    "Up to 50 Enrolled Employees included",
    "Unlimited Office Branches & Shift Rosters",
    "Single Sign-On (Google Workspace, M365, SAML)",
    "1-Click Complete Org Backup & DPDP Purge Tools",
    "Append-Only Audit Ledger & Legal Compliance Pack",
    "Custom API Webhooks & ERP Connectors (SAP / GreytHR)",
    "99.9% Uptime SLA & Dedicated Success Manager"
  ]'::jsonb)
ON CONFLICT (plan_id) DO UPDATE SET
  monthly_base_price = EXCLUDED.monthly_base_price,
  annual_base_price = EXCLUDED.annual_base_price,
  updated_at = now();

-- 2. Coupons & Promo Codes Table
CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric(10, 2) NOT NULL,
  min_order_amount numeric(10, 2) NOT NULL DEFAULT 0.00,
  max_discount_cap numeric(10, 2),
  applicable_plans text[] NOT NULL DEFAULT ARRAY['starter', 'pro', 'enterprise'],
  max_redemptions integer DEFAULT NULL,
  times_redeemed integer NOT NULL DEFAULT 0,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active);

-- Seed introductory coupons
INSERT INTO coupons (code, description, discount_type, discount_value, min_order_amount, max_discount_cap, max_redemptions, is_active)
VALUES
  ('LAUNCH50', 'Inaugural Launch 50% Special Discount', 'percentage', 50.00, 1000.00, 10000.00, 100, true),
  ('DIWALI20', 'Festive Offer - 20% Off All Plans', 'percentage', 20.00, 1000.00, 5000.00, 500, true),
  ('FLAT500', 'Flat ₹500 Off Instant Savings', 'fixed', 500.00, 1499.00, 500.00, 250, true)
ON CONFLICT (code) DO NOTHING;
