-- BARQ MVP business functions. All are SECURITY DEFINER with an empty
-- search_path, check the caller explicitly, and are callable only by
-- signed-in users. Error messages are stable codes the app translates.

-- ---------------------------------------------------------------------------
-- Onboarding
-- ---------------------------------------------------------------------------
create or replace function public.complete_onboarding(
  p_full_name text,
  p_role public.app_role,
  p_company_name text,
  p_city text default null,
  p_cr_number text default null,
  p_phone text default null,
  p_categories text[] default '{}'
) returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_company uuid;
  v_cats text[];
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into v_profile from public.profiles where id = v_uid;
  if found then return v_profile; end if; -- idempotent
  if p_role not in ('buyer', 'supplier') then raise exception 'invalid_role'; end if;

  v_cats := array(select distinct c from unnest(coalesce(p_categories, '{}')) c where c in ('c_hvac', 'c_pipes', 'c_elec', 'c_safety'));
  if p_role = 'supplier' and cardinality(v_cats) = 0 then raise exception 'categories_required'; end if;

  insert into public.companies (kind, name, city, cr_number, categories)
  values (p_role, btrim(p_company_name), nullif(btrim(coalesce(p_city, '')), ''), nullif(btrim(coalesce(p_cr_number, '')), ''), case when p_role = 'supplier' then v_cats else '{}' end)
  returning id into v_company;

  insert into public.profiles (id, email, full_name, phone, role, company_id)
  values (v_uid, auth.jwt() ->> 'email', btrim(p_full_name), nullif(btrim(coalesce(p_phone, '')), ''), p_role, v_company)
  returning * into v_profile;

  perform private.audit('onboarding.completed', 'company', v_company, jsonb_build_object('role', p_role));
  return v_profile;
end $$;

-- ---------------------------------------------------------------------------
-- RFQs (buyer)
-- ---------------------------------------------------------------------------
create or replace function public.create_rfq(
  p_title text,
  p_category text,
  p_quantity integer,
  p_unit text,
  p_spec text,
  p_location text,
  p_required_by date,
  p_idempotency_key text,
  p_closes_in_hours integer default 72
) returns public.rfqs
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_me public.profiles;
  v_verif smallint;
  v_rfq public.rfqs;
begin
  select * into v_me from public.profiles where id = v_uid;
  if not found or v_me.role <> 'buyer' then raise exception 'forbidden'; end if;
  select verification into v_verif from public.companies where id = v_me.company_id;
  if v_verif < 1 then raise exception 'company_not_verified'; end if;

  -- Idempotency: a retried or double-tapped request returns the first result.
  select * into v_rfq from public.rfqs where created_by = v_uid and idempotency_key = p_idempotency_key;
  if found then return v_rfq; end if;

  if p_required_by is null or p_required_by <= current_date then raise exception 'invalid_required_by'; end if;
  if p_closes_in_hours not between 12 and 336 then raise exception 'invalid_closing'; end if;
  if (select count(*) from public.rfqs where buyer_company_id = v_me.company_id and created_at > now() - interval '24 hours') >= 20 then
    raise exception 'rate_limited';
  end if;

  insert into public.rfqs (buyer_company_id, created_by, title, category, quantity, unit, spec, location, required_by, closes_at, idempotency_key)
  values (v_me.company_id, v_uid, btrim(p_title), p_category, p_quantity, p_unit, btrim(p_spec), p_location, p_required_by,
          now() + make_interval(hours => p_closes_in_hours), p_idempotency_key)
  returning * into v_rfq;

  perform private.audit('rfq.published', 'rfq', v_rfq.id, jsonb_build_object('category', p_category, 'quantity', p_quantity));

  -- Notify verified suppliers in this category (buyer identity is not included).
  insert into public.notifications (user_id, kind, params, link)
  select p.id, 'rfq_new', jsonb_build_object('title', v_rfq.title, 'number', v_rfq.number), '/supplier/rfq/' || v_rfq.id
  from public.profiles p join public.companies c on c.id = p.company_id
  where c.kind = 'supplier' and c.verification >= 1 and v_rfq.category = any (c.categories);

  return v_rfq;
end $$;

create or replace function public.cancel_rfq(p_rfq_id uuid) returns public.rfqs
language plpgsql security definer set search_path = '' as $$
declare
  v_rfq public.rfqs;
begin
  select * into v_rfq from public.rfqs where id = p_rfq_id for update;
  if not found or v_rfq.buyer_company_id is distinct from private.my_company() then raise exception 'not_found'; end if;
  if v_rfq.status in ('AWARDED', 'CLOSED', 'CANCELLED') then raise exception 'invalid_transition'; end if;
  update public.rfqs set status = 'CANCELLED' where id = p_rfq_id returning * into v_rfq;
  update public.quotes set status = 'NOT_SELECTED' where rfq_id = p_rfq_id and status = 'SUBMITTED';
  perform private.audit('rfq.cancelled', 'rfq', p_rfq_id);
  insert into public.notifications (user_id, kind, params, link)
  select p.id, 'rfq_cancelled', jsonb_build_object('title', v_rfq.title, 'number', v_rfq.number), null
  from public.quotes q join public.profiles p on p.company_id = q.supplier_company_id where q.rfq_id = p_rfq_id;
  return v_rfq;
end $$;

-- ---------------------------------------------------------------------------
-- Supplier view of RFQs (no buyer identity before award)
-- ---------------------------------------------------------------------------
create or replace function public.supplier_rfqs()
returns table (
  id uuid, number bigint, title text, category text, quantity integer, unit text, spec text, location text,
  required_by date, closes_at timestamptz, status public.rfq_status, created_at timestamptz,
  buyer_verification smallint, my_quote_id uuid, my_quote_status public.quote_status
)
language sql stable security definer set search_path = '' as $$
  with me as (
    select c.id, c.categories from public.companies c
    join public.profiles p on p.company_id = c.id
    where p.id = auth.uid() and p.role = 'supplier'
  )
  select r.id, r.number, r.title, r.category, r.quantity, r.unit, r.spec, r.location, r.required_by, r.closes_at, r.status, r.created_at,
         b.verification, q.id, q.status
  from public.rfqs r
  cross join me
  join public.companies b on b.id = r.buyer_company_id
  left join public.quotes q on q.rfq_id = r.id and q.supplier_company_id = me.id
  where q.id is not null
     or (r.status in ('OPEN', 'QUOTES_RECEIVED') and r.closes_at > now() and r.category = any (me.categories))
  order by r.created_at desc
  limit 200
$$;

-- ---------------------------------------------------------------------------
-- Quotes (supplier)
-- ---------------------------------------------------------------------------
create or replace function public.submit_quote(
  p_rfq_id uuid,
  p_unit_price_baisa bigint,
  p_min_days integer,
  p_max_days integer,
  p_warranty_months integer,
  p_payment_terms text,
  p_notes text default null,
  p_valid_until date default null
) returns public.quotes
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_me public.profiles;
  v_company public.companies;
  v_rfq public.rfqs;
  v_quote public.quotes;
  v_is_first boolean;
begin
  select * into v_me from public.profiles where id = v_uid;
  if not found or v_me.role <> 'supplier' then raise exception 'forbidden'; end if;
  select * into v_company from public.companies where id = v_me.company_id;
  if v_company.verification < 1 then raise exception 'company_not_verified'; end if;

  -- Lock the RFQ so quoting cannot race with award or cancellation.
  select * into v_rfq from public.rfqs where id = p_rfq_id for update;
  if not found or not (v_rfq.category = any (v_company.categories)) then raise exception 'not_found'; end if;
  if v_rfq.status not in ('OPEN', 'QUOTES_RECEIVED') or v_rfq.closes_at <= now() then raise exception 'rfq_closed'; end if;
  if p_valid_until is not null and p_valid_until < current_date then raise exception 'invalid_validity'; end if;

  select * into v_quote from public.quotes where rfq_id = p_rfq_id and supplier_company_id = v_company.id;
  if found then
    if v_quote.status not in ('SUBMITTED', 'WITHDRAWN') then raise exception 'invalid_transition'; end if;
    if v_quote.version >= 5 then raise exception 'too_many_revisions'; end if;
    update public.quotes set
      unit_price_baisa = p_unit_price_baisa,
      total_baisa = p_unit_price_baisa * v_rfq.quantity,
      min_days = p_min_days, max_days = p_max_days,
      warranty_months = p_warranty_months, payment_terms = p_payment_terms,
      notes = nullif(btrim(coalesce(p_notes, '')), ''), valid_until = p_valid_until,
      status = 'SUBMITTED', version = version + 1, submitted_by = v_uid
    where id = v_quote.id returning * into v_quote;
  else
    insert into public.quotes (rfq_id, supplier_company_id, submitted_by, unit_price_baisa, total_baisa, min_days, max_days, warranty_months, payment_terms, notes, valid_until)
    values (p_rfq_id, v_company.id, v_uid, p_unit_price_baisa, p_unit_price_baisa * v_rfq.quantity, p_min_days, p_max_days, p_warranty_months, p_payment_terms,
            nullif(btrim(coalesce(p_notes, '')), ''), p_valid_until)
    returning * into v_quote;
  end if;

  insert into public.quote_revisions (quote_id, version, unit_price_baisa, total_baisa, min_days, max_days, warranty_months, payment_terms, notes, created_by)
  values (v_quote.id, v_quote.version, v_quote.unit_price_baisa, v_quote.total_baisa, v_quote.min_days, v_quote.max_days, v_quote.warranty_months, v_quote.payment_terms, v_quote.notes, v_uid);

  v_is_first := v_rfq.status = 'OPEN';
  if v_is_first then update public.rfqs set status = 'QUOTES_RECEIVED' where id = p_rfq_id; end if;

  perform private.audit(case when v_quote.version = 1 then 'quote.submitted' else 'quote.revised' end, 'quote', v_quote.id,
    jsonb_build_object('rfq', p_rfq_id, 'version', v_quote.version, 'total_baisa', v_quote.total_baisa));
  perform private.notify_company(v_rfq.buyer_company_id, case when v_quote.version = 1 then 'quote_new' else 'quote_updated' end,
    jsonb_build_object('title', v_rfq.title, 'number', v_rfq.number, 'supplier', v_company.name), '/rfq/' || v_rfq.id);
  return v_quote;
end $$;

create or replace function public.withdraw_quote(p_quote_id uuid) returns public.quotes
language plpgsql security definer set search_path = '' as $$
declare
  v_quote public.quotes;
  v_rfq public.rfqs;
begin
  select * into v_quote from public.quotes where id = p_quote_id for update;
  if not found or v_quote.supplier_company_id is distinct from private.my_company() then raise exception 'not_found'; end if;
  if v_quote.status <> 'SUBMITTED' then raise exception 'invalid_transition'; end if;
  select * into v_rfq from public.rfqs where id = v_quote.rfq_id;
  if v_rfq.status not in ('OPEN', 'QUOTES_RECEIVED') then raise exception 'rfq_closed'; end if;
  update public.quotes set status = 'WITHDRAWN' where id = p_quote_id returning * into v_quote;
  perform private.audit('quote.withdrawn', 'quote', p_quote_id);
  perform private.notify_company(v_rfq.buyer_company_id, 'quote_withdrawn', jsonb_build_object('title', v_rfq.title, 'number', v_rfq.number), '/rfq/' || v_rfq.id);
  return v_quote;
end $$;

-- ---------------------------------------------------------------------------
-- Award -> order (buyer). Idempotent: one order per RFQ, ever.
-- ---------------------------------------------------------------------------
create or replace function public.award_quote(p_quote_id uuid) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_quote public.quotes;
  v_rfq public.rfqs;
  v_order public.orders;
begin
  select * into v_quote from public.quotes where id = p_quote_id;
  if not found then raise exception 'not_found'; end if;
  select * into v_rfq from public.rfqs where id = v_quote.rfq_id for update;
  if v_rfq.buyer_company_id is distinct from private.my_company() then raise exception 'not_found'; end if;
  if private.my_role() <> 'buyer' then raise exception 'forbidden'; end if;

  select * into v_order from public.orders where rfq_id = v_rfq.id;
  if found then
    if v_order.quote_id = p_quote_id then return v_order; end if; -- same request repeated
    raise exception 'already_awarded';
  end if;

  if v_rfq.status not in ('OPEN', 'QUOTES_RECEIVED', 'EVALUATION') then raise exception 'rfq_closed'; end if;
  if v_quote.status <> 'SUBMITTED' then raise exception 'quote_unavailable'; end if;
  if v_quote.valid_until is not null and v_quote.valid_until < current_date then raise exception 'quote_expired'; end if;

  update public.quotes set status = 'AWARDED' where id = p_quote_id;
  update public.quotes set status = 'NOT_SELECTED' where rfq_id = v_rfq.id and id <> p_quote_id and status = 'SUBMITTED';
  update public.rfqs set status = 'AWARDED' where id = v_rfq.id;

  insert into public.orders (rfq_id, quote_id, buyer_company_id, supplier_company_id, total_baisa, created_by)
  values (v_rfq.id, p_quote_id, v_rfq.buyer_company_id, v_quote.supplier_company_id, v_quote.total_baisa, v_uid)
  returning * into v_order;
  insert into public.order_events (order_id, status, actor) values (v_order.id, 'CONFIRMED', v_uid);

  perform private.audit('rfq.awarded', 'order', v_order.id, jsonb_build_object('rfq', v_rfq.id, 'quote', p_quote_id, 'total_baisa', v_order.total_baisa));
  perform private.notify_company(v_quote.supplier_company_id, 'quote_awarded', jsonb_build_object('title', v_rfq.title, 'number', v_order.number), '/order/' || v_order.id);
  insert into public.notifications (user_id, kind, params, link)
  select p.id, 'quote_not_selected', jsonb_build_object('title', v_rfq.title, 'number', v_rfq.number), null
  from public.quotes q join public.profiles p on p.company_id = q.supplier_company_id
  where q.rfq_id = v_rfq.id and q.id <> p_quote_id;
  return v_order;
end $$;

-- ---------------------------------------------------------------------------
-- Order lifecycle. Supplier moves fulfilment forward; buyer confirms receipt.
-- ---------------------------------------------------------------------------
create or replace function public.advance_order(p_order_id uuid, p_to public.order_status, p_note text default null)
returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_order public.orders;
  v_me uuid := private.my_company();
  v_admin boolean := private.is_admin();
  v_ok boolean;
  v_notify uuid;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or not (v_admin or v_me in (v_order.buyer_company_id, v_order.supplier_company_id)) then raise exception 'not_found'; end if;
  if v_order.status = p_to then return v_order; end if; -- idempotent repeat

  v_ok := case
    when v_me = v_order.supplier_company_id then (v_order.status, p_to) in (
      ('CONFIRMED'::public.order_status, 'PROCESSING'::public.order_status),
      ('PROCESSING', 'READY_FOR_SHIPMENT'), ('READY_FOR_SHIPMENT', 'SHIPPED'), ('SHIPPED', 'DELIVERED'))
    when v_me = v_order.buyer_company_id then (v_order.status, p_to) = ('DELIVERED'::public.order_status, 'COMPLETED'::public.order_status)
    else false
  end;
  -- Admins may cancel (dispute handling) or apply any forward step.
  if not v_ok and v_admin then
    v_ok := p_to = 'CANCELLED' and v_order.status not in ('COMPLETED', 'CANCELLED');
  end if;
  if not v_ok then raise exception 'invalid_transition'; end if;

  update public.orders set status = p_to where id = p_order_id returning * into v_order;
  insert into public.order_events (order_id, status, actor, note) values (p_order_id, p_to, v_uid, nullif(btrim(coalesce(p_note, '')), ''));
  perform private.audit('order.status_changed', 'order', p_order_id, jsonb_build_object('to', p_to));

  v_notify := case when v_me = v_order.supplier_company_id then v_order.buyer_company_id else v_order.supplier_company_id end;
  perform private.notify_company(v_notify, 'order_status', jsonb_build_object('number', v_order.number, 'status', p_to), '/order/' || p_order_id);
  if v_admin and v_me is distinct from v_order.buyer_company_id then
    perform private.notify_company(v_order.buyer_company_id, 'order_status', jsonb_build_object('number', v_order.number, 'status', p_to), '/order/' || p_order_id);
  end if;
  return v_order;
end $$;

-- ---------------------------------------------------------------------------
-- Supplier track record shown to buyers (derived from real orders only)
-- ---------------------------------------------------------------------------
create or replace function public.supplier_stats(p_company_ids uuid[])
returns table (company_id uuid, completed_orders integer, total_orders integer)
language sql stable security definer set search_path = '' as $$
  select c.id,
         count(o.id) filter (where o.status = 'COMPLETED')::integer,
         count(o.id) filter (where o.status <> 'CANCELLED')::integer
  from public.companies c
  left join public.orders o on o.supplier_company_id = c.id
  where c.id = any (p_company_ids) and c.kind = 'supplier'
  group by c.id
$$;

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
create or replace function public.mark_notifications_read() returns void
language sql security definer set search_path = '' as $$
  update public.notifications set read_at = now() where user_id = auth.uid() and read_at is null
$$;

-- ---------------------------------------------------------------------------
-- Admin
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_verification(p_company_id uuid, p_level smallint, p_note text default null)
returns public.companies
language plpgsql security definer set search_path = '' as $$
declare
  v_company public.companies;
  v_old smallint;
begin
  if not private.is_admin() then raise exception 'forbidden'; end if;
  if p_level not between 0 and 3 then raise exception 'invalid_level'; end if;
  select verification into v_old from public.companies where id = p_company_id for update;
  if not found then raise exception 'not_found'; end if;
  update public.companies set verification = p_level, verified_at = now(), verified_by = auth.uid()
  where id = p_company_id returning * into v_company;
  perform private.audit('company.verification_changed', 'company', p_company_id,
    jsonb_build_object('from', v_old, 'to', p_level, 'note', nullif(btrim(coalesce(p_note, '')), '')));
  perform private.notify_company(p_company_id, 'verification_changed', jsonb_build_object('level', p_level), null);
  return v_company;
end $$;

create or replace function public.admin_overview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'buyers', (select count(*) from public.companies where kind = 'buyer'),
    'suppliers', (select count(*) from public.companies where kind = 'supplier'),
    'pending_verification', (select count(*) from public.companies where verification = 0),
    'open_rfqs', (select count(*) from public.rfqs where status in ('OPEN', 'QUOTES_RECEIVED')),
    'quotes', (select count(*) from public.quotes),
    'orders_active', (select count(*) from public.orders where status not in ('COMPLETED', 'CANCELLED')),
    'orders_completed', (select count(*) from public.orders where status = 'COMPLETED')
  );
end $$;

-- ---------------------------------------------------------------------------
-- Permissions: only signed-in users may call these functions.
-- ---------------------------------------------------------------------------
revoke all on function public.complete_onboarding, public.create_rfq, public.cancel_rfq, public.supplier_rfqs,
  public.submit_quote, public.withdraw_quote, public.award_quote, public.advance_order, public.supplier_stats,
  public.mark_notifications_read, public.admin_set_verification, public.admin_overview from public, anon;
grant execute on function public.complete_onboarding, public.create_rfq, public.cancel_rfq, public.supplier_rfqs,
  public.submit_quote, public.withdraw_quote, public.award_quote, public.advance_order, public.supplier_stats,
  public.mark_notifications_read, public.admin_set_verification, public.admin_overview to authenticated;
