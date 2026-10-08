# BARQ backend (Supabase)

Project: `barq-mvp` · ref `hinnkdiedsslnvdtyywy` · region `ap-south-1`.

## Layout
- `migrations/` — applied in filename order. Already applied to `barq-mvp`; never edit an applied file, add a new one.
- `tests/rls_scenario.sql` — end-to-end permission test. It runs in a transaction and rolls back (paste into the SQL editor or `psql -f`). Every row must show `pass = true`.

## Demo data (internal testing)
`seed/demo_data.sql` adds TEST companies, RFQs in every state, competing and revised quotes, orders at each stage, notifications and audit entries for the three test accounts. It is already applied to `barq-mvp` and is safe to re-run (it skips if present). Remove it together with the test accounts before launch (LAUNCH_READINESS B11).

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

## Administrative powers (migration 0006)

An admin can read everything and change everything through these functions,
each of which re-checks the caller and writes an audit row:

| Function | What it does |
|---|---|
| `admin_set_verification` | Verification level 0–3, with a note |
| `admin_update_company` | Name, CR number, city, categories |
| `admin_set_role` | Any user's role, except the admin's own |
| `admin_force_rfq_status` | Any RFQ status, outside the state machine |
| `admin_force_order_status` | Any order status; both parties notified, reason added to the timeline |
| `admin_soft_delete` / `admin_restore` | Hide a company, RFQ or quote from everyone, and bring it back |
| `admin_purge_company` | Permanent. Refused while the company has orders |
| `admin_anonymize_profile` | Strips a person's name, phone and email; keeps the company's trading record |

Four deliberate limits, which protect the business rather than the admin:

1. The audit log is append-only, enforced by a trigger. No function here can
   edit or delete it. It is the evidence in any dispute with a buyer or supplier.
2. Removal is reversible by default. The permanent purge exists, and is refused
   for a company that carries orders, because the other party's records must
   keep matching.
3. An admin cannot change their own role or delete their own company, so the
   console cannot be locked out of itself.
4. No `service_role` key ever ships in the mobile bundle. Admin power comes
   from the signed-in admin's own session plus these checks — not from a
   master key that anyone unpacking the app would own.

Every destructive action requires a written reason of at least 5 characters,
stored in the audit row.
