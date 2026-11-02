# UAV PAS — Kiểm chứng backend ngày 18/10/2026

**Kết luận: COMPLETE cho phạm vi kiểm thử backend tại localhost.** Hai lượt kiểm thử đầy đủ đều thành công. Lượt cuối chạy qua script kiểm chứng đã sửa: **763 test thuộc 97 bộ test; 0 failure, 0 error, 0 skipped; Maven exit code 0.** Không coi kết quả này là xác nhận production-ready.

## Baseline và phạm vi thay đổi

- Nhánh `main`, HEAD `b7091ec2c6488931147c0d78ba1c54d28a9daa92`.
- Khi bắt đầu, chỉ `backend/pom.xml` có thay đổi định dạng sẵn của người dùng. Đã đối chiếu và giữ nguyên toàn bộ diff đó.
- Không thay đổi mã Java nghiệp vụ, API, auth contract, dependency hay migration trong lượt này.
- Không commit, push, deploy, khởi động lại backend/frontend hoặc thay đổi dữ liệu localhost đang dùng.
- Kiểm thử dùng Java 21, PostgreSQL 16 và MinIO riêng, tên container ngẫu nhiên, port ngẫu nhiên chỉ bind `127.0.0.1`, dữ liệu tạm; không sử dụng port 8080.

## Nguyên nhân và cách xử lý

1. **Lỗi Maven cũ nằm ở kiểm tra định dạng.** Log của lượt refactor trước báo Spotless có 17 file cần định dạng; vì vậy 748 test đạt vẫn không làm toàn bộ `verify` thành công. Trên mã hiện tại, `spotless:check` đạt với 478 file sạch ngay từ đầu. Không cần sửa thêm Java hoặc tắt kiểm tra định dạng.
2. **Test tích hợp bị bỏ qua khi thiếu biến môi trường.** Các bộ PostgreSQL/MinIO chỉ bật khi được cấp đúng cấu hình. Đã cung cấp hai dịch vụ disposable thật và giữ nguyên các điều kiện bảo vệ. Kết quả cuối không còn test nào bị bỏ qua.
3. **Script có thể đếm nhầm báo cáo cũ.** `backend_tests.py` trước đây đọc cố định `backend/target/surefire-reports`. Một kiểm thử mới đã tái hiện việc báo cáo cũ 748 test khiến một lượt không chạy test vẫn được coi là đạt. Đã chuyển mỗi lượt sang thư mục build mới riêng, chỉ đọc báo cáo ở đó. Kiểm thử trước sửa FAIL, sau sửa PASS.
4. **Workflow persistence thiếu MinIO và không chặn skip.** Đã bổ sung PostgreSQL/MinIO disposable, chờ readiness, gọi script yêu cầu zero-skip, dọn dịch vụ và chỉ xuất báo cáo an toàn. Workflow được kiểm tra cú pháp tại máy; chưa chạy trên GitHub Actions.

## Kết quả thực tế

| Nhóm kiểm tra | Trạng thái | Kết quả |
|---|---|---|
| Maven `verify`, gồm build/package và Spotless | PASS | Exit code 0 ở cả hai lượt đầy đủ |
| Toàn bộ test backend | PASS | 763/763, 97 bộ test, không lỗi, không skip |
| PostgreSQL/MinIO thật | PASS | 236 test trong 16 bộ; migration, concurrency, storage và nghiệp vụ |
| Auth và security | PASS | 94 test, gồm các kiểm tra đăng nhập/refresh/logout và đồng thời hiện có |
| Kiến trúc, Entity, DTO và JSON contract | PASS | 26 test |
| Script kiểm chứng và cleanup: kiểm thử hồi quy | PASS | 9/9; có trường hợp báo cáo cũ, thiếu test, skip và Maven thất bại |
| Cú pháp workflow | PASS | Cả hai workflow backend parse thành công |
| Dọn PostgreSQL/MinIO của lượt kiểm thử | PASS | Không còn container mang nhãn của lượt này |
| Kiểm tra khoảng trắng Git | PASS | `git diff --check` không báo lỗi |
| Bảo toàn chỉnh sửa POM của người dùng | PASS | Diff khớp nguyên trạng ban đầu |
| GitHub Actions hosted | CHƯA CHẠY | Chưa commit/push; không suy diễn từ kiểm thử localhost |
| Browser E2E, staging HTTPS, production | NGOÀI PHẠM VI | Không thực hiện trong lượt kiểm chứng backend này |

Các nhóm PostgreSQL/MinIO, auth/security và kiến trúc là các tập con có thể giao nhau; không cộng chúng để suy ra tổng 763.

## Lệnh đã chạy

Từ `backend/`:

```sh
./mvnw -B spotless:check
./mvnw -B -Duav.build.directory=<thu-muc-build-moi-rieng> verify
python3 infra/ci/backend_tests.py
```

Script kiểm chứng được chạy với các biến `UAV_STABILIZATION_DB_*` và `UAV_STABILIZATION_MINIO_*` do bộ điều khiển disposable cấp trong bộ nhớ. Mật khẩu được tạo ngẫu nhiên; không ghi giá trị vào evidence. Bộ điều khiển cục bộ nằm tại `docs/work/backend-verification-20261018/verify-gate.py` và đã dọn container trong nhánh `finally`.

Từ gốc repository:

```sh
python3 -m unittest discover -s backend/infra/ci/tests -p test_failure_paths.py
git diff --check
```

Không dùng `skipTests`, `maven.test.skip`, tắt Spotless, xóa test hay thay assertion để làm kết quả xanh. Không chạy Maven trực tiếp trên thư mục build của dịch vụ đang dùng.

## Evidence an toàn

- `evidence/tests/backend-verification-20261018/result.json`: kết quả cuối và trạng thái cleanup.
- `evidence/tests/backend-verification-20261018/suites.json`: số test/lỗi/skip của từng bộ, không chứa nội dung request/response.
- `evidence/tests/backend-verification-20261018/maven-summary.txt`: dòng tổng kết Maven và Spotless đã chọn lọc.
- `evidence/tests/backend-verification-20261018/baseline-run.json`: lượt đầy đủ đầu tiên, trước sửa script.
- `evidence/tests/backend-verification-20261018/gate-regressions.json`: 9 kiểm thử script và bằng chứng trước/sau cho lỗi dùng báo cáo cũ.

Log thô và XML Surefire chứa thông tin môi trường chỉ nằm trong vùng làm việc riêng, không đưa vào Git/evidence công khai. Kết quả này xác nhận các hành vi được bộ test hiện có bao phủ; không khẳng định hệ thống không còn mọi lỗi hay đã đủ điều kiện production.
