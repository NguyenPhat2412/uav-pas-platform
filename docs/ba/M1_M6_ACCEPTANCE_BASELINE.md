# UAV PAS — BA và nghiệm thu M1–M6

Ngày: 2026-10-09. Trạng thái: **DRAFT / cần kiểm kê đầy đủ trước khi chốt mẫu số**.

## Nguồn và giới hạn

Nguồn nghiệp vụ trong repo: `docs/superpowers/specs/2026-10-05-phase1-core-foundation.md`, `docs/superpowers/specs/2026-10-06-phase2-mission-booking-design.md`; nguồn tích hợp: `docs/architecture/`, handoff M1–M6 và các `REMAINING_GAPS.md`. Chưa xác nhận có một tài liệu BA gốc đầy đủ hơn được cung cấp bên ngoài repo; không coi tài liệu tổng hợp này là bản BA gốc đã được stakeholder duyệt.

**Phase 1/Phase 2 nghiệp vụ không phải M1/M2 frontend.** M1–M6 là foundation → Operations → Admin → Customer → Public website → integration. Một domain có thể phục vụ nhiều milestone.

Khách hàng trong fixture hiện dùng `ROLE_PILOT`; không tự tạo role CUSTOMER hoặc suy luận tất cả pilot đều là khách hàng trong mọi use case. Authority là permission/ownership phía backend, không phải tên portal.

Nguồn evidence hiện hành `docs/handoff/m6/evidence/tests/m6-current-isolated-runtime.json` tại `ca8a36b` chứng minh isolated API happy path/auth/ownership/media, không chứng minh toàn bộ BA/browser/production. Các kết quả build/test lưu trong handoff là historical baseline khi source thay đổi.

## Quy tắc traceability

Source boundary inventory hiện tại nằm ở `docs/ba/M1_M6_SOURCE_INVENTORY.md`. Inventory này đã xác nhận các app/package/domain/controller/service/entity/repository/migration có thật; các hàng acceptance bên dưới vẫn cần được tách thành test case nhỏ và gắn API/permission/evidence cụ thể.

Mỗi hàng dưới đây phải được tách tiếp thành requirement/test case đủ nhỏ khi kiểm kê; giữ ID cha để truy vết. Ghi thêm link source BA, route/component, API/method/permission, entity/Flyway version, test ID và evidence cụ thể. Bảng này là danh mục khởi đầu, không phải toàn bộ requirement đã xác nhận.

Status: NOT_VERIFIED = chưa nghiệm thu; PARTIAL = có một phần evidence; BLOCKED = phụ thuộc decision/contract; VERIFIED = mọi acceptance trong hàng đạt trên revision tương ứng. OUT_OF_SCOPE phải có nguồn/approval và không được tính là hoàn thành.

| ID | Milestone / actor | Acceptance cần chứng minh | FE → BE → DB mapping cần ghi | Baseline |
|---|---|---|---|---|
| BA-01 | M1 / developer | 4 build units độc lập, 7 packages dùng đúng boundary, legacy còn chạy | apps/packages/config/lockfiles/workflows | PARTIAL: build evidence có; release gates chưa đủ |
| BA-02 | M1–M6 / maintainer | Required env validated, không có backend secrets trong public bundle; test instance độc lập | env examples → runtime config → isolated DB/storage | PARTIAL |
| BA-03 | M2–M4 / user | Register/login/me/refresh/logout đúng success/error, validation, race/account switch | login UI → auth API → users/tokens/revocation | PARTIAL: API PASS; browser/global logout chưa chứng minh |
| BA-04 | M3 / admin | User management, permission grant/revoke, role templates và lock/unlock có hiệu lực phía server | admin access pages → permissions/users → user/role/permission data | PARTIAL: static/test và role matrix; live revoke/lock chưa kiểm tra |
| BA-05 | M2/M3 / authorized staff | Station create/update/status/location và link resource hợp lệ; invalid/unauthorized bị từ chối | station UI → station API → station/resource FKs | PARTIAL: fixture create có; CRUD đầy đủ chưa nghiệm thu |
| BA-06 | M2/M3 / authorized staff | UAV create/update/station/status/maintenance/history đúng lifecycle | fleet UI → UAV services → UAV/status history | PARTIAL |
| BA-07 | M2/M3 / inventory staff | Equipment CRUD/stock-in/out/reserve/release/transfer/history; không âm/double reserve | inventory UI → inventory commands → balances/reservations/history | PARTIAL: stabilization evidence; browser/concurrency toàn scope cần kiểm tra |
| BA-08 | M2–M4 / media owner | Upload/confirm/private download/metadata/delete nếu hỗ trợ; ownership và expiry | media UI → media API → media links + private MinIO objects | PARTIAL: signed API flow PASS; expiry/browser cần kiểm tra |
| BA-09 | M2/M3 / authorized user | Dashboard totals lấy từ dữ liệu thật, đúng permission và cập nhật sau mutation | dashboard UI → stats API → aggregates | NOT_VERIFIED toàn scope |
| BA-10 | M3 / auditor | Audit ghi actor/action/resource/outcome đúng contract, filter/page; deny trái quyền | audit UI → audit list API → audit records | PARTIAL: admin list PASS; event completeness cần đối chiếu |
| BA-11 | M4 / customer | Active service catalog đúng DTO/năng lực; không bịa pricing/availability | catalog → service API → service definitions | PARTIAL: thiếu pricing/coverage contract trong handoff |
| BA-12 | M4 / customer A | Create draft, sửa draft, validation và submit bằng UI; DB đúng owner | booking/edit UI → create/PATCH/submit → mission | PARTIAL: API create/submit PASS; draft edit UI là gap đã ghi |
| BA-13 | M4 / customer A/B | List/filter/detail/timeline/media chỉ trong scope, kể cả direct ID và pagination | customer views → scoped mission endpoints → ownership | PARTIAL: direct API PASS; browser/list coverage cần hoàn tất |
| BA-14 | M2/M3 / authorized coordinator | Confirm/reject, assign station/UAV/operator đúng quyền, trạng thái, availability | assignment UI → mission commands → mission/resources/events | PARTIAL: isolated API happy path PASS |
| BA-15 | M2 / coordinator | Reserve equipment và READY chỉ khi đủ prerequisite, mọi failure rollback | resources UI → transactional reservation → mission/inventory | PARTIAL |
| BA-16 | M2 / assigned operator | Accept/ready/start/complete đúng state; unassigned operator không thao tác được | operator UI → lifecycle API → mission/event/resource release | PARTIAL: assigned happy path PASS |
| BA-17 | M2–M4 / authorized actor | Cancel/reject/fail, repeated/invalid transition và retry không gây side effect sai | relevant UI/actions → state machine → atomic updates/audit | NOT_VERIFIED đầy đủ runtime |
| BA-18 | M2–M4 / concurrent actors | Trùng UAV/operator/time window, tranh reserve tồn kho được xử lý nhất quán | UI error feedback → conflict checks → PostgreSQL locking/constraints | NOT_VERIFIED toàn flow đồng thời |
| BA-19 | M4 / customer | Profile/password/preferences: xác định in-scope và contract trước triển khai | customer account → verified APIs → user/preferences | BLOCKED: contract chưa xác nhận theo M4 gaps |
| BA-20 | M3 / admin | Organizations/packages/quotas/reports/settings: quyết định scope từng mục; không giả API | admin nav → verified service contracts → entities | BLOCKED: backend/scope chưa xác nhận theo M3 gaps |
| BA-21 | M5 / visitor | Public pages/SEO/meta/canonical/sitemap/CTA đúng capability; link/deep link an toàn | web → customer navigation/auth return target | PARTIAL: anonymous/browser evidence có |
| BA-22 | M5 / visitor/content owner | Pricing/privacy/terms/contact có nội dung và hành vi được xác nhận | public content/form → approved API nếu có | BLOCKED: nội dung/contact contract chưa có |
| BA-23 | M2–M5 / all users | Loading/empty/error/forbidden states, form validation, keyboard/focus/mobile không overflow | relevant components/routes → API error contract | PARTIAL: anonymous viewports có; authenticated cần làm |
| BA-24 | M6 / user | Login một session qua approved multi-origin topology, CSRF/redirect/refresh/logout/revocation đúng | shared auth + 4 apps → approved auth contract → session/token storage | BLOCKED: backend auth approval + implementation |
| BA-25 | M6 / customer/operator/admin | Full UI business flow từ booking đến completion/media/audit; dữ liệu đúng DB | 4 apps + backend + PostgreSQL/MinIO | PARTIAL: API PASS; authenticated browser NOT_VERIFIED |
| BA-26 | M1/M6 / DB maintainer | ERD/dictionary khớp schema, fresh migration và upgrade baseline bảo toàn dữ liệu | domain mappings → Flyway → PostgreSQL | NOT_VERIFIED đủ fresh + upgrade evidence |
| BA-27 | M6 / operator | Restart persistence và restore DB + liên kết objects hoạt động | backend/storage config → volume/backup/restore | NOT_VERIFIED; disposable tmpfs không chứng minh durability |
| BA-28 | M6 / QA | Tests tái lập, seed idempotent, evidence sạch secrets và gắn source revision | checked-in tests/fixtures → isolated stack | PARTIAL: có evidence; cần suite tái lập toàn bộ |
| BA-29 | M6 / security | Dependency advisory remediation và repo security coverage đóng hợp lệ | root/legacy lockfiles + all release surfaces | PARTIAL: 5 high dev entries; scan partial |
| BA-30 | M6 / release engineer | Hosted CI gates toàn bộ units/integration/browser, shared consumers chạy đủ | workflows → artifacts/test services | BLOCKED: chưa có hosted evidence đầy đủ |
| BA-31 | M6 / release engineer | Staging HTTPS/origins/health/browser/rollback đạt cùng revision | deployment config → staging stack | BLOCKED: môi trường/quyền chưa xác nhận |
| BA-32 | M1–M6 / maintainer | Clean code có regression; docs/contract/schema/evidence/commits khớp | all touched slices | NOT_VERIFIED trên toàn scope |

## Ngoài scope đã có nguồn

Phase 1/2 specs loại AI detection/processing, SAR, payments/subscriptions/entitlements, e-learning, quiz/certificate/training authorization khỏi phạm vi tương ứng. Giữ trong backlog sản phẩm và đối chiếu BA gốc nếu có; không xóa khỏi roadmap hay gọi chúng hoàn thiện. 3D GLB/telemetry, contact backend, nội dung pháp lý/giá và tính năng chưa có contract cần quyết định riêng theo handoff M2–M5.

## Đo tiến độ

Chưa công bố tỷ lệ toàn sản phẩm: 32 hàng trên là nhóm acceptance sơ bộ, có nhiều tiêu chí con và scope chưa chốt. Sau kiểm kê, báo số required requirements VERIFIED / tổng required requirements; kèm BLOCKED/FAIL/NOT_VERIFIED và danh sách exclusions đã xác nhận. Cập nhật evidence tại từng hàng trước khi đổi status.
