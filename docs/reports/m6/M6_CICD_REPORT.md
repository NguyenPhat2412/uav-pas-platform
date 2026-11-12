# CI/CD hiện tại — 17/10/2026

Workflow .github/workflows/m1-foundation.yml có5jobs: workspace,legacy,backend,audit,browser. Backend gate kiểm không skip; cleanup thất bại giữ ownership cho bước dự phòng. Reviewed SpecPASS/QualityAPPROVE;8mockedfailuretestsPASS. Portableproductionbrowser16/runner12PASS trên bản frozen725. Hosted workflow chưa chạy cho gói chưa commit này; audit fulldev5HIGH vẫn là thất bại thật, không suppression.

Xem [báo cáo hiện tại và bảng PASS/FAIL/BLOCKED](M6_FULL_PRIORITIES_2026_10_17.md) và [index evidence](evidence/tests/full-priorities-20261017/README.md). Các giới hạn có trong báo cáo hiện tại được giữ nguyên; không suy từ kết quả local thành production-ready.

<details>
<summary>Hồ sơ lịch sử trước 17/10/2026 — không phải trạng thái hiện tại</summary>

Những tiêu đề “mới nhất”, số test, cấu trúc thư mục và trạng thái auth trong phần lưu trữ dưới đây chỉ đúng tại ngày/bản nguồn được ghi. Báo cáo hiện tại phía trên có ưu tiên khi đọc trạng thái hôm nay.

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


</details>
