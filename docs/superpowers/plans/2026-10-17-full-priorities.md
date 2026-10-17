# UAV PAS Full Priorities Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development task-by-task. Root coordinates shared integration and validation; workers read only their task brief.

**Goal:** Complete the three approved priorities with evidence and updated BA, preserving auth contract and existing user localhost runtime.

**Architecture:** Keep the Spring monolith and four portals/legacy. Use transactional persistence for consistency, explicit user-visible status for asynchronous work, and disposable test infrastructure. Implement decisions only after user answers.

**Tech Stack:** Java 21, Spring Boot, PostgreSQL 16, MinIO pinned source build, Next.js/React, Node 20, Playwright.

## Global Constraints

- Baseline 55c2fd7464f6f653b89aaca3166dc39d9adf142a. Work only in /Volumes/D/Codex/projects/uav-pas-main-integration, branch codex/full-priorities-20261017.
- Do not change auth endpoints, request/response contracts, cookie names, CSRF header contract or session policy.
- No reset, rebase, force-push, main mutation or production deployment. Workers do not commit/push. Root packages after verification.
- No major dependency upgrades. Do not remove assertions, disable tests or fake success to make gates pass.
- No passwords, access/refresh tokens, signed URLs or secret values in evidence, screenshots, reports or tracked files.
- Do not stop user localhost processes on 3100–3104/18080 or containers main-integration-20261016. Never occupy 8080. New test ports: FE 3200–3204, backend 18081, PostgreSQL 55445, MinIO 9024/9025.
- Preserve terminal media immutability, customer ownership, acceptance invalidation, optimistic mission/profile revisions and resource-release invariants.
- Business policy questions remain pending until explicitly answered. Do not infer an answer from waiting.
- Temporary scripts/private configuration under work/full-priorities-20261017; user-facing artifacts under /Volumes/D/Codex/outputs/uav-pas-full-priorities-20261017.
- Use graph discovery first; files excluded by graph may be read directly. Read applicable AGENTS.md and local Next.js guide before UI code changes.
- No worker subagents. Root performs task review and final review. Report exact tests, commands, outcomes and unverified scope.

### Task 1: Public Vietnamese and accessibility

**Files:** apps/web/app/**, apps/web/src/**, tests/m5-web.test.mjs only when existing English assertions need updating. No shared/other app/backend edits.
**Interfaces:** Existing public routes, CustomerCta/portal URLs and metadata remain stable. No new contact endpoint or prices.
- [ ] Read all public pages/components/content and the relevant Next.js local guide.
- [ ] Translate all visible English UI/metadata/accessibility labels to natural Vietnamese; preserve proper names/technical identifiers. Contact states no configured contact channel, directs to supported customer workflow. Pricing states no approved public price.
- [ ] Keep current architecture/layout; fix actual keyboard focus, mobile overflow and reduced-motion problems found in touched public pages. Do not redesign or add speculative features.
- [ ] Run web lint/typecheck/test/build plus M5 contracts with Node 20. Do not write tests mirroring static copy.
- [ ] Root runs rendered desktop/mobile, navigation, keyboard and error checks after new runtime starts. Worker returns report and exact file list; no commit.

### Task 2: Inventory, quota, reporting and billing correctness

**Files:** backend modules inventory/billing/reporting/mission, related tests/new Flyway versions; admin/customer/operations reporting/billing UI and shared types as necessary.
**Interfaces:** Existing auth remains; new business fields must be additive and coordinated across consumers. Policy decisions are stored in the ledger before implementation.
- [ ] Reproduce concurrent quota increments, initial-quota creation and transfer replay/different payload conflicts in integration tests with PostgreSQL.
- [ ] Fix proven consistency bugs with locking/atomic writes and stable conflict responses; retain audit and rollback.
- [ ] Correct report labels to accurately describe planned duration and verified detections; do not invent actual-flight or rescue outcomes. Add tests with draft/cancelled/completed and role-scoped data.
- [ ] After decisions, implement the selected quota time basis, invoice enable/price policy and failure behavior, with idempotency and visible pending/error status where selected.
- [ ] Verify two missions completing for one customer, repeated commands, invoice failure, rollback and permissions. Root performs UI/database reconciliation and independent task review.

### Task 3: Media lifecycle

**Files:** backend media module/storage/migrations/tests; operations/customer/legacy media upload UI and shared helpers.
**Interfaces:** Existing register→signed upload→confirm→link flow and terminal locking remain. Limits/cleanup only after policy approval.
- [ ] Add failing tests for approved MIME/size boundaries, mismatch bytes, expired URL, unconfirmed cleanup vs concurrent confirm and storage deletion failure.
- [ ] Implement server policy and consistent UI messages; verified files never silently purged. Use durable retry state for deletion rather than log-only failure.
- [ ] Verify the selected unconfirmed retention and ownership safeguards on disposable PostgreSQL/MinIO, including races and crash/retry.
- [ ] Browser upload/expiry/recovery and mobile checks, then task review.

### Task 4: Webhook truthfulness and independent integrations

**Files:** backend webhook module/tests; admin webhook page/services/types, reporting presentation if necessary.
**Interfaces:** Keep auth contract; external delivery is never claimed from a hostname substring or default UI row.
- [ ] Reproduce fake-success branch with a controlled transport test; inspect security boundaries and event registration/delivery lifecycle.
- [ ] Replace deceptive success with explicit simulation or actual verified delivery, using controlled test receivers only. Preserve SSRF boundaries and no external sends.
- [ ] Add retry/idempotency and delivery-state coverage according to existing contract; UI must distinguish pending/succeeded/failed/simulated.
- [ ] Verify permission denial, receiver timeout/non-2xx, duplicate events and actual response handling; review.

### Task 5: CI, security, dependency and deployment validation

**Files:** .github/workflows/m1-foundation.yml, scripts/e2e/**, test configuration, root/legacy lockfiles for compatible fixes, infra/staging and deployment docs.
**Interfaces:** Test stack is disposable with dynamically generated secrets and isolated ports; CI commands use checked-in reproducible scripts.
- [ ] Build reusable browser E2E runner using installed Playwright; add pinned dev dependency only if CI needs it, without major existing-dependency upgrades.
- [ ] Add CI browser flow for login/profile/mission handover/ownership/logout and safe artifact upload; implement service readiness and cleanup on failure.
- [ ] Run npm audit root/legacy prod/full and compatible remediation, then regression gates.
- [ ] Run standard security scan with preflight/independent audit; validate findings once and fix in-scope vulnerabilities without auth contract change. Record coverage and remaining gaps honestly.
- [ ] Verify disposable DB+object backup/restore, restart durability and rollback rehearsal. Define a bounded local load test; do not equate it with unapproved production SLA.
- [ ] Request staging hostname/environment information; prepare concrete configuration and run available HTTPS checks. Mark unavailable real staging/hardware explicitly.

### Task 6: Final integration, BA v3 and handoff

**Files:** docs/handoff/m6/, docs/architecture/, BA source/traceability under docs/ba and user DOCX/PDF outputs.
- [ ] Run all FE root/legacy gates, full Maven with disposable PostgreSQL/MinIO, browser desktop/mobile/multi-engine where installed, and final security/diff review.
- [ ] Update BA rules and FR→screen/API/test/evidence with current status and user decisions; produce full BA v3 DOCX/PDF in black/white with bold headings.
- [ ] Preserve existing user demo data; refresh user localhost builds only after validation, with backup before schema migration and explicit visible change note.
- [ ] Record PASS/FAIL/BLOCKED, commands/endpoints/evidence, fixed errors and untested scope. Clean only newly owned test infrastructure, leave requested user services running.
- [ ] No main push or production deploy as part of routine finalization without concrete release authorization. All changes remain reviewable.
