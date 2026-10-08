# BARQ — Architecture Review

_Baseline review of an empty repository: there is no code to review, so this is a proposed architecture plus the decisions needed. Nothing below is implemented._

## 1. Existing architecture
None. Greenfield. This is an advantage: no migration debt.

## 2. Proposed shape: modular monolith, two deployables

```
[ Expo app (buyer/supplier/logistics) ]        [ Admin web console (later) ]
              \                                      /
               +------------- HTTPS API ------------+
                       Backend modular monolith
   auth | companies | rfq | quotes | orders | logistics | notifications | audit | files | admin
                              |
                   Postgres + private object storage + job queue
```

**Rules**
- **All authorization is server-side**, enforced per request by (user, company, role) with row-level tenancy. The client never decides access; client role checks are UX only.
- Mobile bundle holds **no secrets** (public config only).
- One app binary with role-based route groups (`(buyer)`, `(supplier)`, `(logistics)`) via Expo Router; admin is a **separate web console**, never shipped in the mobile bundle.
- Domain logic (state machines, BARQ Score, money, validation) lives in a framework-free `domain/` package so it is unit-testable and can be shared with the backend (e.g., a TypeScript monorepo).

## 3. Client structure (adapting the brief's suggestion)
```
src/
  app/          Expo Router routes only (thin)
  features/     auth, dashboard, rfq, quotes, suppliers, orders, logistics, tracking, notifications, profile
  domain/       models, state machines, scoring, money (integer baisa), permissions (UX only)
  services/     api client, storage (SecureStore), analytics, logging, files
  ui/           design-system components + tokens
  i18n/         ar (default), en; formatters
  config/       typed env access
```
Each feature owns its screens, hooks, and API calls; features do not import each other's internals.

## 4. Key technical choices (proposed; each needs an ADR)
| Concern | Proposal | Reason / caveat |
|---|---|---|
| Framework | Expo (current SDK) + RN + Expo Router + strict TS | Per brief; verify SDK version at scaffold time |
| Server state | TanStack Query | Retries, caching, pagination, offline-tolerant; maintained, Expo-compatible |
| Client state | Minimal (React context / Zustand only if needed) | Avoid premature global state |
| Forms/validation | react-hook-form + zod, schemas shared with backend | One validation source |
| i18n | i18next or Expo Localization + RN `I18nManager` for RTL | RTL toggling needs app reload; test explicitly |
| Secure storage | expo-secure-store for tokens | Never AsyncStorage for credentials |
| Testing | Jest + React Native Testing Library; Maestro or Detox for E2E | Decide at M1 after Expo compatibility check |
| Backend | **Undecided** — see §6 | Security/auth-sensitive: founder decision |

Each dependency requires the maintenance/size/security/Expo-compat check from brief §7 recorded in its ADR.

## 5. Cross-cutting designs
- **State machines:** RFQ, Quote, Order, Shipment as typed transition tables; invalid transitions rejected on the server; every transition emits an audit event.
- **Idempotency:** client generates an idempotency key per create/accept action; server dedupes. Double-tap guard in UI is secondary.
- **Deadlines:** server-authoritative timestamps; client countdown is display only.
- **Audit log:** append-only, written server-side, no user write path.
- **Files:** private bucket, signed short-lived URLs, MIME+extension+size checks, malware-scan hook, access audited.
- **Quotes:** immutable revisions (never overwrite) so price changes are auditable; edit rules and sealed/visible policy to be decided (R12).
- **Observability:** logger and crash-reporting interfaces from day one; vendor integration deferred.
- **Mock layer:** API client behind an interface; `MockApi` implementation clearly labelled (banner + `isMock` flag on every entity) until the real backend exists.

## 6. Decisions requiring the founder (STOP-and-explain items, brief §36)
1. **Backend stack & hosting** (e.g., TypeScript/NestJS+Postgres vs. managed BaaS such as Supabase). Trade-off: BaaS is fastest to MVP but concentrates authorization in RLS policies and creates vendor lock-in; custom API costs more time. Data-residency implications for Oman unknown → verify with counsel.
2. **Authentication design:** phone-OTP vs email+password vs both; SMS provider and sender-ID registration in Oman; session/refresh policy. Security-sensitive.
3. **Monetization** (commission, subscription, lead fee): affects off-platform leakage controls (R07) and payment-licensing questions.
4. **Initial vertical** (HVAC/MEP/electrical suggested) — drives categories and supplier seeding.
5. **Supplier/admin surface:** mobile-only is likely insufficient for suppliers who price from desks; confirm web portal timing.

## 7. Review findings
- Mockup's "reverse auction" semantics, one-tap accept, and auto-highlighting need product changes before building (see PROJECT_STATUS §2).
- No existing code to refactor or delete; avoid scaffolding features not in `MVP_SCOPE.md`.
