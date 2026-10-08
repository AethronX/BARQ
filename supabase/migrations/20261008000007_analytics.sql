-- ---------------------------------------------------------------------------
-- Platform statistics for the admin console.
--
-- Every number below is counted from real rows. Where a figure cannot be
-- computed yet (no completed orders, no quotes) the function returns null, and
-- the app prints "لا بيانات" rather than a zero that reads like a measurement.
--
-- GMV counts awarded order value. It is not revenue: BARQ charges nothing yet.
-- ---------------------------------------------------------------------------
create or replace function public.admin_stats(p_days int default 30)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_days int := least(greatest(coalesce(p_days, 30), 1), 365);
  v_from timestamptz := date_trunc('day', now()) - make_interval(days => v_days - 1);
  v_out jsonb;
begin
  if not private.is_admin() then raise exception 'forbidden'; end if;

  select jsonb_build_object(
    'window_days', v_days,
    'generated_at', now(),

    -- Totals, all time.
    'totals', (select jsonb_build_object(
        'buyers', count(*) filter (where kind = 'buyer' and deleted_at is null),
        'suppliers', count(*) filter (where kind = 'supplier' and deleted_at is null),
        'pending_verification', count(*) filter (where verification = 0 and deleted_at is null),
        'deleted', count(*) filter (where deleted_at is not null)
      ) from public.companies),

    'rfq_totals', (select jsonb_build_object(
        'all', count(*) filter (where deleted_at is null),
        'open', count(*) filter (where status in ('OPEN', 'QUOTES_RECEIVED') and deleted_at is null),
        'awarded', count(*) filter (where status = 'AWARDED' and deleted_at is null),
        'cancelled', count(*) filter (where status = 'CANCELLED' and deleted_at is null)
      ) from public.rfqs),

    'order_totals', (select jsonb_build_object(
        'all', count(*),
        'active', count(*) filter (where status not in ('COMPLETED', 'CANCELLED')),
        'completed', count(*) filter (where status = 'COMPLETED'),
        'cancelled', count(*) filter (where status = 'CANCELLED'),
        'gmv_baisa', coalesce(sum(total_baisa) filter (where status <> 'CANCELLED'), 0),
        'avg_order_baisa', (select round(avg(total_baisa))::bigint from public.orders where status <> 'CANCELLED')
      ) from public.orders),

    -- Funnel over the window: published → received a quote → awarded → completed.
    'funnel', (
      with r as (select id from public.rfqs where created_at >= v_from and deleted_at is null)
      select jsonb_build_object(
        'rfqs', (select count(*) from r),
        'quoted', (select count(distinct q.rfq_id) from public.quotes q where q.rfq_id in (select id from r) and q.deleted_at is null),
        'awarded', (select count(*) from public.orders o where o.rfq_id in (select id from r)),
        'completed', (select count(*) from public.orders o where o.rfq_id in (select id from r) and o.status = 'COMPLETED')
      )),

    -- One row per day so the chart has no gaps.
    'series', (
      select coalesce(jsonb_agg(jsonb_build_object(
          'day', to_char(d.day, 'YYYY-MM-DD'),
          'rfqs', (select count(*) from public.rfqs x where x.created_at >= d.day and x.created_at < d.day + interval '1 day' and x.deleted_at is null),
          'quotes', (select count(*) from public.quotes x where x.created_at >= d.day and x.created_at < d.day + interval '1 day' and x.deleted_at is null),
          'orders', (select count(*) from public.orders x where x.created_at >= d.day and x.created_at < d.day + interval '1 day'),
          'gmv_baisa', (select coalesce(sum(x.total_baisa), 0) from public.orders x where x.created_at >= d.day and x.created_at < d.day + interval '1 day' and x.status <> 'CANCELLED')
        ) order by d.day), '[]'::jsonb)
      from generate_series(v_from, date_trunc('day', now()), interval '1 day') as d(day)),

    -- Demand by category, with the award rate for each.
    'categories', (
      select coalesce(jsonb_agg(jsonb_build_object(
          'category', c.category, 'rfqs', c.rfqs, 'quotes', c.quotes, 'awarded', c.awarded
        ) order by c.rfqs desc), '[]'::jsonb)
      from (
        select r.category::text as category,
               count(distinct r.id) as rfqs,
               count(q.id) as quotes,
               count(distinct o.id) as awarded
        from public.rfqs r
        left join public.quotes q on q.rfq_id = r.id and q.deleted_at is null
        left join public.orders o on o.rfq_id = r.id
        where r.deleted_at is null
        group by r.category
      ) c),

    -- Marketplace health. null means "not measurable yet", never 0.
    'health', (select jsonb_build_object(
        'avg_quotes_per_rfq', (
          select round(avg(n)::numeric, 2) from (
            select count(q.id) as n from public.rfqs r
            left join public.quotes q on q.rfq_id = r.id and q.deleted_at is null
            where r.deleted_at is null and r.status <> 'DRAFT' group by r.id
          ) s),
        'rfqs_without_quotes', (
          select count(*) from public.rfqs r
          where r.deleted_at is null and r.status in ('OPEN', 'QUOTES_RECEIVED')
            and not exists (select 1 from public.quotes q where q.rfq_id = r.id and q.deleted_at is null)),
        'avg_hours_to_first_quote', (
          select round(avg(extract(epoch from (f.first_quote - r.created_at)) / 3600)::numeric, 1)
          from public.rfqs r
          join (select rfq_id, min(created_at) as first_quote from public.quotes where deleted_at is null group by rfq_id) f
            on f.rfq_id = r.id),
        'avg_hours_to_award', (
          select round(avg(extract(epoch from (o.created_at - r.created_at)) / 3600)::numeric, 1)
          from public.orders o join public.rfqs r on r.id = o.rfq_id),
        'award_rate_pct', (
          select case when count(r.id) = 0 then null
                 else round(100.0 * count(o.id) / count(r.id), 1) end
          from public.rfqs r left join public.orders o on o.rfq_id = r.id
          where r.deleted_at is null and r.status <> 'DRAFT'),
        'completion_rate_pct', (
          select case when count(*) = 0 then null
                 else round(100.0 * count(*) filter (where status = 'COMPLETED') / count(*), 1) end
          from public.orders)
      )),

    'verification_mix', (
      select coalesce(jsonb_object_agg(verification::text, n), '{}'::jsonb)
      from (select verification, count(*) as n from public.companies where deleted_at is null group by verification) v),

    -- Supplier leaderboard: activity and outcomes only. No ranking input is
    -- purchasable, and this view does not affect what buyers see.
    'top_suppliers', (
      select coalesce(jsonb_agg(jsonb_build_object(
          'company_id', s.id, 'name', s.name, 'verification', s.verification,
          'quotes', s.quotes, 'won', s.won,
          'win_rate_pct', case when s.quotes = 0 then null else round(100.0 * s.won / s.quotes, 1) end,
          'gmv_baisa', s.gmv
        ) order by s.won desc, s.quotes desc), '[]'::jsonb)
      from (
        select c.id, c.name, c.verification,
               count(distinct q.id) as quotes,
               count(distinct o.id) as won,
               coalesce(sum(distinct o.total_baisa), 0) as gmv
        from public.companies c
        left join public.quotes q on q.supplier_company_id = c.id and q.deleted_at is null
        left join public.orders o on o.supplier_company_id = c.id and o.status <> 'CANCELLED'
        where c.kind = 'supplier' and c.deleted_at is null
        group by c.id, c.name, c.verification
        having count(distinct q.id) > 0
        limit 10
      ) s),

    'pending_deletions', (select count(*) from public.profiles where deletion_requested_at is not null)
  ) into v_out;

  return v_out;
end $$;

revoke all on function public.admin_stats from public, anon;
grant execute on function public.admin_stats to authenticated;
