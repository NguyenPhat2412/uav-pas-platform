# UAV PAS — Chuẩn hóa cấu trúc module backend

Ngày đối chiếu: **18/10/2026**. Baseline `main`, HEAD `b7091ec2c6488931147c0d78ba1c54d28a9daa92`, kèm các thay đổi chưa commit đã có trước lượt này.

**Kết quả: COMPLETE trong phạm vi chuẩn hóa và kiểm thử backend tại localhost.** Maven `verify` thành công với **771 test thuộc 99 bộ test; 0 failure, 0 error, 0 skipped**. PostgreSQL/MinIO disposable thật đã được cấp đầy đủ và dọn sau kiểm thử.

## Thay đổi thực hiện

1. Rà soát đủ 18 module, thống nhất ý nghĩa các tầng controller, dto, service/impl, mapper, repository, specification, entity và enums. Bảng kiểm kê và lý do thiếu package nằm tại [BACKEND_MODULE_MATRIX.md](../../architecture/BACKEND_MODULE_MATRIX.md).
2. Thêm ba request record có consumer thật:
   - `user/dto/request/UserQueryRequest`: chuyển nhóm sáu giá trị phân trang/sắp xếp/lọc người dùng đến service.
   - `maintenance/dto/request/MaintenanceScheduleQueryRequest`: nhóm bộ lọc lịch bảo trì.
   - `maintenance/dto/request/RepairOrderQueryRequest`: nhóm bộ lọc phiếu sửa chữa.
3. Chuyển `RoleUpdateRequest` từ `role/dto/request` sang `user/dto/request`, đúng module sở hữu thao tác đổi vai trò của tài khoản. Giữ nguyên tên DTO, trường JSON `role` và annotation `@NotNull`.
4. Đổi tên record nội bộ `UserProfileUpdateRequest` thành `UserProfileUpdateCommand`, tiếp tục ở `user/dto/record`. HTTP vẫn nhận `UserProfilePatchRequest`; allowlist, kiểm tra kiểu và expectedRevision không đổi.
5. Bổ sung `ModuleDtoStructureTest` để ngăn nhầm vai trò Request/Response với record nội bộ, cùng bảy kiểm thử HTTP query trong `QueryDtoContractTest`.
6. Cập nhật call site trong các test hiện có theo service signature mới; giữ nguyên các assertion nghiệp vụ.

Không cần thêm response giả: cả 18 module đã có response phù hợp. Không tạo request/record hoặc thư mục rỗng chỉ để mọi module nhìn giống nhau. `audit`, `dashboard`, `reporting` không có JSON body cần request riêng. `permission` và `role` đang dùng path/query theo contract hiện có.

## Cấu trúc sau rà soát

- Trong 18 module: **49 request, 46 response, 8 record nội bộ**, tổng **103 file DTO**.
- Có thêm **3 response dùng chung** ở `common/dto/response`, tổng toàn backend **106 file DTO**.
- Tất cả các file DTO này dùng Java `record`; số liệu không đếm record lồng thành file riêng.
- Package chỉ được tạo khi có kiểu dữ liệu dùng thật; đây là thống nhất vai trò và cách đặt tên, không áp đặt các tầng rỗng cho mọi module.

## Bảo toàn hành vi

- Giữ nguyên HTTP routes, RequestParam/RequestBody binding, tên tham số, giá trị mặc định, PreAuthorize và kiểu JSON đầu ra.
- Không thay đổi auth contract, cookie, refresh, logout, quyền/grant hoặc logic bảo vệ tài khoản quản trị.
- Không đổi quy tắc phân trang: người dùng vẫn clamp page/size và whitelist sort; bảo trì vẫn từ chối phân trang không hợp lệ.
- Không thay Entity, bảng, migration hoặc dependency.
- Giữ nguyên các chỉnh sửa POM và CI đã có trước; không can thiệp các thay đổi frontend đang được thực hiện ở chat khác.
- Không commit, push, deploy hay restart runtime localhost.

## Kiểm chứng thực tế

| Nhóm | Trạng thái | Evidence |
|---|---|---|
| Maven verify/package/Spotless | PASS — exit 0, 483 file Java sạch | `maven-summary.txt`, `result.json` |
| Toàn bộ backend | PASS — 771/771, 99 bộ, zero skip | `result.json`, `suites.json` |
| PostgreSQL/MinIO thật | PASS — 236 test | Các suite Postgres/Minio trong `suites.json` |
| Auth/security | PASS — 94 test | Các suite auth/security trong `suites.json` |
| Kiểm thử tập trung trước full verify | PASS — 61/61 | `regressions.json` |
| Frontend contract checks | PASS — 154/154 | `frontend-contracts.json` |
| Bảo toàn annotation HTTP/security và wire shape DTO chuyển chỗ | PASS | `compatibility.json` |
| Cleanup container kiểm thử | PASS | `result.json`: ownedServicesRemoved |
| Khoảng trắng Git | PASS — git diff --check | Kiểm tra sau khi cập nhật tài liệu |
| GitHub Actions hosted / staging / production | CHƯA CHẠY — ngoài phạm vi lượt này | Không suy diễn từ kết quả localhost |

Các nhóm test là tập con có thể giao nhau, không cộng các hàng để tính tổng.

Kiểm thử cấu trúc mới đã được chạy trước sửa và phát hiện đúng tên `UserProfileUpdateRequest` trong package nội bộ. Sau đổi tên, kiểm thử này đạt. Bốn test query người dùng đã đạt trước sửa; sau chuẩn hóa vẫn đạt, cùng ba test query bảo trì mới.

## Lệnh thực thi

```sh
# Trong backend, dùng JDK 21 và output riêng
./mvnw -B -Duav.build.directory=<isolated-build> -Dtest=ModuleDtoStructureTest,QueryDtoContractTest test
./mvnw -B -Duav.build.directory=<isolated-build> -Dtest=ModuleDtoStructureTest,QueryDtoContractTest,ArchitecturePackageTest,EntityDtoBoundaryTest,DtoWireContractTest,UserServiceTest,UserControllerTest,MaintenancePlanningIntegrationTest test
./mvnw -B spotless:apply
python3 infra/ci/backend_tests.py
# Script trên chạy Maven verify trong thư mục build mới.

# Trong frontend
npm run test:contracts

# Tại gốc repository
git diff --check
```

Lượt đầy đủ do `docs/work/module-structure-20261018/verify.py` điều khiển: tạo credentials ngẫu nhiên trong bộ nhớ, PostgreSQL 16/MinIO riêng, port loopback ngẫu nhiên, không dùng port 8080 hay dữ liệu runtime, dọn trong `finally`. Không tắt test hoặc formatter.

Evidence an toàn ở `evidence/tests/module-structure-20261018/`: `result.json`, `suites.json`, `maven-summary.txt`, `compatibility.json`, `regressions.json`, `frontend-contracts.json`, `module-matrix-before.json`, `module-matrix-after.json`. Không đưa log thô, XML chứa biến môi trường, token, password hay signed URL vào evidence.

Kết quả xác nhận bộ test hiện có và phạm vi thay đổi này; không phải tuyên bố production-ready hoặc mọi hành vi hệ thống đều đã được kiểm thử.
