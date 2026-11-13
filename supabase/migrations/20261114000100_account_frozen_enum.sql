-- Inactivity protection needs a distinct frozen state. Suspended remains an
-- administrative action; frozen is reversible by the customer or an admin.
alter type public.account_status add value if not exists 'frozen';
