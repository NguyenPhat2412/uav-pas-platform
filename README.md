# Nhánh `frontend`

Ứng dụng Next.js nằm ở `frontend/` và phục vụ cả website công khai lẫn ba cổng. Nhánh này được đồng bộ từ `main`.

## 1. Cấu trúc thư mục và cách đặt tên

```text
frontend/src/
├── app/                 # route Next.js theo nhóm (public), (customer), (operations), (admin)
├── components/          # UI dùng chung: ui/, data/, layout/, shared/, customer/
├── features/<tên>/
│   ├── api/             # <tên>.api.ts: các request tới backend
│   ├── hooks/           # query-keys.ts và useXxx.ts (React Query)
│   ├── components/      # component của tính năng, PascalCase
│   ├── types/           # <tên>.types.ts
│   └── utils/           # hàm thuần, kebab-case
├── hooks/               # hook dùng chung: useCollection, useSidebarController, ...
├── providers/           # AuthContext, I18nContext, ToastContext, QueryProvider
├── lib/api/             # client, routes.ts (API_ROUTES)
├── lib/query/           # queryKeys, MutationOptions, afterSuccess, QUIET
└── messages/            # i18n vi / en / ja
```

Những thay đổi chính:

- **Context:** `contexts/` đã chuyển thành `providers/`.
- **Đổi tên file:** các file marketing kiểu kebab-case như `home-landing.tsx` được đổi thành `HomeLanding.tsx`.
- **API:** các file `api.ts` và `admin-api.ts` rải rác được gom vào `features/*/api/*.api.ts`.
- **Đã xoá:** `lib/api/{admin,customer,resources,services}.ts` và `lib/query/{admin,customer,operations}.ts`.

## 2. Tầng dữ liệu

```text
Component → features/x/hooks/useX.ts → features/x/api/x.api.ts → @/lib/api (apiClient)
```

- **Query key:** dùng `queryKeys.of(userId, feature, ...parts)` để cache tách riêng theo từng người dùng. Mỗi feature có `hooks/query-keys.ts`.
- **Mutation:** nhận `MutationOptions<TData, TVars>`. `afterSuccess` làm mới cache, còn `QUIET` tắt toast.
- **Kiểm tra kiến trúc:** `npm run architecture:check` chặn các file UI import trực tiếp `@tanstack/react-query`, `features/*/api` hoặc `apiClient`.
- **Danh sách chờ:** 11 file luồng tuần tự (training, OperationsMissionDetail, AuthModalPopup, ba màn hình missions) vẫn nằm trong `pendingDataLayerMigration`. Danh sách này chỉ được rút ngắn, không được thêm vào.

## 3. Feature `weather`

- **Gọi API:** `api/weather.api.ts` và `hooks/useWeather.ts` cung cấp `useForecastAssessment`, `useMissionWeather`, `useStationsWeather`, `useWeatherProvider` và `useUpdateWeatherProvider`.
- **Component dùng chung:**
  - `PreflightWeatherCard`: kết luận, điểm, gió ở độ cao 10/80/120 m, gió giật, tầm nhìn, mưa, Kp, hệ số hao pin, lý do và khung giờ đề xuất.
  - `ClearanceBadge`: nhãn mức đánh giá.
  - `MissionWeatherAdvisor`: gợi ý thời tiết khi tạo và sửa nhiệm vụ.
  - `StationWeatherCell`: cột thời tiết ở bảng trạm.
  - `WeatherProviderSettingsSection`: phần cài đặt nhà cung cấp cho admin.
- **Đã xoá:** `lib/external/weather.ts`, vốn gọi Open-Meteo trực tiếp từ trình duyệt.

Quy ước giao diện:

- Không dùng màu xanh lá (emerald, green, teal). GO hiển thị màu sky, CAUTION màu amber, NO_GO màu red.
- Không dùng `rounded-full`. Không dùng viền kép.
- Không gọi `fetch(` trong `features/` hoặc `providers/`.
- Các file i18n vi, en và ja phải luôn có cùng bộ khoá.

## Kiểm thử

```bash
cd frontend
node --test tests/*.test.mjs   # 221/221 pass
npm run typecheck              # sạch
npm run architecture:check     # OK
```
