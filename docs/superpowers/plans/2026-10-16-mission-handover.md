# Mission Handover Implementation Plan

> Execute inline using executing-plans. Implementation inline; one read-only final reviewer required by executing-plans. No commits or pushes.

**Goal:** Enforce the three business decisions approved in chat and verify the delivery workflow through the UI.

**Architecture:** Mission locking owns lifecycle consistency; media authorization checks the same mission lifecycle. Existing permissions/auth stay unchanged. Operations/Customer render the approved constraints and results.

**Tech Stack:** Spring Boot/JPA, PostgreSQL, MinIO, Next.js/TypeScript, existing Playwright.

## Global constraints

Use the approved spec `docs/superpowers/specs/2026-10-16-mission-handover-design.md`. No auth contract/dependency changes, production deployment, commits or push. Disposable resources only; raw logs/secrets in ignored work folder, sanitized deliverables under `/Volumes/D/Codex/outputs/uav-mission-handover-20261016`.

## 1. Acceptance gate

Files: Mission entity/service/controller, new MissionAcceptanceRequest, Operations/legacy service/types, mission presentation, integration/controller tests.

- [x] Add regressions for READY/START before accept, stale version/repeated accept, wrong operator, conflict after READY, resource reassignment reset.
- [x] Run regression suite before changes; retain actual failures.
- [x] Implement required acceptance request `record MissionAcceptanceRequest(@NotNull @Min(0) Long expectedVersion)`, compare under mission lock, flush before response. Check accepted flag at READY/START. Conflict demotes READY to RESOURCE_RESERVED.
- [x] Update clients to send `{expectedVersion: mission.version}` from displayed mission; never fetch new version then silently accept old view.
- [x] Re-run acceptance cases.

## 2. Completion and immutable handover files

Files: MissionCompletionRequest, IMissionService, MissionMediaRepository, IMediaAccessService, IMediaService, S3CompatibleStorageService, upload clients and media tests.

- [x] Regressions for blank/missing/oversized completion fields, required file by all five types, unconfirmed/non-result/deleted/wrong mission files, terminal media writes and resource rollback.
- [x] Run regressions against baseline.
- [x] Implement note validation and result lookup: `mediaRole in (OUTPUT,DOCUMENT) && media.confirmed && !media.deleted`. Gate COMPLETE before effects; use mission lock for terminal media writes.
- [x] Sign upload with `ifNoneMatch("*")`; send signed header from existing upload clients. Test repeated PUT against real MinIO, missing signed header and original download integrity.
- [x] Test contending transactions and full terminal-state API matrix on PostgreSQL.

## 3. Rendered flow

Files: Operations mission detail/presentation/workflows, Customer mission detail/types, legacy mission detail/services, existing frontend helper tests.

- [x] Required completion inputs and actionable checklist, role selector OUTPUT/DOCUMENT/FLIGHT_DATA, retained form on failures, contextual download action, customer outcome panel.
- [x] Cover helper behavior and API payload validation.
- [x] Build and start Customer/Operations/Admin with disposable backend; run actual UI main flow and negative cases, desktop and mobile. Browser plugin absent, use installed Playwright without dependency changes.

## 4. Final verification and cleanup

- [x] Run `./mvnw -Duav.build.directory=<owned target> test` with PostgreSQL/MinIO stabilization variables, summarize exact counts/failures/skips.
- [x] Run root and legacy `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.
- [x] Inspect screenshots, console and API statuses; distinguish harness errors from product defects.
- [x] Compare protected auth/dependency files, `git diff --check`, document actual coverage/limitations and evidence.
- [x] Stop owned processes/containers, remove secret fixtures/raw logs; leave source changes reviewable and uncommitted.

## Packaging authorization

On 2026-10-16, after implementation verification, the user explicitly requested commit and push. Source commit: `02d4d18`; documentation/evidence is packaged separately on the existing branch. The no-commit/push constraint above applied to implementation, not this subsequent authorized packaging step.
