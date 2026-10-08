# BARQ — 6-Month Roadmap

Assumes a small team (≈3–5 engineers + design + ops/BD) starting now. **If capacity is smaller, cut scope, not quality** (see R03). Dates are relative to kickoff; no calendar commitments are implied.

## Milestone 1 (Month 1) — Foundation + clickable prototype — _proposed first implementation milestone_

Goal: de-risk decisions and give stakeholders something tangible, without building features outside scope.

| # | Deliverable | Done when |
|---|---|---|
| 1 | ADRs: backend/hosting, auth/OTP, monetization stance, vertical, supplier/admin surface (founder decisions) | ADRs merged, each with risks |
| 2 | Expo scaffold: strict TS, Expo Router, ESLint, Prettier, Jest+RNTL, CI (install→typecheck→lint→test→build check) | CI green on main |
| 3 | `.env.example`, typed config, secrets policy | No secrets in repo; documented |
| 4 | i18n (AR default/EN), RTL, money (integer baisa/OMR 3-dp), date formatting, lint rule against hardcoded UI strings | Unit tests pass; RTL smoke test |
| 5 | Design tokens + core components (button, input, card, badge, chip, states) + `docs/design-system.md` | Rendered in AR and EN |
| 6 | Domain package: RFQ/Quote/Order/Shipment state machines, roles/permissions matrix, BARQ Score v0 | Unit tests for every valid/invalid transition |
| 7 | Mock API behind interface; fictional labelled fixtures | `isMock` banner visible |
| 8 | Clickable buyer prototype: Welcome/Login (UI only) → Dashboard → Create RFQ → Quote comparison → Select (with confirmation) | Walkthrough demo, error/empty/loading states present |
| 9 | Security baseline doc + threat model v1 (`docs/security.md`) | Reviewed |
| 10 | `docs/competitive-analysis.md` from public sources, uncertain claims flagged | Reviewed |

**Exit criteria:** typecheck/lint/tests/build green; founder decisions recorded; prototype demoable; no production claims.

## Month 2 — Procurement core
Real auth + company profile; buyer dashboard; RFQ create/details/lifecycle on real backend; supplier onboarding; supplier RFQ inbox; file upload pipeline v1; audit log service. **Deliverable:** buyer creates RFQ, supplier sees it. Parallel (non-code): recruit pilot suppliers/buyers (R02).

## Month 3 — Marketplace
Quote submit/revise/withdraw with immutable revisions; comparison UI; supplier profile; verification model + admin verification tool; BARQ Score v0 live with visible breakdown; notifications (in-app + push); audit coverage. **Deliverable:** full buyer↔supplier workflow.

## Month 4 — Orders + logistics
Selection→order (idempotent); order lifecycle; logistics request; provider onboarding and workflow (capability flags); delivery offers; shipment status/POD; basic tracking. Providers are onboarded users or mock until contracts exist. **Deliverable:** RFQ → order → logistics → delivered.

## Month 5 — Hardening (Release Candidate 1)
Security review + external pen test if budget allows; authz test suite; rate limiting; offline/retry/idempotency tests; accessibility pass; performance (pagination, list perf); analytics + crash monitoring wired; admin tools (moderation, disputes); E2E suites for the 8 priority flows. **Deliverable:** RC1.

## Month 6 — Pilot + launch prep
Pilot with real users in Muscat; bug fixing only (feature freeze); onboarding materials; supplier verification operations; support & incident-response runbooks; backups/restore drill; privacy/terms reviewed by counsel; app-store prep; production infra + release process. **Deliverable:** launch candidate, go/no-go against `launch checklist` (brief §41).

## Gates
- **After M1:** founder decisions made? If not, do not start M2.
- **After M3:** quotes-per-RFQ and supplier response rate from pilot data. If liquidity is poor, fix supply before building more.
- **After M5:** all launch-checklist engineering items green; legal/operations items tracked separately — a green build is not launch readiness.
