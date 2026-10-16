# Evidence — Mission acceptance and handover, 2026-10-16

Final report: ../../../M6_MISSION_HANDOVER_2026_10_16.md (the report is in docs/handoff/m6).

- Baseline HEAD 15936b939b4b0f6c251ad272ffbbc649a464e9dc; uncommitted source fingerprint in source-manifest.json.
- backend-final-summary.json is the last full run: 592 PASS, 0 failures/errors/skips. Earlier FAIL/PASS files are retained, not counted twice.
- root/legacy gates cover lint/typecheck/test/build. Test executions: 81/7.
- browser-handover.json: 13 UI/API-assisted groups. browser-legacy.json: 4 groups. browser-media-lock.json: 1 group. Browser diagnostics are supplementary page smoke checks, not four more business groups.
- Screenshots contain synthetic data only. No signed URLs, credentials, raw response bodies or browser traces are saved.
- scripts/ contains session-specific harnesses using installed Node/Playwright/Chromium paths. They are reproducibility aids, not a CI workflow. Adapt runtime paths on another machine.

To repeat locally: reserve the documented ports first; copy the harnesses into ignored work/uav-mission-handover-20261016; run runtime.py infra, backend-tests.py backend-final, gates.py root and gates.py legacy; run runtime.py backend and wait for readiness, then runtime.py seed and runtime.py frontends. Run browser-handover.mjs. Stop only the owned public web process before starting the legacy standalone build on 3100, then run browser-legacy.mjs. Run browser-media-lock.mjs after the main flow; it uses the synthetic main mission. Do not run --before expecting PASS against fixed code. Finally run runtime.py cleanup. Never copy generated env.json, fixture.json or private logs into evidence. All data is disposable; no production services or port 8080 are used.

The API/state data is real. Intentional upload/response network interruption is injected only for recovery checks. Browser scope excludes staging HTTPS, Safari/Firefox and a complete portal/permission matrix. Missing favicon.ico returns 404 in three portals; no business API 5xx or JS exceptions in final runs.

Packaging note: trailing whitespace and extra EOF blank lines in log copies were removed before commit. Test results and messages are unchanged; before/after file hashes are recorded in publish-verification.json.
