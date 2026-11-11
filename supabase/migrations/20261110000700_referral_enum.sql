-- Referral rewards are wallet credits, never cash withdrawals.
-- The enum addition is isolated so later migrations can reference the value.

alter type public.ledger_entry_type add value if not exists 'referral_credit';
