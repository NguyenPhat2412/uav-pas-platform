# Runbook giám sát (mỗi 30 phút)

Người giám sát không sửa code của các phiên, không push, không deploy. Chỉ đọc, kiểm tra, ghi BOARD và lưu bằng chứng.

## Mỗi chu kỳ

1. **Tiến độ**: đọc dòng mới trong `BOARD.md` + `git log --since=<lần trước>`; ghi nhận phiên nào im lặng > 45 phút
   (không dòng BOARD, không file đổi) → ghi `[SUPERVISOR→Sx] PING`.
2. **CI local** (giống `.github/workflows/ci.yml`), so với mốc nền đầu đêm:
   - web ×3: `npx tsc --noEmit`, `npm run lint`, `npm run architecture:check` (nếu có), `npm test`
   - mobile: `npm run sync:shared -- --check`, `npm run architecture:check`, `npx expo lint`, `npx tsc --noEmit`, `npm test`
   - backend (mỗi 2 chu kỳ, vì lâu): `./mvnw -q -Duav.build.directory=/tmp/uav-build-supervisor test`
   - Đỏ do commit mới → `git log` tìm commit gây lỗi → `[SUPERVISOR→Sx] BLOCKED: <test> đỏ từ <hash>`.
3. **Trả lời BOARD**: `QUESTION` theo quyết định đã chốt (ẩn đội bay phía khách, giá "minh hoạ", mô phỏng là lõi,
   ngoài phạm vi: ví/rút tiền thật, đấu giá, voucher, chat khách–đội bay). `REQUEST` gửi S0 quá 1 giờ chưa trả lời → nhắc.
4. **Luật**: commit sửa ngoài thư mục được phân; migration không do S0; `git add -A`; mock/dữ liệu giả mới
   (`grep` mảng hằng số giả, `setTimeout` giả API, `Math.random` làm số liệu); chữ cấm (VJU, RTK, "chính thức"…).
5. **UI + bằng chứng** (mỗi chu kỳ có commit frontend mới): chạy
   `node <scratchpad>/ui-check.mjs docs/overnight/evidence/<HHMM>-ui` với `UI_CHECK_USERS` khi S0 đã có tài khoản dev seed.
   Ảnh mọi trang 3 cổng ở 390px và 1280px; báo lỗi console, API 4xx/5xx, chữ xuống dòng sai, tràn chữ, cuộn ngang.
   Mobile: `xcrun simctl io <UDID iPhone 17 Pro> screenshot docs/overnight/evidence/<HHMM>-mobile.png`.
   Lỗi giao diện rõ ràng → `[SUPERVISOR→Sx] BLOCKED` kèm trang + mô tả.
6. **Postman** (khi đã có tài khoản dev seed): chạy bản GET-only của `api-contract/postman_collection.json` vào
   `http://localhost:8080`. Không chạy POST/PUT/DELETE của collection (dùng id=1 mẫu, sẽ làm hỏng dữ liệu dev).
7. Ghi một dòng `[SUPERVISOR] STATUS` tóm tắt: commit mới, test, lỗi UI, việc đã giao.

## Bằng chứng

`docs/overnight/evidence/` (không commit — có `.gitignore`). Sáng ra tổng hợp báo cáo cho người dùng từ các
dòng STATUS + ảnh chụp mới nhất.
