-- Live notifications: Realtime respects the notifications RLS policy (own rows only).
alter publication supabase_realtime add table public.notifications;

-- Account deletion requests (required by the app stores). Deletion itself is
-- completed by an admin because trading records (RFQs, orders) must be kept or
-- anonymised according to the retention policy, which counsel has to define.
alter table public.profiles add column if not exists deletion_requested_at timestamptz;

create or replace function public.request_account_deletion() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  update public.profiles set deletion_requested_at = coalesce(deletion_requested_at, now()) where id = auth.uid();
  perform private.audit('account.deletion_requested', 'profile', auth.uid());
  insert into public.notifications (user_id, kind, params, link)
  select p.id, 'admin_deletion_request', jsonb_build_object('email', (select email from public.profiles where id = auth.uid())), null
  from public.profiles p where p.role = 'admin';
end $$;

revoke all on function public.request_account_deletion from public, anon;
grant execute on function public.request_account_deletion to authenticated;
