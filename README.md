# Nhánh `mobile`: Ứng Dụng Di Động Đa Vai Trò (Expo / React Native iOS)

Nhánh này **chỉ chứa ứng dụng di động `mobile/`** (được tách cô lập từ `main`, đã bao gồm sẵn `mobile/src/shared/` để biên dịch và kiểm thử độc lập):

- Hỗ trợ đầy đủ phân hệ Khách hàng (`src/app/customer/*`), Vận hành & SAR thực địa (`src/app/operations/*`), cùng Hộp thư hỗ trợ trực tuyến / trả lời nhanh cho Quản trị viên.
- Tuân thủ kiến trúc phân tầng nghiêm ngặt (`15–360` dòng/file, lưu khóa phiên trong `expo-secure-store`, bảng màu tập trung tại `styles/tokens.ts`).

## Chạy và kiểm thử độc lập

```bash
cd mobile
npm install
npx expo start --port 8081
npm run architecture:check && npx tsc --noEmit && npm test
```
