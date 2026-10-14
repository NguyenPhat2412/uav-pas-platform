# Handoff document register

Inspection basis: repository `HEAD` `6ecc85111a28e53679b2a6d8ac7ec93730d80be4` on `feat/clean-architecture-auth`, inspected 2026-10-07. This register is an index of the final handoff package. Status labels describe the evidence available in this checkout; they do not promote partial or environment-gated checks to verified behavior.

## Final handoff package

- `SESSION_COORDINATION.md` — active-session ownership, no-overwrite rules, and handoff protocol for the shared checkout.

| Artifact | Purpose | Evidence basis | Status |
|---|---|---|---|
| [REQUIREMENT_IMPLEMENTATION_MATRIX.md](REQUIREMENT_IMPLEMENTATION_MATRIX.md) | Requirement-to-route, service, persistence, permission and test traceability | Current source plus current and historical evidence, with explicit status per requirement | Current |
| [BACKEND_BUSINESS_VERIFICATION.md](BACKEND_BUSINESS_VERIFICATION.md) | Backend behavior, authorization, business-rule findings and unresolved risks | Source inspection and current Maven report; environment-gated tests called out | Current |
| [API_PERMISSION_MATRIX.md](API_PERMISSION_MATRIX.md) | Controller route, request/response, permission and error contract | Controller annotations and sanitized 64-path OpenAPI export | Current |
| [CURRENT_PERMISSION_MATRIX.md](CURRENT_PERMISSION_MATRIX.md) | Permission registry, role templates, precedence and recovery guard | `PermissionCode`, initializers, services and access tests | Current |
| [DATABASE_MIGRATION_REPORT.md](DATABASE_MIGRATION_REPORT.md) | Migration/profile state, locking, idempotency and database limits | Flyway files, runtime configuration and migration tests | Current |
| [FRONTEND_UI_VERIFICATION.md](FRONTEND_UI_VERIFICATION.md) | Route, UI state, session/query behavior and browser evidence | Current frontend source, build/lint/typecheck/session tests and selected browser traces | Current |
| [TEST_VERIFICATION_REPORT.md](TEST_VERIFICATION_REPORT.md) | Reproducible command results and coverage limits | Saved exit files and sanitized logs under `evidence/test-results/` | Current |
| [FINAL_INTEGRATION_HANDOFF.md](FINAL_INTEGRATION_HANDOFF.md) | Executive integration result, module statuses, security/data findings, gaps and next goal | All current final reports and admissible evidence in this package | Current |
| [REMAINING_GAPS_BACKLOG.md](REMAINING_GAPS_BACKLOG.md) | Prioritized backlog with acceptance criteria and ownership boundaries | Confirmed findings from current source and evidence | Current |
| [CURRENT_STATE.txt](CURRENT_STATE.txt) | Repository, branch, worktree, SHA and working-tree snapshot | Read-only Git inspection at package finalization | Historical (`6ecc851`) |
| [DOC_SYNC_2026-10-14_b3d8f9b.md](DOC_SYNC_2026-10-14_b3d8f9b.md) | 2026-10-14 synchronization report covering M1–M6 multi-app architecture, VJU UI/UX alignment, and 4-layer exception handling | Current `main` at `b3d8f9b` | Current |
| [EXCEPTION_HANDLING_ARCHITECTURE.md](EXCEPTION_HANDLING_ARCHITECTURE.md) | 4-layer exception handling specification (Spring Boot `GlobalExceptionHandler`, `@uav/api-client`, TanStack Query, Next.js `error.tsx`/`not-found.tsx`) | `GlobalExceptionHandlerTest` (6/6 PASS) + `typecheck` (11/11 PASS) | Current |
| [UI_UX_ALIGNMENT_AND_FLOWS_REPORT.md](UI_UX_ALIGNMENT_AND_FLOWS_REPORT.md) | Collapsible sidebar, Bento frame system, SAR & AI Cockpit (`KV260`), and Customer Portal end-to-end flows | Visual browser verification + 28/28 frontend tests PASS | Current |

## Evidence map

| Location | Contents | Interpretation |
|---|---|---|
| `evidence/test-results/` | Backend/frontend test, typecheck, lint, build, health and OpenAPI logs with exit files | Current verification captured for this handoff |
| `../evidence/` (handoff parent) | Browser traces, API snapshots, stabilization attempts, migration rehearsals and runtime logs | Mixed current and historical evidence; each final report identifies what is admissible. `goal-audit-*` snapshots retain backup-era provenance and are historical only. |
| `evidence/screenshots/` | Access-control and responsive UI captures | Visual evidence for the flows named in `FRONTEND_UI_VERIFICATION.md` |
| `../PHASE_1_HANDOFF.md` | Phase-1 implementation handoff | Historical project handoff context |
| `../PHASE_1_STABILIZATION_REPORT.md` | Stabilization findings and actions | Historical context; defer to final reports for current status |
| `../../superpowers/specs/` and `../../superpowers/plans/` | Design and implementation plans | Requirements/design provenance, not runtime proof |

## Reading rules

- `VERIFIED` in a final report means the caller/API, rule, authorization, persistence and an appropriate test or runtime trace are all evidenced together.
- `PARTIAL` and `IMPLEMENTED_NOT_VERIFIED` are intentional release classifications. They identify missing browser, HTTP, PostgreSQL, MinIO or end-to-end proof.
- The default Maven suite passed with six environment-gated stabilization tests skipped. A separate fresh disposable PostgreSQL stabilization run passed all five gated cases; configured MinIO binary-transfer behavior remains unverified because the image pull failed.
- The final reports are source/audit artifacts. They do not change application code, schema, databases or external services.

## Baseline and checkout integrity

`HEAD` is `6ecc85111a28e53679b2a6d8ac7ec93730d80be4`, matching both `origin/main` and `origin/feat/clean-architecture-auth` at inspection. The package was created without production-source changes; the final checkout contains untracked handoff evidence and reports, with zero tracked modifications. See [CURRENT_STATE.txt](CURRENT_STATE.txt) and [FILE_DIFF_AUDIT.md](FILE_DIFF_AUDIT.md) for the exact classification.
