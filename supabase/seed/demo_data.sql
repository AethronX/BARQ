-- DEMO DATA for internal testing. Every company name ends with "(TEST)".
-- Requires the three test accounts (buyer@ / supplier@ / admin@test.barq.om).
-- Extra demo users get random unusable passwords: they exist only to own data.
-- Safe to re-run: it does nothing if the demo data already exists.
-- Remove before launch together with the test accounts (LAUNCH_READINESS B11).

create or replace function pg_temp.mk_user(p_email text, p_name text, p_role public.app_role, p_company uuid)
returns uuid language plpgsql as $$
declare v uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new)
  values (v, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email,
    extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{"test_account":true}', now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
  values (gen_random_uuid(), v, v::text, jsonb_build_object('sub', v::text, 'email', p_email, 'email_verified', true), 'email', now(), now());
  insert into public.profiles (id, email, full_name, role, company_id) values (v, p_email, p_name, p_role, p_company);
  return v;
end $$;

create or replace function pg_temp.mk_company(p_kind public.app_role, p_name text, p_cats text[], p_level smallint, p_cr text, p_days_ago int)
returns uuid language sql as $$
  insert into public.companies (kind, name, city, cr_number, categories, verification, verified_at, created_at)
  values (p_kind, p_name, 'مسقط', p_cr, p_cats, p_level, case when p_level > 0 then now() - make_interval(days => p_days_ago - 1) end, now() - make_interval(days => p_days_ago))
  returning id
$$;

create or replace function pg_temp.mk_rfq(p_buyer uuid, p_by uuid, p_title text, p_cat text, p_qty int, p_unit text, p_spec text, p_loc text,
  p_status public.rfq_status, p_created_days_ago numeric, p_closes_in_hours numeric, p_required_in_days int)
returns uuid language sql as $$
  insert into public.rfqs (buyer_company_id, created_by, title, category, quantity, unit, spec, location, required_by, status, closes_at, idempotency_key, created_at)
  values (p_buyer, p_by, p_title, p_cat, p_qty, p_unit, p_spec, p_loc, current_date + p_required_in_days, p_status,
    now() + make_interval(secs => p_closes_in_hours * 3600), 'seed-' || gen_random_uuid(), now() - make_interval(secs => p_created_days_ago * 86400))
  returning id
$$;

-- Inserts a quote with its full revision history (prices listed oldest -> newest, in baisa).
create or replace function pg_temp.mk_quote(p_rfq uuid, p_sup uuid, p_prices bigint[], p_min int, p_max int, p_warranty int, p_terms text,
  p_notes text, p_status public.quote_status, p_days_ago numeric)
returns uuid language plpgsql as $$
declare
  v uuid; v_qty int; v_by uuid; i int; n int := array_length(p_prices, 1);
begin
  select quantity into v_qty from public.rfqs where id = p_rfq;
  select id into v_by from public.profiles where company_id = p_sup limit 1;
  insert into public.quotes (rfq_id, supplier_company_id, submitted_by, unit_price_baisa, total_baisa, min_days, max_days, warranty_months,
    payment_terms, notes, valid_until, status, version, created_at, updated_at)
  values (p_rfq, p_sup, v_by, p_prices[n], p_prices[n] * v_qty, p_min, p_max, p_warranty, p_terms, p_notes, current_date + 21, p_status, n,
    now() - make_interval(secs => p_days_ago * 86400), now() - make_interval(secs => p_days_ago * 86400 / 2))
  returning id into v;
  for i in 1..n loop
    insert into public.quote_revisions (quote_id, version, unit_price_baisa, total_baisa, min_days, max_days, warranty_months, payment_terms, notes, created_by, created_at)
    values (v, i, p_prices[i], p_prices[i] * v_qty, p_min, p_max, p_warranty, p_terms, p_notes, v_by, now() - make_interval(secs => (p_days_ago - (i - 1) * 0.2) * 86400));
  end loop;
  return v;
end $$;

-- Creates the order for an awarded quote and its status timeline up to p_status.
create or replace function pg_temp.mk_order(p_quote uuid, p_status public.order_status, p_days_ago numeric, p_notes jsonb default '{}'::jsonb)
returns uuid language plpgsql as $$
declare
  q public.quotes; r public.rfqs; v uuid;
  steps public.order_status[] := array['CONFIRMED','PROCESSING','READY_FOR_SHIPMENT','SHIPPED','DELIVERED','COMPLETED']::public.order_status[];
  i int; last int := array_position(array['CONFIRMED','PROCESSING','READY_FOR_SHIPMENT','SHIPPED','DELIVERED','COMPLETED']::public.order_status[], p_status);
  sup_actor uuid; buy_actor uuid;
begin
  select * into q from public.quotes where id = p_quote;
  select * into r from public.rfqs where id = q.rfq_id;
  select id into sup_actor from public.profiles where company_id = q.supplier_company_id limit 1;
  select id into buy_actor from public.profiles where company_id = r.buyer_company_id limit 1;
  insert into public.orders (rfq_id, quote_id, buyer_company_id, supplier_company_id, total_baisa, status, created_by, created_at, updated_at)
  values (r.id, q.id, r.buyer_company_id, q.supplier_company_id, q.total_baisa, p_status, buy_actor,
    now() - make_interval(secs => p_days_ago * 86400), now() - make_interval(secs => p_days_ago * 86400 / (last + 1)))
  returning id into v;
  for i in 1..last loop
    insert into public.order_events (order_id, status, actor, note, created_at)
    values (v, steps[i], case when steps[i] in ('CONFIRMED','COMPLETED') then buy_actor else sup_actor end,
      p_notes ->> steps[i]::text, now() - make_interval(secs => p_days_ago * 86400 * (last - i + 1) / (last + 1)));
  end loop;
  return v;
end $$;

create or replace function pg_temp.notify(p_user uuid, p_kind text, p_params jsonb, p_link text, p_hours_ago numeric, p_read boolean)
returns void language sql as $$
  insert into public.notifications (user_id, kind, params, link, read_at, created_at)
  values (p_user, p_kind, p_params, p_link, case when p_read then now() end, now() - make_interval(secs => p_hours_ago * 3600))
$$;

do $$
declare
  B_uid uuid; B uuid; S1_uid uuid; S1 uuid; A_uid uuid;
  S2 uuid; S3 uuid; S4 uuid; S5 uuid; R uuid; P uuid; R_uid uuid;
  rA uuid; rB uuid; rC uuid; rD uuid; rE uuid; rF uuid; rG uuid; rH uuid; rI uuid; rJ uuid; rK uuid;
  q uuid; qC uuid; qD uuid; qE uuid; qF uuid; qJ uuid;
  oC uuid; oD uuid; oE uuid; oF uuid; oJ uuid;
  nA bigint; nB bigint; nC bigint; nD bigint; nE bigint; nH bigint; nJ bigint;
  oCn bigint; oDn bigint; oEn bigint; oFn bigint;
begin
  if exists (select 1 from public.companies where name = 'الخليج للتكييف (TEST)') then
    raise notice 'demo data already present'; return;
  end if;

  select p.id, p.company_id into B_uid, B from public.profiles p where p.email = 'buyer@test.barq.om';
  select p.id, p.company_id into S1_uid, S1 from public.profiles p where p.email = 'supplier@test.barq.om';
  select p.id into A_uid from public.profiles p where p.email = 'admin@test.barq.om';
  if B is null or S1 is null or A_uid is null then raise exception 'test accounts missing'; end if;

  -- ---------------- companies ----------------
  S2 := pg_temp.mk_company('supplier', 'الخليج للتكييف (TEST)', array['c_hvac','c_elec'], 3::smallint, '1123456', 40);
  S3 := pg_temp.mk_company('supplier', 'مجان للمواسير والسلامة (TEST)', array['c_pipes','c_hvac','c_safety'], 2::smallint, '1187744', 25);
  S4 := pg_temp.mk_company('supplier', 'الأفق للتجارة العامة (TEST)', array['c_hvac','c_pipes','c_elec','c_safety'], 1::smallint, null, 9);
  S5 := pg_temp.mk_company('supplier', 'مؤسسة النور للكهرباء (TEST)', array['c_elec'], 0::smallint, '1209981', 1);
  R  := pg_temp.mk_company('buyer', 'مجموعة الريم للمشاريع (TEST)', '{}', 2::smallint, '1099120', 30);
  P  := pg_temp.mk_company('buyer', 'شركة السهم للصيانة (TEST)', '{}', 0::smallint, null, 0);
  perform pg_temp.mk_user('gulf.ac@test.barq.om', 'سالم البلوشي', 'supplier', S2);
  perform pg_temp.mk_user('majan.pipes@test.barq.om', 'خالد الحارثي', 'supplier', S3);
  perform pg_temp.mk_user('ufuq@test.barq.om', 'أحمد الرواحي', 'supplier', S4);
  perform pg_temp.mk_user('alnoor@test.barq.om', 'يوسف الكندي', 'supplier', S5);
  R_uid := pg_temp.mk_user('reem.projects@test.barq.om', 'منى السيابية', 'buyer', R);
  perform pg_temp.mk_user('alsahm@test.barq.om', 'ناصر العبري', 'buyer', P);

  -- ---------------- buyer (test) RFQs ----------------
  -- A: live comparison with 4 competing quotes (one revised, one withdrawn)
  rA := pg_temp.mk_rfq(B, B_uid, 'مكيفات سبليت 2 طن انفرتر', 'c_hvac', 20, 'u_pcs',
    'مكيفات سبليت انفرتر 24000 وحدة حرارية، فريون R410A، ضمان كمبريسور 5 سنوات على الأقل، مع التركيب داخل مسقط.', 'l_seeb', 'QUOTES_RECEIVED', 1.5, 30, 21);
  perform pg_temp.mk_quote(rA, S1, array[192000, 185500]::bigint[], 5, 7, 24, 'NET_30', 'يشمل التركيب والتوصيل داخل مسقط', 'SUBMITTED', 1.2);
  perform pg_temp.mk_quote(rA, S2, array[179000]::bigint[], 7, 10, 36, 'ADVANCE_30', 'ماركة معتمدة مع ضمان الوكيل', 'SUBMITTED', 1.0);
  perform pg_temp.mk_quote(rA, S3, array[198000]::bigint[], 3, 4, 12, 'NET_60', null, 'SUBMITTED', 0.8);
  perform pg_temp.mk_quote(rA, S4, array[169000]::bigint[], 14, 21, 6, 'ADVANCE_100', 'التوريد من خارج السلطنة', 'SUBMITTED', 0.5);

  -- B: open, no quotes yet (also in the test supplier's inbox)
  rB := pg_temp.mk_rfq(B, B_uid, 'كابلات نحاسية 4×16 مم', 'c_elec', 500, 'u_m',
    'كابلات نحاسية معزولة XLPE مطابقة للمواصفات العمانية، بكرات 100 متر.', 'l_rusayl', 'OPEN', 0.2, 70, 14);

  -- C: awarded to the test supplier, order just CONFIRMED (supplier can start)
  rC := pg_temp.mk_rfq(B, B_uid, 'مواسير PPR مقاس 32 مم', 'c_pipes', 300, 'u_m',
    'مواسير PPR PN20 للمياه الساخنة، طول 4 متر للقطعة، مع الوصلات.', 'l_bawshar', 'AWARDED', 4, -24, 10);
  qC := pg_temp.mk_quote(rC, S1, array[1450]::bigint[], 3, 5, 12, 'NET_30', null, 'AWARDED', 3.5);
  perform pg_temp.mk_quote(rC, S3, array[1390]::bigint[], 8, 12, 12, 'ADVANCE_50', null, 'NOT_SELECTED', 3.4);
  oC := pg_temp.mk_order(qC, 'CONFIRMED', 0.5);

  -- D: order SHIPPED (supplier can mark delivered)
  rD := pg_temp.mk_rfq(B, B_uid, 'خوذ وأحذية سلامة', 'c_safety', 150, 'u_pcs',
    'خوذ سلامة بيضاء مع أحذية سلامة مقاوم للانزلاق، مقاسات متنوعة حسب الكشف المرفق لاحقاً.', 'l_amerat', 'AWARDED', 9, -120, 5);
  qD := pg_temp.mk_quote(rD, S1, array[9800, 9250]::bigint[], 2, 4, 6, 'NET_30', null, 'AWARDED', 8);
  oD := pg_temp.mk_order(qD, 'SHIPPED', 6, '{"SHIPPED":"رقم البوليصة: MCT-48213 - السائق: سعيد"}'::jsonb);

  -- E: order DELIVERED by another supplier (buyer can confirm receipt)
  rE := pg_temp.mk_rfq(B, B_uid, 'لوحات توزيع كهربائية', 'c_elec', 8, 'u_pcs',
    'لوحات توزيع 24 خط مع قواطع رئيسية 100 أمبير، تركيب داخلي.', 'l_muttrah', 'AWARDED', 14, -240, 3);
  qE := pg_temp.mk_quote(rE, S2, array[68500]::bigint[], 4, 6, 24, 'NET_30', null, 'AWARDED', 13);
  oE := pg_temp.mk_order(qE, 'DELIVERED', 10, '{"DELIVERED":"تم التسليم لمشرف الموقع"}'::jsonb);

  -- F: COMPLETED order (gives the test supplier a real track record)
  rF := pg_temp.mk_rfq(B, B_uid, 'وحدات تكييف مركزي للمخزن', 'c_hvac', 2, 'u_pcs',
    'وحدتا تكييف مركزي 10 طن للمخزن، مع مجاري الهواء والتشغيل التجريبي.', 'l_ghala', 'AWARDED', 30, -600, -10);
  qF := pg_temp.mk_quote(rF, S1, array[3150000]::bigint[], 10, 14, 24, 'NET_60', null, 'AWARDED', 29);
  oF := pg_temp.mk_order(qF, 'COMPLETED', 25);

  -- G: cancelled request
  rG := pg_temp.mk_rfq(B, B_uid, 'أنابيب صرف 110 مم', 'c_pipes', 100, 'u_m',
    'أنابيب PVC للصرف الصحي 110 مم ضغط عالٍ.', 'l_qurayyat', 'CANCELLED', 6, -48, 7);

  -- ---------------- requests from another buyer (test supplier's view) ----------------
  rH := pg_temp.mk_rfq(R, R_uid, 'مراوح شفط صناعية', 'c_hvac', 12, 'u_pcs',
    'مراوح شفط جدارية صناعية قطر 60 سم مع حماية IP55.', 'l_rusayl', 'OPEN', 0.1, 22, 12);
  rI := pg_temp.mk_rfq(R, R_uid, 'طفايات حريق 6 كجم', 'c_safety', 40, 'u_pcs',
    'طفايات بودرة 6 كجم معتمدة من الدفاع المدني مع حوامل جدارية.', 'l_muscat', 'QUOTES_RECEIVED', 1, 40, 9);
  perform pg_temp.mk_quote(rI, S1, array[14500]::bigint[], 2, 3, 12, 'NET_30', null, 'SUBMITTED', 0.7);
  perform pg_temp.mk_quote(rI, S3, array[15200]::bigint[], 1, 2, 12, 'NET_30', null, 'SUBMITTED', 0.6);
  rJ := pg_temp.mk_rfq(R, R_uid, 'محولات كهربائية صغيرة', 'c_elec', 3, 'u_pcs',
    'محولات جافة 50 كيلو فولت أمبير للمواقع الإنشائية.', 'l_seeb', 'AWARDED', 12, -200, 15);
  perform pg_temp.mk_quote(rJ, S1, array[2650000]::bigint[], 20, 30, 12, 'ADVANCE_50', null, 'NOT_SELECTED', 11);
  qJ := pg_temp.mk_quote(rJ, S2, array[2490000]::bigint[], 15, 20, 24, 'NET_30', null, 'AWARDED', 11);
  oJ := pg_temp.mk_order(qJ, 'PROCESSING', 8);
  rK := pg_temp.mk_rfq(R, R_uid, 'عزل حراري للأنابيب', 'c_pipes', 250, 'u_m',
    'عزل مطاطي للأنابيب سماكة 19 مم لقطر 3/4 بوصة.', 'l_ghala', 'QUOTES_RECEIVED', 2, 46, 20);
  perform pg_temp.mk_quote(rK, S1, array[2100]::bigint[], 3, 5, 0, 'NET_30', null, 'WITHDRAWN', 1.8);
  perform pg_temp.mk_quote(rK, S4, array[1950]::bigint[], 6, 9, 0, 'ADVANCE_100', null, 'SUBMITTED', 1.5);

  -- ---------------- notifications ----------------
  select number into nA from public.rfqs where id = rA;
  select number into nB from public.rfqs where id = rB;
  select number into nC from public.rfqs where id = rC;
  select number into nD from public.rfqs where id = rD;
  select number into nH from public.rfqs where id = rH;
  select number into nJ from public.rfqs where id = rJ;
  select number into oCn from public.orders where id = oC;
  select number into oDn from public.orders where id = oD;
  select number into oEn from public.orders where id = oE;
  select number into oFn from public.orders where id = oF;

  -- buyer
  perform pg_temp.notify(B_uid, 'quote_new', jsonb_build_object('title','مكيفات سبليت 2 طن انفرتر','number',nA,'supplier','مورد تجريبي للتجهيزات (TEST)'), '/rfq/'||rA, 28, true);
  perform pg_temp.notify(B_uid, 'quote_new', jsonb_build_object('title','مكيفات سبليت 2 طن انفرتر','number',nA,'supplier','الخليج للتكييف (TEST)'), '/rfq/'||rA, 24, true);
  perform pg_temp.notify(B_uid, 'quote_new', jsonb_build_object('title','مكيفات سبليت 2 طن انفرتر','number',nA,'supplier','مجان للمواسير والسلامة (TEST)'), '/rfq/'||rA, 19, false);
  perform pg_temp.notify(B_uid, 'quote_updated', jsonb_build_object('title','مكيفات سبليت 2 طن انفرتر','number',nA,'supplier','مورد تجريبي للتجهيزات (TEST)'), '/rfq/'||rA, 14, false);
  perform pg_temp.notify(B_uid, 'quote_new', jsonb_build_object('title','مكيفات سبليت 2 طن انفرتر','number',nA,'supplier','الأفق للتجارة العامة (TEST)'), '/rfq/'||rA, 12, false);
  perform pg_temp.notify(B_uid, 'order_status', jsonb_build_object('number',oDn,'status','SHIPPED'), '/order/'||oD, 30, true);
  perform pg_temp.notify(B_uid, 'order_status', jsonb_build_object('number',oEn,'status','DELIVERED'), '/order/'||oE, 6, false);
  perform pg_temp.notify(B_uid, 'verification_changed', jsonb_build_object('level',2), null, 72, true);
  -- supplier
  perform pg_temp.notify(S1_uid, 'rfq_new', jsonb_build_object('title','كابلات نحاسية 4×16 مم','number',nB), '/supplier/rfq/'||rB, 5, false);
  perform pg_temp.notify(S1_uid, 'rfq_new', jsonb_build_object('title','مراوح شفط صناعية','number',nH), '/supplier/rfq/'||rH, 2, false);
  perform pg_temp.notify(S1_uid, 'quote_awarded', jsonb_build_object('title','مواسير PPR مقاس 32 مم','number',oCn), '/order/'||oC, 11, false);
  perform pg_temp.notify(S1_uid, 'quote_awarded', jsonb_build_object('title','خوذ وأحذية سلامة','number',oDn), '/order/'||oD, 200, true);
  perform pg_temp.notify(S1_uid, 'quote_not_selected', jsonb_build_object('title','محولات كهربائية صغيرة','number',nJ), null, 190, true);
  perform pg_temp.notify(S1_uid, 'order_status', jsonb_build_object('number',oFn,'status','COMPLETED'), '/order/'||oF, 300, true);
  -- admin
  perform pg_temp.notify(A_uid, 'admin_deletion_request', jsonb_build_object('email','alsahm@test.barq.om'), null, 3, false);

  -- ---------------- audit trail ----------------
  insert into public.audit_log (actor, action, entity, entity_id, meta, created_at) values
    (A_uid, 'company.verification_changed', 'company', S2, '{"from":0,"to":3,"note":"تمت مراجعة السجل التجاري وزيارة المستودع (TEST)"}', now() - interval '39 days'),
    (A_uid, 'company.verification_changed', 'company', S3, '{"from":0,"to":2,"note":"السجل التجاري ساري (TEST)"}', now() - interval '24 days'),
    (A_uid, 'company.verification_changed', 'company', S4, '{"from":0,"to":1,"note":"تحقق أساسي من الهاتف والبريد (TEST)"}', now() - interval '8 days'),
    (B_uid, 'rfq.published', 'rfq', rA, '{"category":"c_hvac","quantity":20}', now() - interval '36 hours'),
    (S1_uid, 'quote.revised', 'quote', null, '{"version":2}', now() - interval '14 hours'),
    (B_uid, 'rfq.awarded', 'order', oC, '{}', now() - interval '12 hours'),
    (B_uid, 'rfq.cancelled', 'rfq', rG, '{}', now() - interval '5 days'),
    (null, 'seed.demo_data', 'system', null, '{"note":"internal demo data"}', now());
end $$;

-- Summary of what exists now.
select
  (select count(*) from public.companies where name like '%(TEST)%') as test_companies,
  (select count(*) from public.rfqs) as rfqs,
  (select count(*) from public.quotes) as quotes,
  (select count(*) from public.quote_revisions) as revisions,
  (select count(*) from public.orders) as orders,
  (select count(*) from public.order_events) as order_events,
  (select count(*) from public.notifications) as notifications,
  (select count(*) from public.companies where verification = 0) as pending_verification;
