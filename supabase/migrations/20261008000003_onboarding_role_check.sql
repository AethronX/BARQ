-- Reject an invalid role before the idempotent early return so the error is explicit.
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
  if p_role not in ('buyer', 'supplier') then raise exception 'invalid_role'; end if;
  select * into v_profile from public.profiles where id = v_uid;
  if found then return v_profile; end if; -- idempotent

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
