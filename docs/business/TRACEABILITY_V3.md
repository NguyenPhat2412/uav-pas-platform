# 30 Ma trận truy vết và mức bao phủ chi tiết

## 30 1 Quy ước truy vết

Mỗi dòng nối FR với UC/AT, vị trí màn hình/API, lớp kiểm thử và evidence. Ký hiệu vị trí được giải thích bên dưới. Một lớp test có thể bảo vệ nhiều FR, nên không cộng số lớp hoặc số lượt chạy thành tổng duy nhất. PASS luôn đi kèm giới hạn; FR rộng còn PARTIAL khi chỉ một số đường được thử. Các UAT-X trong Chương 29 giữ vai trò kế hoạch chạy lại và không tự đổi sang PASS chỉ vì có ca tương tự.

| Khóa | Màn hình và API chính |
|---|---|
| A | Trang đăng nhập các portal; /auth/register, login, me, refresh, logout |
| U | Admin users/access-control/permissions/role-templates; /users, /permissions, /role-templates |
| R | Operations stations/uavs/inventory/maintenance; /stations, /uavs, /inventory/equipment, /maintenance |
| C | Customer services/missions/create/detail/edit; /uav-services, /missions và lệnh chủ nhiệm vụ |
| O | Operations dispatch/assigned-missions/detail; /missions và lệnh điều phối/thực thi |
| M | Operations và legacy media, kết quả Customer; /media và /missions/{id}/media |
| V | Dashboard/audit/reports; /dashboard, /audit-logs, /reports |
| W | Website và thành phần giao diện chung dưới frontend/apps và frontend/packages |
| P | Customer profile; GET/PATCH /users/profile |
| X | Billing/quota/settings/webhooks; các endpoint Chương 12 |

Tên test dưới đây là điểm tra cứu theo mốc evidence. Tất cả tên lớp test đã được đối chiếu manifest cuối 445 tệp; E21 ghi lượt chạy backend 726 test và E23 ghi activation/live UI. Các mã evidence cũ trong từng dòng vẫn giữ phạm vi lịch sử, không tự chuyển thành nghiệm thu toàn bộ trên live. Tên lớp triển khai và DTO sau tái cấu trúc được ánh xạ ở E21; đổi package không thay meaning FR hoặc tự tạo test PASS mới.

## 30 2 Tài khoản tài nguyên và kho

| FR và UC AT | Vị trí và kiểm thử | Evidence và giới hạn |
|---|---|---|
| FR-01; UC01; AT-25 | A; AuthControllerTest, AuthServiceTest | E14,E17; PASS đường API đã thử; PARTIAL biến thể UI |
| FR-02; UC01; AT-01,02 | A,U; AuthServiceTest, JwtAuthenticationFilterTest | E12,E14,E17; PASS phạm vi đã thử; PARTIAL ma trận khóa trên UI |
| FR-03; UC01,18; AT-03,22 | A; AuthConcurrencyIntegrationTest, AuthConcurrencyPostgresTest, CookieSessionIntegrationTest | E12,E14,E17; PASS API và cạnh tranh; PARTIAL liên miền |
| FR-04; UC15; AT-19,26 | U; UserServiceTest, UserSpecificationsTest, UserControllerTest | E16,E17; PASS source và màn hình đã thử; PARTIAL bộ lọc đầy đủ |
| FR-05; UC15; AT-19 | U; AccessRecoveryTest, Phase1AccessIntegrationTest | E12,E17; PASS backend; PARTIAL toàn ma trận phiên và UI |
| FR-06; UC15; AT-19 | U; PermissionServiceTest, Phase2PermissionRegistryTest, AccessRecoveryTest | E12,E17; PASS kiểm soát đã thử; PARTIAL ngoại lệ endpoint và UI |
| FR-07; UC13; AT-20 | R; StationServiceTest, StationSpecificationsTest | E16,E17; PASS source và smoke; PARTIAL CRUD UI đầy đủ |
| FR-08; UC06,07,13; AT-17 | R,O; ResourceAssignmentValidationIntegrationTest, MissionResourceRedispatchPostgresTest | E14,E17; PASS các guard cục bộ đã thử |
| FR-09; UC13; AT-20 | R; UavServiceTest, UavSpecificationsTest | E16,E17; PASS source và smoke; PARTIAL CRUD UI đầy đủ |
| FR-10; UC13,19,20; AT-20,27 | R; UavMaintenancePolicyTest, UavMaintenanceIntegrationTest | E12,E17; PASS vòng đời đã thử; quá hạn không tự khóa UAV |
| FR-11; UC06; AT-15 | O; MissionConcurrencyContractTest, MissionRedispatchPostgresTest | E12,E17; PASS cạnh tranh PostgreSQL đã thử |
| FR-12; UC14; AT-20 | R; InventoryServiceTest, EquipmentSpecificationsTest | E13,E17; PASS source và màn hình đã thử; PARTIAL CRUD đầy đủ |
| FR-13; UC14; AT-20 | R; InventoryServiceTest, StabilizationPostgresTest | E13,E17; PASS quy trình và phục hồi cục bộ |
| FR-14; UC07,14; AT-15,16 | R,O; MissionResourceRedispatchIntegrationTest, MissionResourceRedispatchPostgresTest | E12,E14,E17; PASS giao dịch và cạnh tranh đã thử |
| FR-15; UC14; AT-20 | R; StabilizationPostgresTest, InventoryServiceTest | E13,E17; PASS backend replay; PARTIAL mọi biến thể UI |
| FR-16; UC14; AT-20,21 | R; InventoryServiceTest, StabilizationPostgresTest | E13,E17; PASS phạm vi đã thử; PARTIAL mọi loại movement |

## 30 3 Nhiệm vụ media và lịch sử

| FR và UC AT | Vị trí và kiểm thử | Evidence và giới hạn |
|---|---|---|
| FR-17; UC02; AT-04 | C,W; ServiceOfferingControllerTest | E14,E16,E17; PASS catalog cục bộ; giá và nội dung cần duyệt |
| FR-18; UC02; AT-04 | C; MissionServiceTest, MissionCodeConcurrencyIntegrationTest, MissionCodeConcurrencyPostgresTest | E14,E17; PASS luồng và mã đồng thời; thiếu BASIC phải báo cấu hình |
| FR-19; UC03,18; AT-13 | C; MissionDraftConcurrencyIntegrationTest, MissionDraftConcurrencyPostgresTest | E12,E17; PASS backend và UI lịch sử; PARTIAL replay toàn bộ sau phát hành |
| FR-20; UC02,18; AT-04,10 | C; MissionDraftConcurrencyIntegrationTest, MissionStateTest | E14,E17; PASS cục bộ |
| FR-21; UC04; AT-05,14,18 | C,O,M; MissionSpecificationsTest, MediaAccessServiceTest, MissionHandoverIntegrationTest | E14,E15,E17; PASS A/B và sai operator; PARTIAL mọi override |
| FR-22; UC10; AT-10,16 | C,O; MissionStateTest, MissionResourceRedispatchPostgresTest | E12,E14,E17; PASS ca backend/UI đã thử; PARTIAL toàn trạng thái UI |
| FR-23; UC05; AT-06,11,16 | O; MissionRejectionIntegrationTest, MissionHandoverIntegrationTest | E12,E14,E17; PASS phạm vi cục bộ đã thử |
| FR-24; UC06; AT-06,17,28 | O; MissionRedispatchIntegrationTest, MissionResourceRedispatchPostgresTest | E12,E14,E17; PASS quy trình và rollback đã thử |
| FR-25; UC07; AT-07,17,28 | O; MissionResourceRedispatchPostgresTest, MissionHandoverIntegrationTest | E14,E17; PASS cục bộ |
| FR-26; UC08; AT-07,14,28 | O; MissionHandoverIntegrationTest, MissionHandoverPostgresTest | E14,E17; PASS stale 409, tiếp nhận lại và terminal |
| FR-27; UC09; AT-07,14 | O; MissionExecutionTest, MissionHandoverIntegrationTest | E14,E17; PASS cục bộ |
| FR-28; UC09; AT-08,09,16,29 | O,C; MissionHandoverPostgresTest, NoteLengthPostgresTest, MissionBillingPolicyTest | E14,E17; PASS cục bộ; invoice failure sau enqueue không đảo hoàn thành |
| FR-29; UC11; AT-14,16 | O; MissionExecutionTest, MissionStateTest, MissionResourceRedispatchPostgresTest | E12,E17; PASS backend; PARTIAL UI fail toàn diện |
| FR-30; UC18; AT-10,13,28 | C,O,R,P; MissionDraftConcurrencyPostgresTest, StabilizationPostgresTest | E12,E13,E14; PASS đường phục hồi được nêu; PARTIAL mọi mutation |
| FR-31; UC12; AT-08,18,30 | M,O; MediaUploadPolicyTest, MediaServiceTest, StabilizationMinioTest | E14,E15,E17; PASS browser/storage; không là quét mã độc |
| FR-32; UC04,12; AT-09,18 | M,C; MediaAccessServiceTest, StabilizationMinioTest | E14,E17; PASS bytes PDF và 403; URL ký là quyền tạm thời |
| FR-33; UC12,22; AT-18,30 | M; MediaLifecyclePostgresMinioTest, MediaAssetSpecificationsTest | E14,E15,E17; PASS backend và preview; xóa object là eventual |
| FR-34; UC04; AT-09 | C,O; MissionMediaTimelineTest, MissionHandoverIntegrationTest | E14,E16,E17; PASS phạm vi đã thử; PARTIAL toàn loại sự kiện |
| FR-35; UC16; AT-09,21 | V; MissionHandoverIntegrationTest (sự kiện bàn giao; không bao phủ mọi mutation) | E14,E16,E17; PASS sự kiện đã đối chiếu; PARTIAL mọi mutation |

## 30 4 Trải nghiệm và các vòng đời hỗ trợ

| FR và UC AT | Vị trí và kiểm thử | Evidence và giới hạn |
|---|---|---|
| FR-36; UC16; AT-21,31 | V; ReportTruthTest, MissionDashboardTest (phạm vi phép đếm đã kiểm thử) | E13,E16,E17; PASS báo cáo/KPI đã thử; PARTIAL mọi chỉ số |
| FR-37; UC17; AT-32 | W; M5 public contracts, public browser checks | E16; PASS source và browser đã thử; PARTIAL duyệt nội dung |
| FR-38; UC18; AT-10,11,28 | W,C,O,U; Frontend route and workflow contracts | E13,E14,E15,E16; PASS màn hình đã thử; PARTIAL mọi trạng thái |
| FR-39; Các UC giao diện; AT-12,32 | W; Browser route, mobile and focused layout evidence | E15,E16; PASS viewport đã thử; PARTIAL browser/device/accessibility |
| FR-40; UC24; AT-33 | P; UserProfileIntegrationTest, UserProfilePostgresTest | E12,E18; PASS phạm vi hồ sơ đã duyệt |
| FR-41; UC01,17; AT-23 | A; CookieSessionIntegrationTest, AuthConcurrencyPostgresTest | E12,E14; PASS contract local; BLOCKED HTTPS/SSO thực |
| FR-42; UC16,21,23; AT-31,34 | X; BillingConfigurationTest, ReportTruthTest, business route contracts | E13,E15,E17; PASS subset local; PARTIAL phạm vi rộng; BLOCKED provider/giá |
| FR-43; UC19; AT-27 | R; MaintenancePlanningIntegrationTest, MaintenancePlanningPostgresTest | E12,E17; PASS local; không tự grounding khi quá hạn |
| FR-44; UC20; AT-27 | R; MaintenancePlanningIntegrationTest, MaintenancePlanningPostgresTest | E12,E17; PASS local; không trừ kho hoặc xác nhận kiểm định vật lý |
| FR-45; UC21; AT-34 | X; BillingServiceTest, StabilizationPostgresTest | E13,E17; PASS local; reset chu kỳ/chặn concurrent UAV chưa được suy ra |
| FR-46; UC21; AT-29,34 | X; PaymentProofTest, BillingConfigurationTest, StabilizationPostgresTest | E13,E17,E18; PASS local failure/replay; BLOCKED tiền thật và giá |
| FR-47; UC22; AT-30 | M; MediaLifecyclePostgresMinioTest, StabilizationMinioTest | E14,E15,E17; PASS local; cleanup eventual, không antivirus |
| FR-48; UC23; AT-35 | X; FinancialOutboxPostgresTest, WebhookSafetyTest, WebhookTransportTest | E15,E17,E18; PASS local; PARTIAL public TLS và bên nhận xử lý thật |

## 30 5 Quản lý khoảng trống bao phủ

FR-01 đến FR-42 giữ nguyên ID từ báo cáo trước. FR-43 đến FR-48 tách rõ vòng đời hỗ trợ đã triển khai mà FR cũ mô tả chưa đủ. Mỗi thay đổi phải cập nhật UC, BR, dữ liệu và AT liên quan; không tăng số FR để làm đẹp tỷ lệ hoàn thành. Tổng 48 FR là số yêu cầu tổng hợp, không phải 48 tiêu chí nguyên tử có trọng số bằng nhau.

Theo dõi riêng đặc tả đã rõ, tiêu chí đã thực thi và tiêu chí đã PASS trên nguồn phát hành. Mẫu số và ngoại lệ phải được duyệt trước khi tính tỷ lệ. Giữ evidence lỗi cùng lần chạy lại; tham chiếu cũ được đánh dấu lịch sử, không bị xóa hoặc gán sang nguồn mới.
