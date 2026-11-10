-- Internal wallet transfer enum types.
-- DISABLED by default. Do not enable until compliance and legal approval.
-- A transfer moves internal BUYBIZ credit between two verified accounts. It is
-- not a cash withdrawal or a bank transfer.
--
-- Enum additions are isolated in this migration so they are committed before
-- any constraint or row in the next migration references them.

alter type public.ledger_entry_type add value if not exists 'transfer_debit';
alter type public.ledger_entry_type add value if not exists 'transfer_credit';
