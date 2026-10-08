# BARQ — Launch Readiness (MVP)

_Status as of 2026-10-08. The software MVP is built; the product is **not yet launch-ready**. This file lists exactly what is done, what was verified, and what still blocks a public launch._

## 1. What is built

| Area | State |
|---|---|
| Backend | Supabase project `barq-mvp` (region ap-south-1, Mumbai), Postgres 17 |
| Schema | companies, profiles, rfqs, quotes, quote_revisions, orders, order_events, notifications, audit_log (`supabase/migrations/`) |
| Security model | RLS on every table; clients can only `SELECT`; every write goes through a server function that checks the caller, enforces the state machine, writes an audit row and notifies the other party |
| Auth | Email one-time code (no passwords); session stored in the device keychain (SecureStore, chunked) |
| Buyer | Onboarding, create RFQ (idempotent), RFQ list with live countdown, quote comparison with BARQ Score (price, speed, verification, terms; no invented ratings), award with explicit confirmation, cancel RFQ, order tracking, confirm receipt |
| Supplier | Onboarding with categories, inbox of matching RFQs (buyer identity hidden until award), submit / revise (max 5 versions, full history kept) / withdraw quote, fulfilment steps (processing → ready → shipped → delivered) with notes |
| Admin | Overview counts, company verification (levels 0–3 with reason, audited), audit log viewer, deletion requests arrive as notifications |
| Trust controls | Unverified companies cannot publish RFQs or quote; 20 RFQs/day/company limit; one order per RFQ; suppliers never see each other's prices; buyer identity hidden before award |
| Notifications | In-app list, unread badges, live updates via Realtime |
| App store requirements | In-app account deletion request (completed by admin per retention policy) |
| i18n | Arabic (default, RTL) and English, live switch, persisted |

## 2. Verified

- **Permission scenario** (`supabase/tests/rls_scenario.sql`), 58 checks over 6 simulated users (buyer, 3 suppliers, unrelated buyer, admin). Covers cross-company isolation, hidden buyer identity, idempotent RFQ creation and award, the state machine (skipped and backward steps rejected), direct table writes denied, anonymous access denied, and admin-only verification and audit. All pass after fixing 2 test-expectation errors (and making the invalid-role check explicit).
- Supabase security advisor: no missing-RLS findings. The only warnings are the 12 business functions being callable by signed-in users. That is intentional (they are the API) and each checks the caller.
- Mobile: strict TypeScript passes; 5 domain unit tests pass; iOS and Android production bundles build; sign-in and error states render (screenshot check).
- **Not verified here:** the app talking to the live backend. The build sandbox cannot reach supabase.co. The first end-to-end run is on your phone (see §4).

## 3. Launch blockers (must be done before inviting real companies)

| # | Blocker | Who | Notes |
|---|---|---|---|
| B1 | **Email code template** | You (Supabase dashboard, 2 min) | Auth → Email Templates → "Magic Link" **and** "Confirm signup": include `{{ .Token }}` (text in §5). Without it users receive a link instead of a 6-digit code. |
| B2 | **Custom SMTP** (e.g. Resend, SES, Zoho) | You | Supabase's built-in mailer is for testing only: very low hourly limit and it may only deliver to project team addresses. Configure Auth → SMTP with a BARQ domain sender (SPF/DKIM). |
| B3 | **First admin account** | You + me | Sign in once with the admin email, then run the SQL in `supabase/README.md` (or ask me with the email address). |
| B4 | **Privacy policy & terms** | Legal counsel | Required by the stores and Oman's Personal Data Protection Law (Royal Decree 6/2022; obligations to be confirmed by counsel). Links in the app currently say "Soon". |
| B5 | **Data residency** | Counsel | Data is hosted in Mumbai (closest Supabase region). Confirm whether cross-border hosting of company/contact data is acceptable or a GCC region is required. |
| B6 | **Supplier verification procedure** | Ops | Written checklist for levels 1–3 (CR certificate, contact verification, site/visit). The app records decisions, it does not verify documents itself. |
| B7 | **Support channel** | Ops | Real support email/WhatsApp number (placeholder `support@barq.om` in the app). |
| B8 | **Store accounts & builds** | You | Apple Developer (USD 99/yr) and Google Play (USD 25 once); app icon/splash with BARQ brand (currently Expo defaults); `eas build` + store listings + screenshots. |
| B9 | **Supabase plan** | You | Free plan pauses inactive projects and has no backups. Use Pro (≈USD 25/month) before launch for daily backups and no pausing. |
| B11 | **Remove demo mode, test sign-in & test accounts** | You + me | Demo mode embeds the test passwords in the app bundle. Set `EXPO_PUBLIC_DEMO_MODE=false` and `EXPO_PUBLIC_TEST_LOGIN=false`, remove the `EXPO_PUBLIC_DEMO_*` values, and change or delete the test accounts **before any real company signs up**. Then delete the `*@test.barq.om` users and their TEST companies (they are marked `test_account` in user metadata and `test_account.created` in the audit log). |
| B10 | **Retention & deletion policy** | Counsel + Ops | Decide what happens to RFQs/orders when a user asks for deletion (anonymise vs keep for N years). |

## 4. Deferred (post-MVP backlog, by design)

Attachments (private storage + scanning), push notifications (needs a development build), multiple users per company / invitations, supplier ratings after completed orders, logistics provider marketplace, international freight, payments/escrow (licensing question), web admin console, analytics and crash reporting vendors, E2E test automation (Maestro), ERP integrations.

## 5. Email template text (B1)

Use for both **Magic Link** and **Confirm signup**:

```html
<div dir="rtl" style="font-family:Arial,sans-serif">
  <h2>رمز الدخول إلى بارق</h2>
  <p>استخدم هذا الرمز لتسجيل الدخول. صالح لفترة قصيرة ولمرة واحدة:</p>
  <p style="font-size:28px;font-weight:bold;letter-spacing:6px">{{ .Token }}</p>
  <p>إذا لم تطلب الرمز فتجاهل هذه الرسالة.</p>
</div>
<hr>
<div dir="ltr" style="font-family:Arial,sans-serif">
  <p>Your BARQ sign-in code: <b>{{ .Token }}</b>. If you did not request it, ignore this email.</p>
</div>
```

Subject: `رمز الدخول إلى بارق / Your BARQ code`

## 6. Go / no-go

Launch to a **closed pilot** (invited Muscat buyers and suppliers) once B1–B3, B6, B7 and B9 are done and counsel has cleared B4/B5. Public store release additionally needs B8 and B10.
