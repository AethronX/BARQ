# BARQ backend (Supabase)

Project: `barq-mvp` · ref `hinnkdiedsslnvdtyywy` · region `ap-south-1`.

## Layout
- `migrations/` — applied in filename order. Already applied to `barq-mvp`; never edit an applied file, add a new one.
- `tests/rls_scenario.sql` — end-to-end permission test. It runs in a transaction and rolls back (paste into the SQL editor or `psql -f`). Every row must show `pass = true`.

## Security model
- RLS on every table. The `authenticated` role can only `SELECT`. `anon` has no access.
- All writes go through `SECURITY DEFINER` functions in `public` that check `auth.uid()`, role, company and state, then write `audit_log` and `notifications`.
- Helpers live in the `private` schema, which is not exposed through the API.
- Suppliers read RFQs only through `supplier_rfqs()`, which hides the buyer's identity until award.

## Make someone an admin (run once in the SQL editor)
The person must have signed in once with their email so that `auth.users` has the row.

```sql
insert into public.profiles (id, email, full_name, role)
select id, email, 'BARQ Admin', 'admin' from auth.users where email = 'admin@yourdomain.om'
on conflict (id) do update set role = 'admin', company_id = null;
```

Use a dedicated admin email, not an account that trades as a buyer or supplier.

## Dashboard settings to change before inviting users
See `docs/LAUNCH_READINESS.md` §3: email templates with `{{ .Token }}`, custom SMTP, Pro plan with backups.
