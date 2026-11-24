-- The second imported 20-IP shared-credential group. It was originally stored
-- with one credential_group per host:port. Name it Batch B and snapshot it on
-- every existing allocation without changing proxy, status or expiry.
update public.proxy_inventory
   set credential_group='B', updated_at=now()
 where credential_group <> 'A'
   and archived_at is null;
update public.proxy_allocations a
   set credential_group='B'
  from public.proxy_inventory i
 where i.id=a.proxy_inventory_id and i.credential_group='B';
