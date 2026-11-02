# Customer profile implementation plan

> Execute inline using executing-plans and test-driven-development. User approved two fields; no additional implementation approval or commit required. One fresh final reviewer per executing-plans.

- [x] 1. RED: add HTTP/transaction tests in `backend/src/test/java/com/uav/platform/modules/user/UserProfileIntegrationTest.java` and PostgreSQL subclass; prove missing endpoint failure. Add rendered UI baseline assertion.
- [x] 2. Implement `UserProfileController`, profile request/response, `UserProfileService`, repository queries, narrow entity updates, phone uniqueness migration. GET/PATCH self only, validation, revision conflict, atomic privacy-safe audit. Verify targeted H2/PostgreSQL.
- [x] 3. Add profile validation/payload tests in `tests/customer-workflows.test.mjs`; build profile query/form and update `apps/customer/app/(portal)/profile/page.tsx`, header and CSS. No auth/shared session source changes.
- [x] 4. Run full backend tests with disposable PostgreSQL/MinIO, root and legacy lint/typecheck/test/build. Browser checks edit/save/reload/cancel/invalid/duplicate/409/network/account isolation/refresh/logout/mobile/audit.
- [x] 5. One final independent review; reproduce/fix findings; repeat affected tests. Save sanitized evidence/report; clean owned stack; diff check, confirm auth contract and Git unchanged.

## Ledger
- Design: optional name remains optional, phone keeps existing required/unique policy; no new country format policy. Revision describes content, so reverting to identical content is not a conflict.
- Migration safety: fail rather than silently rewrite duplicate existing numbers; only disposable databases are migrated in this task.
- Workspace: temporary scripts in project `work/`, user artifacts in `/Volumes/D/Codex/outputs/uav-customer-profile-20261016` per storage instructions.

## Verification and final review

- RED backend: 10 expected missing-endpoint failures, anonymous test passed. GREEN targeted 22/22; extended suite final 620/620 with 0 skips.
- Profile helper tests RED then GREEN; actual duplicate-phone message test RED then GREEN. Removed obsolete read-only UI assertion.
- Final: fixed duplicate USER_PROFILE label reported by independent reviewer; actual typecheck TS1117 RED then full root gates GREEN, 85/85; legacy gates GREEN, 7/7.
- PostgreSQL migration review caveat resolved by two real PostgreSQL tests for trimmed/blank uniqueness and refusing legacy duplicates without rewriting.
- Browser 12 main + 3 recovery groups PASS; baseline read-only evidence separate. Local Chromium only; admin favicon 404 remains pre-existing and documented.
- No commit/push. Temporary runtime and raw/private logs removed after evidence capture; final cleanup status in evidence final-checks.json.
