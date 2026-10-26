-- Migration: 0040_pending_payment_status.sql
-- Description: Allow 'pending_payment' status for newly registered organizations requiring checkout completion.

ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_status_check;
ALTER TABLE organizations ADD CONSTRAINT organizations_status_check 
  CHECK (status IN ('trial', 'pending_payment', 'active', 'past_due', 'grace_period', 'read_only', 'suspended', 'cancelled'));

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check 
  CHECK (status IN ('trial', 'pending_payment', 'active', 'past_due', 'grace_period', 'cancelled'));
