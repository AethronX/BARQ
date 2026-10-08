-- APPLY THIS FILE BY HAND, once, in the Supabase SQL editor.
--
-- These two functions are the only parts of migration 0006 that could not be
-- applied through the Claude connector: it holds any statement containing a
-- DELETE for a human confirmation that an automated session cannot give.
-- That is the right gate for the two most destructive capabilities in BARQ,
-- so it was not worked around. Everything else in 0006 and 0007 is already live.
--
-- Until this file is run, 'Permanent delete' and 'Anonymize personal data'
-- in the admin console will return an error; every other admin action works.

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

revoke all on function public.admin_purge_company, public.admin_anonymize_profile from public, anon;
grant execute on function public.admin_purge_company, public.admin_anonymize_profile to authenticated;
