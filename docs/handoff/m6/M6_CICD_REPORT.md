# M6 CI/CD report

> **Cập nhật tích hợp main — 16/10/2026:** xem [M6_MAIN_INTEGRATION_2026_10_16.md](M6_MAIN_INTEGRATION_2026_10_16.md) cho source và kiểm chứng mới nhất. Phần dưới giữ lịch sử của nhánh/lượt kiểm tương ứng; migration hồ sơ hiện là V10, bảo trì là V9, auth browser giữ cookie của main. Toàn hệ thống vẫn PARTIAL / NOT_READY.

**Status: PARTIAL.** The existing workflow .github/workflows/m1-foundation.yml runs root workspace lint/typecheck/tests/build and the legacy frontend checks on push/PR. Local equivalents all pass.

Gaps:

- Workflow is named M1 and has no four-app path-specific jobs.
- No backend Maven job is defined.
- No security audit or security-scan gate is defined.
- No deployment artifact promotion, environment separation, staging health gate or rollback automation is defined.
- Hosted CI was not claimed or executed.

Recommendation: add a reviewed M6 integration workflow after the backend/API and SSO contracts are ready; include Java 21/Maven, four standalone artifacts, legacy regression, dependency/security policy and staging health checks.
