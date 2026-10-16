# BA workflow evidence — 2026-10-15

Local synthetic verification on branch `codex/m1-monorepo-foundation`, HEAD `65d1b23da3d888d1ef8120462f2689da8cffd7cb` plus the working-tree sources listed in `source-manifest.json`.

Read `../../../M6_BA_WORKFLOWS_2026_10_15.md` for scope, fixes and limits. JSON files distinguish API fixture setup/read-back from browser mutations. `final-ui-result.json` deliberately injects one timeline503 and delays a genuine old GET to exercise the load generation guard; it is not a no-fault happy-path result.

Reproduction on this workstation:

1. Review and run `scripts/isolated-runtime.py infra`, then `backend`, then `seed`. It uses disposable Compose project `uav-ui-ba-workflows-20261015`, private random credentials, work directory `work/ba-workflows-20261015`, backend18080/PG55444/MinIO9014. Do not target existing application data.
2. Build frontend with Node20.20.2 and `NEXT_PUBLIC_API_URL=http://127.0.0.1:18080`; then run the runtime helper `frontends`.
3. Seed an active custom service with a non-MissionType code in the disposable `uav_services` catalogue if rerunning the custom-code regression. The script records BLOCKED if no such fixture exists; do not count that case as PASS.
4. Set `UAV_BROWSER_WORK` to the private fixture directory, `UAV_BROWSER_SCREENSHOTS` to an output directory, `PLAYWRIGHT_MODULE` to the installed Playwright module, and `CHROMIUM_EXECUTABLE` to the installed headless Chromium. Run `business.mjs` first (writes mission.json); then `negative.mjs` and `visual.mjs`. Customer/Operations extensions use separate fixture missions/resources. Use fresh future dates when the hardcoded test dates have passed.
5. Run `final-ui.mjs` for public web, delayed GET recovery and note500 boundary. History and serial search scripts exercise actual rendered resource lists.
6. Run runtime helper `cleanup` in a finally block. It removes only its process groups, Compose containers/volumes and private runtime files. No credentials or storage state belong in this evidence directory.

The helper paths describe this workstation; they are not a deployment recipe. Maven test setup uses a separate disposable DB `uav_ba_test_suite` and bucket `uav-ba-infra-test` with opt-in infrastructure environment flags (see backend test setup); secrets are supplied at runtime, never in these logs.

Initial harness failures (changed labels, selector ambiguity, datetime input precision, asynchronous focus and fetch API-property usage) were corrected and rerun. Product defects are called out separately in the report. `operations-uav-search-before-summary.json` records the observed before-fix search gap and its capture limitations.

All production/deployment/security claims remain PARTIAL/NOT_READY. This run does not establish SSO, CSRF, hosted CI, staging parity, full permission/concurrency/accessibility coverage or a full security scan.
