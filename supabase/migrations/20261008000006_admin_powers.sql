-- ---------------------------------------------------------------------------
-- Full administrative control, with the four guard rails that protect the
-- business rather than limit it:
--
--   1. Every change goes through a function that records WHO, WHAT and WHY.
--      A reason is mandatory for destructive actions.
--   2. Removal is a soft delete by default: the row stops being visible to
--      everyone and can be restored. A hard purge exists, and is refused for
--      companies that carry orders, because trading records must survive.
--   3. The audit log stays append-only. No function here can edit or delete it.
--   4. An admin cannot remove their own admin role or delete their own company,
--      so the platform can never be locked out of its own console.
--
-- Admins may otherwise read everything and change everything below.
-- ---------------------------------------------------------------------------

-- Soft deletion ------------------------------------------------------------
alter table public.companies add column if not exists deleted_at timestamptz;
alter table public.companies add column if not exists deleted_by uuid references auth.users(id);
alter table public.companies add column if not exists deletion_reason text;
alter table public.rfqs add column if not exists deleted_at timestamptz;
alter table public.rfqs add column if not exists deleted_by uuid references auth.users(id);
alter table public.rfqs add column if not exists deletion_reason text;
alter table public.quotes add column if not exists deleted_at timestamptz;
alter table public.quotes add column if not exists deleted_by uuid references auth.users(id);
alter table public.quotes add column if not exists deletion_reason text;

create index if not exists companies_live_idx on public.companies (kind) where deleted_at is null;
create index if not exists rfqs_live_idx on public.rfqs (status) where deleted_at is null;

-- Hide soft-deleted rows from ordinary users; admins keep seeing them so they
-- can review and restore.
drop policy if exists companies_select on public.companies;
create policy companies_select on public.companies for select to authenticated using (
  (select private.is_admin())
  or (deleted_at is null and (
    id = (select private.my_company())
    or kind = 'supplier'
    or exists (
      select 1 from public.orders o
      where o.buyer_company_id = companies.id and o.supplier_company_id = (select private.my_company())
    )
  ))
);

drop policy if exists rfqs_select on public.rfqs;
create policy rfqs_select on public.rfqs for select to authenticated using (
  (select private.is_admin()) or (deleted_at is null and buyer_company_id = (select private.my_company()))
);

drop policy if exists quotes_select on public.quotes;
create policy quotes_select on public.quotes for select to authenticated using (
  (select private.is_admin())
  or (deleted_at is null and (
    supplier_company_id = (select private.my_company())
    or exists (select 1 from public.rfqs r where r.id = quotes.rfq_id and r.buyer_company_id = (select private.my_company()))
  ))
);

-- Admins can also read the remaining tables end to end.
drop policy if exists quote_revisions_select on public.quote_revisions;
create policy quote_revisions_select on public.quote_revisions for select to authenticated using (
  (select private.is_admin())
  or exists (select 1 from public.quotes q where q.id = quote_id and q.supplier_company_id = (select private.my_company()))
);

drop policy if exists order_events_select on public.order_events;
create policy order_events_select on public.order_events for select to authenticated using (
  (select private.is_admin())
  or exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.buyer_company_id = (select private.my_company()) or o.supplier_company_id = (select private.my_company()))
  )
);

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select to authenticated using (
  user_id = (select auth.uid()) or (select private.is_admin())
);

-- Guard: the audit log can only ever grow. Not even an admin may rewrite it.
create or replace function private.audit_is_append_only() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'audit_log_is_append_only';
end $$;

drop trigger if exists audit_log_no_change on public.audit_log;
create trigger audit_log_no_change before update or delete or truncate on public.audit_log
for each statement execute function private.audit_is_append_only();

-- Helper: a reason is required and must say something.
create or replace function private.require_reason(p_reason text) returns text
language plpgsql immutable set search_path = '' as $$
declare v text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if v is null or length(v) < 5 then raise exception 'reason_required'; end if;
  return v;
end $$;

-- ---------------------------------------------------------------------------
-- Company administration
-- ---------------------------------------------------------------------------
create or replace function public.admin_update_company(
  p_company_id uuid, p_name text default null, p_cr_number text default null,
  p_city text default null, p_categories text[] default null
) returns public.companies
language plpgsql security definer set search_path = '' as $$
declare v_company public.companies; v_before jsonb;
begin
  if not private.is_admin() then raise exception 'forbidden'; end if;
  select to_jsonb(c) into v_before from public.companies c where c.id = p_company_id for update;
  if v_before is null then raise exception 'not_found'; end if;
  update public.companies set
    name = coalesce(nullif(btrim(coalesce(p_name, '')), ''), name),
    cr_number = coalesce(nullif(btrim(coalesce(p_cr_number, '')), ''), cr_number),
    city = coalesce(nullif(btrim(coalesce(p_city, '')), ''), city),
    categories = coalesce(p_categories, categories)
  where id = p_company_id returning * into v_company;
  perform private.audit('admin.company_updated', 'company', p_company_id,
    jsonb_build_object('before', v_before, 'after', to_jsonb(v_company)));
  return v_company;
end $$;

-- ---------------------------------------------------------------------------
-- Roles. An admin may promote or demote anyone except themselves, so the
-- console can never lock itself out.
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_role(p_user_id uuid, p_role text, p_reason text)
returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare v_profile public.profiles; v_old public.app_role; v_reason text := private.require_reason(p_reason);
begin
  if not private.is_admin() then raise exception 'forbidden'; end if;
  if p_user_id = auth.uid() then raise exception 'cannot_change_own_role'; end if;
  if p_role not in ('buyer', 'supplier', 'admin') then raise exception 'invalid_role'; end if;
  select role into v_old from public.profiles where id = p_user_id for update;
  if not found then raise exception 'not_found'; end if;
  update public.profiles set role = p_role::public.app_role where id = p_user_id returning * into v_profile;
  perform private.audit('admin.role_changed', 'profile', p_user_id,
    jsonb_build_object('from', v_old, 'to', p_role, 'reason', v_reason));
  return v_profile;
end $$;

-- ---------------------------------------------------------------------------
-- Status overrides. Any transition is allowed for an admin — the state machine
-- is there to stop mistakes, not to trap support staff — but the override is
-- named as such in the audit log and in the order timeline.
-- ---------------------------------------------------------------------------
create or replace function public.admin_force_rfq_status(p_rfq_id uuid, p_status text, p_reason text)
returns public.rfqs
language plpgsql security definer set search_path = '' as $$
declare v_rfq public.rfqs; v_old public.rfq_status; v_reason text := private.require_reason(p_reason);
begin
  if not private.is_admin() then raise exception 'forbidden'; end if;
  select status into v_old from public.rfqs where id = p_rfq_id for update;
  if not found then raise exception 'not_found'; end if;
  update public.rfqs set status = p_status::public.rfq_status where id = p_rfq_id returning * into v_rfq;
  perform private.audit('admin.rfq_status_forced', 'rfq', p_rfq_id,
    jsonb_build_object('from', v_old, 'to', p_status, 'reason', v_reason));
  perform private.notify_company(v_rfq.buyer_company_id, 'admin_rfq_status', jsonb_build_object('status', p_status), '/buyer/rfq/' || p_rfq_id);
  return v_rfq;
end $$;

create or replace function public.admin_force_order_status(p_order_id uuid, p_status text, p_reason text)
returns public.orders
language plpgsql security definer set search_path = '' as $$
declare v_order public.orders; v_old public.order_status; v_reason text := private.require_reason(p_reason);
begin
  if not private.is_admin() then raise exception 'forbidden'; end if;
  select status into v_old from public.orders where id = p_order_id for update;
  if not found then raise exception 'not_found'; end if;
  update public.orders set status = p_status::public.order_status, updated_at = now()
  where id = p_order_id returning * into v_order;
  insert into public.order_events (order_id, status, note, actor)
  values (p_order_id, p_status::public.order_status, left('BARQ admin: ' || v_reason, 500), auth.uid());
  perform private.audit('admin.order_status_forced', 'order', p_order_id,
    jsonb_build_object('from', v_old, 'to', p_status, 'reason', v_reason));
  perform private.notify_company(v_order.buyer_company_id, 'admin_order_status', jsonb_build_object('status', p_status), '/order/' || p_order_id);
  perform private.notify_company(v_order.supplier_company_id, 'admin_order_status', jsonb_build_object('status', p_status), '/order/' || p_order_id);
  return v_order;
end $$;

-- ---------------------------------------------------------------------------
-- Removal. Soft by default and reversible; a hard purge is available where it
-- destroys no trading record.
-- ---------------------------------------------------------------------------
create or replace function public.admin_soft_delete(p_entity text, p_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_reason text := private.require_reason(p_reason); v_n int;
begin
  if not private.is_admin() then raise exception 'forbidden'; end if;
  if p_entity = 'company' then
    if p_id = private.my_company() then raise exception 'cannot_delete_own_company'; end if;
    update public.companies set deleted_at = now(), deleted_by = auth.uid(), deletion_reason = v_reason
    where id = p_id and deleted_at is null;
  elsif p_entity = 'rfq' then
    update public.rfqs set deleted_at = now(), deleted_by = auth.uid(), deletion_reason = v_reason
    where id = p_id and deleted_at is null;
  elsif p_entity = 'quote' then
    update public.quotes set deleted_at = now(), deleted_by = auth.uid(), deletion_reason = v_reason
    where id = p_id and deleted_at is null;
  else
    raise exception 'invalid_entity';
  end if;
  get diagnostics v_n = row_count;
  if v_n = 0 then raise exception 'not_found'; end if;
  perform private.audit('admin.soft_deleted', p_entity, p_id, jsonb_build_object('reason', v_reason));
end $$;

create or replace function public.admin_restore(p_entity text, p_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  if not private.is_admin() then raise exception 'forbidden'; end if;
  if p_entity = 'company' then
    update public.companies set deleted_at = null, deleted_by = null, deletion_reason = null where id = p_id and deleted_at is not null;
  elsif p_entity = 'rfq' then
    update public.rfqs set deleted_at = null, deleted_by = null, deletion_reason = null where id = p_id and deleted_at is not null;
  elsif p_entity = 'quote' then
    update public.quotes set deleted_at = null, deleted_by = null, deletion_reason = null where id = p_id and deleted_at is not null;
  else
    raise exception 'invalid_entity';
  end if;
  get diagnostics v_n = row_count;
  if v_n = 0 then raise exception 'not_found'; end if;
  perform private.audit('admin.restored', p_entity, p_id);
end $$;

/*
 * Permanent deletion of a company and everything attached to it.
 *
 * Refused while the company has orders: an order is a record of a real
 * transaction between two businesses, and the other party's books must keep
 * matching. Cancel or anonymise instead. The audit trail of the deletion
 * survives the row, by design.
 */
create or replace function public.admin_purge_company(p_company_id uuid, p_reason text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_reason text := private.require_reason(p_reason);
  v_name text; v_orders int; v_rfqs int; v_quotes int; v_users int;
begin
  if not private.is_admin() then raise exception 'forbidden'; end if;
  if p_company_id = private.my_company() then raise exception 'cannot_delete_own_company'; end if;
  select name into v_name from public.companies where id = p_company_id for update;
  if not found then raise exception 'not_found'; end if;
  select count(*) into v_orders from public.orders
  where buyer_company_id = p_company_id or supplier_company_id = p_company_id;
  if v_orders > 0 then raise exception 'has_orders'; end if;

  delete from public.quote_revisions qr using public.quotes q
  where qr.quote_id = q.id and (q.supplier_company_id = p_company_id
    or q.rfq_id in (select id from public.rfqs where buyer_company_id = p_company_id));
  with d as (
    delete from public.quotes where supplier_company_id = p_company_id
      or rfq_id in (select id from public.rfqs where buyer_company_id = p_company_id) returning 1
  ) select count(*) into v_quotes from d;
  with d as (delete from public.rfqs where buyer_company_id = p_company_id returning 1)
  select count(*) into v_rfqs from d;
  with d as (update public.profiles set company_id = null where company_id = p_company_id returning 1)
  select count(*) into v_users from d;
  delete from public.companies where id = p_company_id;

  perform private.audit('admin.company_purged', 'company', p_company_id,
    jsonb_build_object('name', v_name, 'rfqs', v_rfqs, 'quotes', v_quotes, 'users_detached', v_users, 'reason', v_reason));
  return jsonb_build_object('name', v_name, 'rfqs', v_rfqs, 'quotes', v_quotes, 'users_detached', v_users);
end $$;

/*
 * Completes an account deletion request: removes the person's identifying
 * data while leaving the company's trading history intact and attributable to
 * the company rather than to a named individual.
 */
create or replace function public.admin_anonymize_profile(p_user_id uuid, p_reason text)
returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare v_profile public.profiles; v_reason text := private.require_reason(p_reason);
begin
  if not private.is_admin() then raise exception 'forbidden'; end if;
  if p_user_id = auth.uid() then raise exception 'cannot_anonymize_self'; end if;
  update public.profiles
  set full_name = 'مستخدم محذوف', phone = null, email = null, deletion_requested_at = coalesce(deletion_requested_at, now())
  where id = p_user_id returning * into v_profile;
  if not found then raise exception 'not_found'; end if;
  delete from public.notifications where user_id = p_user_id;
  perform private.audit('admin.profile_anonymized', 'profile', p_user_id, jsonb_build_object('reason', v_reason));
  return v_profile;
end $$;

-- Permissions: admin-only by the check inside each function, signed-in callers only.
revoke all on function public.admin_update_company, public.admin_set_role, public.admin_force_rfq_status,
  public.admin_force_order_status, public.admin_soft_delete, public.admin_restore,
  public.admin_purge_company, public.admin_anonymize_profile from public, anon;
grant execute on function public.admin_update_company, public.admin_set_role, public.admin_force_rfq_status,
  public.admin_force_order_status, public.admin_soft_delete, public.admin_restore,
  public.admin_purge_company, public.admin_anonymize_profile to authenticated;
