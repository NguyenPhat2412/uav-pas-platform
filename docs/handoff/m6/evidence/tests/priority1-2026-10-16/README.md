# Evidence ưu tiên 1 — 16/10/2026

Xem báo cáo [M6_PRIORITY1_2026_10_16.md](../../../M6_PRIORITY1_2026_10_16.md) cho phạm vi, lỗi trước/sau và giới hạn.

`*-before*` và `media-ui-recovery-before.json` giữ lỗi trước sửa. `backend-full-summary.json` là lượt full suite còn hai assertion service kỳ vọng exception cũ. `backend-final-summary.json` mới là kết quả 444 tests cuối. `harness-corrections.json` giải thích lỗi fixture, selector và các lượt không đại diện lỗi sản phẩm. Không cộng số ca từ nhiều lượt chạy lại.

## Chạy lại trên máy kiểm thử này

1. Dùng đúng repository `/Volumes/D/Codex/projects/uav-pas-platform`, Node 20.20.2, Java/Maven wrapper, Docker và Playwright/Chromium có sẵn như đường dẫn trong script.
2. Chép `scripts/*` vào `work/uav-priority1-20261016/` (đã ignore); tạo thư mục output `/Volumes/D/Codex/outputs/uav-priority1-20261016`. Kiểm tra không có dịch vụ khác chiếm 18080, 55444, 9014/9015, 3100–3103. Scripts chỉ dùng Compose project riêng `uav-priority1-20261016`.
3. Chạy `python3 work/uav-priority1-20261016/runtime.py infra`, `backend`, `seed` theo thứ tự. Mật khẩu/người dùng synthetic sinh ngẫu nhiên; fixture và env mode 0600 không được lưu vào evidence.
4. Chạy `python3 work/uav-priority1-20261016/backend-tests.py backend-final` và `gates.py root`, `gates.py legacy`. Đợi build xong rồi `runtime.py frontends`; sau mỗi rebuild phải khởi động lại các standalone tương ứng.
5. Dùng Node 20 chạy các `.mjs`. Với ba script permissions/inventory/media đặt `UAV_PHASE=after`. Không chạy hai script thay template/quyền đồng thời; các API fixture/read-back được đánh dấu trong network evidence. `media-expiry.mjs` chờ **15 phút thật**, không sửa giờ hay chữ ký.
6. Giữ log/test target thô trong `work/` vì có thể có dữ liệu auth do framework ghi. Chỉ xuất summary method/path/status và assertions đã lọc. Ảnh không chứa URL đã ký hoặc màn hình mật khẩu. Không xuất `env.json`, `fixture.json`, `*-private.log`, Surefire XML thô.
7. Cuối cùng `runtime.py cleanup`, xóa các test target trong work sau khi đã lấy summary. Lệnh cleanup chỉ tác động process group và Compose project do lượt kiểm thử tạo.

Các script lưu lại đúng quy trình đã chạy trên máy này; đường dẫn runtime là cấu hình môi trường kiểm thử, không phải dependency của sản phẩm. Không dùng chúng trên production.

Trước commit, khoảng trắng cuối dòng và dòng trống dư cuối các log được chuẩn hóa để `git diff --cached --check` đạt; nội dung thông báo, kết quả và số ca kiểm thử giữ nguyên.
