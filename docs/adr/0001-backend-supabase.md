# ADR 0001: Supabase as the MVP backend

- Status: accepted (2026-10-08). The founder delegated the choice; email OTP login and a buyer + supplier + admin scope were chosen by the founder.
- Context: there is no backend and only a 6-month runway. The team is small. Authorization must be server-side.
- Decision: Supabase (Postgres 17, Auth, Realtime) in `ap-south-1`. All writes go through `SECURITY DEFINER` functions; reads are protected by RLS; the client holds only the publishable key.
- Consequences:
  - It is fast to ship, and the security logic lives in SQL that is versioned in `supabase/migrations` and tested by `supabase/tests`.
  - It ties us to one vendor. That is mitigated because the business logic is plain Postgres SQL and portable to any Postgres host.
  - Hosting is outside Oman, so data residency must be confirmed by counsel (LAUNCH_READINESS B5).
  - The free plan has no backups, so the Pro plan is required before launch (B9).
- Revisit when: a custom API is needed for integrations (ERP, carriers, payments), or a regulator requires in-country hosting.
