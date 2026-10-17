# Evidence ngày 17/10/2026

[Báo cáo và bảng nghiệm thu](../../../M6_FULL_PRIORITIES_2026_10_17.md). `index.json` ghi nguồn, SHA-256 và giai đoạn của từng tệp. Không cộng các lượt kiểm thử chồng lặp thành tỷ lệ hoàn thành.

- **Bản cuối sau refactor:** `backend-final-726-summary.json`, `backend-final-source-hashes.json`, `api-contract-parity.json`, `final-source-review.md` và bốn `post-refactor-*.json`. 726 test không skip, 445 source hash không drift, 130 operation API giữ contract, 26 browser checks và 15 auth HTTP checks PASS.
- **Frontend:** `frontend-gates.json`, hai layout build và review; workspace 151, contracts 151, legacy 10. Bản áp dụng lên localhost có bằng chứng build và hash riêng.
- **Trước refactor:** các `backend-frozen-*`, `task2-*`, `task3-*`, `task4-*`, `auth-contract-probe.json` và portable primary run5. 725 test/421 source hash và diễn tập cũ giữ phạm vi nguồn riêng, không thay thế kết quả bản cuối.
- **CI/recovery:** portable primary browser 16/runner 12; source provenance, scoped CI review và 8 mocked failure-path tests. Hosted CI cho source chưa commit chưa chạy.
- **Bảo toàn dữ liệu:** backup/restore và adoption trước startup kiểm 22 bảng/117 dòng cũ. Sau login, refresh token luân chuyển là biến đổi phiên dự kiến; đọc báo cáo sau startup riêng trước khi kết luận dữ liệu không đổi.
- **Audit/security:** production audit 0 mỗi cây; full audit 5 HIGH mỗi cây dev toolchain. Standard scan là coverage một phần của baseline, không phải chứng nhận bảo mật toàn source cuối.

JSON browser chỉ giữ nhãn, endpoint không có query ký, HTTP status và kết quả kiểm tra. Console 4xx dự kiến hoặc request bị hủy khi điều hướng không được ghi thành lỗi JavaScript; lỗi mạng được cố ý tạo cho ca phục hồi có nhãn trong scenario. File không chứa credential, token, cookie value, signed URL, storage state, private database dump hoặc raw backend log.

Toàn hệ thống **PARTIAL / NOT_READY**: thiếu HTTPS staging, SSO thực, hosted CI và security coverage đầy đủ. Các tệp được bổ sung sau chuyển runtime hoặc sau đóng scan được ghi riêng trong index; không sửa lại evidence của lượt cũ.
