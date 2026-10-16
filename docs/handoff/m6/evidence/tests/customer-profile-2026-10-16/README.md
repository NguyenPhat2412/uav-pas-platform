# Customer profile verification evidence

See [scope report](../../../M6_CUSTOMER_PROFILE_2026_10_16.md).

Final results: full-backend-final-summary.json; root-gates.json; legacy-gates.json; browser-profile.json (12 groups), browser-profile-recovery.json (3 groups). Baseline/RED logs are deliberately failing pre-fix runs, not current failures. Review finding was fixed; see review.md.

Scripts use the existing local Node/Java/Docker/Playwright installations. Run from repository root. runtime.py infra → backend → seed; gates.py root/legacy; runtime.py frontends customer/admin; browser-profile.mjs and browser-profile-recovery.mjs. backend-tests.py creates a separate disposable suite database and unique test schemas. runtime.py cleanup removes owned services and private credentials. Do not run against production or reuse another stack's credentials. Ensure isolated ports are free. No dependencies installed/upgraded.

Screenshots live under /Volumes/D/Codex/outputs/uav-customer-profile-20261016; manifest provides paths and hashes. Only sanitized test totals and endpoint/status evidence are retained here. No environment file, raw Maven XML, token, password or signed download URL is included.
