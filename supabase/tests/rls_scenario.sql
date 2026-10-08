-- End-to-end permission scenario. Runs inside one transaction and rolls back,
-- leaving no data behind. Each row of the result is: step, expected, actual.
-- Run with: psql "$DATABASE_URL" -f supabase/tests/rls_scenario.sql (or the SQL editor).
begin;

insert into auth.users (id, email, aud, role) values
  ('11111111-1111-1111-1111-111111111111', 'buyer@test.barq', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 's1@test.barq', 'authenticated', 'authenticated'),
  ('33333333-3333-3333-3333-333333333333', 's2@test.barq', 'authenticated', 'authenticated'),
  ('44444444-4444-4444-4444-444444444444', 's3@test.barq', 'authenticated', 'authenticated'),
  ('55555555-5555-5555-5555-555555555555', 'buyer2@test.barq', 'authenticated', 'authenticated'),
  ('66666666-6666-6666-6666-666666666666', 'admin@test.barq', 'authenticated', 'authenticated');
insert into public.profiles (id, email, full_name, role) values ('66666666-6666-6666-6666-666666666666', 'admin@test.barq', 'Admin', 'admin');

create temp table r (n serial, step text, expected text, actual text);
create temp table ids (k text primary key, v uuid);
grant all on r, ids to authenticated, anon;
grant usage on sequence r_n_seq to authenticated, anon;

-- Run SQL as the current role; record its scalar result or the error message.
create function pg_temp.t(p_step text, p_expected text, p_sql text) returns void language plpgsql as $$
declare v text;
begin
  begin
    execute p_sql into v;
  exception when others then
    v := 'ERR:' || sqlerrm;
  end;
  insert into r (step, expected, actual) values (p_step, p_expected, coalesce(v, 'null'));
end $$;
create function pg_temp.as_user(p_id uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_id, 'role', 'authenticated', 'email', p_id || '@test')::text, true)
$$;
grant execute on function pg_temp.t(text, text, text), pg_temp.as_user(uuid) to authenticated, anon;

set local role authenticated;

-- Onboarding
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select pg_temp.t('buyer onboarding', 'buyer', $q$select (public.complete_onboarding('Buyer One','buyer','Buyer Co','Muscat',null,null,'{}')).role::text$q$);
select pg_temp.t('unverified buyer cannot publish', 'ERR:company_not_verified', $q$select (public.create_rfq('Split AC 5 ton','c_hvac',10,'u_pcs','Inverter split AC with warranty','l_seeb',current_date+10,'key-aaaa-0001')).id::text$q$);
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select pg_temp.t('supplier1 onboarding', 'supplier', $q$select (public.complete_onboarding('Sup One','supplier','Supplier One','Muscat',null,null,'{c_hvac}')).role::text$q$);
select pg_temp.t('onboarding cannot self-assign admin', 'ERR:invalid_role', $q$select (public.complete_onboarding('X','admin','X Co')).role::text$q$);
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select pg_temp.t('supplier2 onboarding', 'supplier', $q$select (public.complete_onboarding('Sup Two','supplier','Supplier Two','Muscat',null,null,'{c_hvac}')).role::text$q$);
select pg_temp.as_user('44444444-4444-4444-4444-444444444444');
select pg_temp.t('supplier3 (electrical) onboarding', 'supplier', $q$select (public.complete_onboarding('Sup Three','supplier','Supplier Three','Muscat',null,null,'{c_elec}')).role::text$q$);
select pg_temp.as_user('55555555-5555-5555-5555-555555555555');
select pg_temp.t('buyer2 onboarding', 'buyer', $q$select (public.complete_onboarding('Buyer Two','buyer','Buyer Two Co')).role::text$q$);

-- Verification (admin only)
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select pg_temp.t('supplier cannot verify itself', 'ERR:forbidden', $q$select (public.admin_set_verification((select company_id from public.profiles where id = auth.uid()), 3::smallint)).verification::text$q$);
select pg_temp.as_user('66666666-6666-6666-6666-666666666666');
select pg_temp.t('admin verifies all companies', '5', $q$select count(*)::text from (select public.admin_set_verification(id, 2::smallint) from public.companies) x$q$);

-- RFQ creation + idempotency
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select pg_temp.t('buyer publishes RFQ', 'OPEN', $q$select (public.create_rfq('Split AC 5 ton','c_hvac',10,'u_pcs','Inverter split AC with warranty','l_seeb',current_date+10,'key-aaaa-0001')).status::text$q$);
select pg_temp.t('same idempotency key returns same RFQ', '1', $q$select count(distinct x)::text from (select (public.create_rfq('Split AC 5 ton','c_hvac',10,'u_pcs','Inverter split AC with warranty','l_seeb',current_date+10,'key-aaaa-0001')).id x union all select id from public.rfqs) s$q$);
select pg_temp.t('past required-by date rejected', 'ERR:invalid_required_by', $q$select (public.create_rfq('Old','c_hvac',1,'u_pcs','Some spec text here','l_seeb',current_date,'key-aaaa-0002')).id::text$q$);
select pg_temp.t('direct insert into rfqs denied', 'ERR:permission denied for table rfqs', $q$insert into public.rfqs (buyer_company_id) values (gen_random_uuid()) returning 'inserted'$q$);

-- Supplier visibility (no buyer identity)
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select pg_temp.t('supplier cannot read rfqs table directly', '0', $q$select count(*)::text from public.rfqs$q$);
select pg_temp.t('supplier inbox shows matching RFQ', '1', $q$select count(*)::text from public.supplier_rfqs()$q$);
select pg_temp.t('supplier cannot see buyer company', '0', $q$select count(*)::text from public.companies where kind = 'buyer'$q$);
select pg_temp.as_user('44444444-4444-4444-4444-444444444444');
select pg_temp.t('other-category supplier inbox empty', '0', $q$select count(*)::text from public.supplier_rfqs()$q$);
select pg_temp.t('other-category supplier cannot quote', 'ERR:not_found', $q$select (public.submit_quote((select id from public.rfqs limit 1), 1000::bigint, 1, 2, 0, 'NET_30')).status::text$q$);

-- Quotes
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select pg_temp.t('supplier1 quotes', 'SUBMITTED', $q$select (public.submit_quote((select id from public.supplier_rfqs() limit 1), 248000::bigint, 2, 3, 24, 'NET_30')).status::text$q$);
select pg_temp.t('server computes total from quantity', '2480000', $q$select total_baisa::text from public.quotes$q$);
select pg_temp.t('supplier1 revises -> version 2', '2', $q$select (public.submit_quote((select id from public.supplier_rfqs() limit 1), 245000::bigint, 2, 3, 24, 'NET_30')).version::text$q$);
select pg_temp.t('revision history kept', '2', $q$select count(*)::text from public.quote_revisions$q$);
select pg_temp.t('max < min days rejected', 'ERR:new row for relation "quotes" violates check constraint "quotes_check"', $q$select (public.submit_quote((select id from public.supplier_rfqs() limit 1), 245000::bigint, 5, 3, 24, 'NET_30')).version::text$q$);
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select pg_temp.t('supplier2 quotes', 'SUBMITTED', $q$select (public.submit_quote((select id from public.supplier_rfqs() limit 1), 250000::bigint, 4, 6, 12, 'ADVANCE_50')).status::text$q$);
select pg_temp.t('supplier2 sees only own quote', '1', $q$select count(*)::text from public.quotes$q$);
select pg_temp.t('supplier2 cannot see supplier1 revisions', '1', $q$select count(*)::text from public.quote_revisions$q$);
select pg_temp.t('supplier cannot award', 'ERR:not_found', $q$select (public.award_quote((select id from public.quotes limit 1))).status::text$q$);

-- Buyer comparison and award
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select pg_temp.t('buyer sees both quotes', '2', $q$select count(*)::text from public.quotes$q$);
select pg_temp.t('buyer got quote notifications', '3', $q$select count(*)::text from public.notifications where kind like 'quote%'$q$);
insert into ids select 'q1', id from public.quotes where unit_price_baisa = 245000;
insert into ids select 'q2', id from public.quotes where unit_price_baisa = 250000;
select pg_temp.as_user('55555555-5555-5555-5555-555555555555');
select pg_temp.t('other buyer cannot see RFQ', '0', $q$select count(*)::text from public.rfqs$q$);
select pg_temp.t('other buyer cannot see quotes', '0', $q$select count(*)::text from public.quotes$q$);
select pg_temp.t('other buyer cannot award', 'ERR:not_found', $q$select (public.award_quote((select v from ids where k = 'q1'))).status::text$q$);
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select pg_temp.t('buyer awards supplier1', 'CONFIRMED', $q$select (public.award_quote((select v from ids where k = 'q1'))).status::text$q$);
select pg_temp.t('repeat award returns same order', '1', $q$select count(distinct x)::text from (select (public.award_quote((select v from ids where k = 'q1'))).id x union all select id from public.orders) s$q$);
select pg_temp.t('second award rejected', 'ERR:already_awarded', $q$select (public.award_quote((select v from ids where k = 'q2'))).status::text$q$);
select pg_temp.t('buyer cannot move supplier steps', 'ERR:invalid_transition', $q$select (public.advance_order((select id from public.orders limit 1), 'PROCESSING')).status::text$q$);

-- Supplier fulfilment
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select pg_temp.t('losing supplier marked not selected', 'NOT_SELECTED', $q$select status::text from public.quotes$q$);
select pg_temp.t('losing supplier sees no order', '0', $q$select count(*)::text from public.orders$q$);
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select pg_temp.t('winner now sees the RFQ', '1', $q$select count(*)::text from public.rfqs$q$);
select pg_temp.t('winner now sees buyer company', '1', $q$select count(*)::text from public.companies where kind = 'buyer'$q$);
select pg_temp.t('skipping a step rejected', 'ERR:invalid_transition', $q$select (public.advance_order((select id from public.orders limit 1), 'SHIPPED')).status::text$q$);
select pg_temp.t('supplier -> PROCESSING', 'PROCESSING', $q$select (public.advance_order((select id from public.orders limit 1), 'PROCESSING')).status::text$q$);
select pg_temp.t('supplier -> READY', 'READY_FOR_SHIPMENT', $q$select (public.advance_order((select id from public.orders limit 1), 'READY_FOR_SHIPMENT')).status::text$q$);
select pg_temp.t('supplier -> SHIPPED', 'SHIPPED', $q$select (public.advance_order((select id from public.orders limit 1), 'SHIPPED')).status::text$q$);
select pg_temp.t('supplier -> DELIVERED', 'DELIVERED', $q$select (public.advance_order((select id from public.orders limit 1), 'DELIVERED')).status::text$q$);
select pg_temp.t('supplier cannot complete for buyer', 'ERR:invalid_transition', $q$select (public.advance_order((select id from public.orders limit 1), 'COMPLETED')).status::text$q$);
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select pg_temp.t('buyer confirms receipt', 'COMPLETED', $q$select (public.advance_order((select id from public.orders limit 1), 'COMPLETED')).status::text$q$);
select pg_temp.t('order timeline recorded', '6', $q$select count(*)::text from public.order_events$q$);
select pg_temp.t('supplier track record updated', '1', $q$select completed_orders::text from public.supplier_stats(array(select supplier_company_id from public.orders))$q$);

-- Direct writes and audit
select pg_temp.t('direct update of orders denied', 'ERR:permission denied for table orders', $q$update public.orders set status = 'CANCELLED' returning 'updated'$q$);
select pg_temp.t('cannot reassign notification owner', 'ERR:permission denied for table notifications', $q$update public.notifications set user_id = gen_random_uuid() returning 'updated'$q$);
select pg_temp.t('can mark own notifications read', 'null', $q$select public.mark_notifications_read()::text$q$);
select pg_temp.t('buyer cannot read audit log', '0', $q$select count(*)::text from public.audit_log$q$);
select pg_temp.t('buyer cannot read other profiles', '1', $q$select count(*)::text from public.profiles$q$);
select pg_temp.as_user('66666666-6666-6666-6666-666666666666');
select pg_temp.t('admin reads audit log', 'true', $q$select (count(*) > 10)::text from public.audit_log$q$);
select pg_temp.t('admin overview works', '1', $q$select (public.admin_overview() ->> 'orders_completed')$q$);

-- Anonymous access
reset role;
set local role anon;
select pg_temp.t('anon cannot read companies', 'ERR:permission denied for table companies', $q$select count(*)::text from public.companies$q$);
select pg_temp.t('anon cannot call functions', 'ERR:permission denied for function supplier_rfqs', $q$select count(*)::text from public.supplier_rfqs()$q$);

reset role;
select n, step, expected, actual, (expected = actual) as pass from r order by n;
rollback;
