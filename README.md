# Nhánh `frontend`

Ứng dụng Next.js nằm ở `frontend/` và phục vụ cả website công khai lẫn ba cổng. Nhánh này được đồng bộ từ `main`.

## 1. Cấu trúc thư mục: theo tầng rồi theo tính năng (giống backend)

```text
frontend/src/
├── app/                    # route Next.js theo nhóm (public), (customer), (operations), (admin)
├── api/<tính năng>/        # <tính năng>.api.ts: request tới backend
├── hooks/<tính năng>/      # query-keys.ts và useXxx.ts (React Query); hook dùng chung ở hooks/
├── components/<tính năng>/ # component theo tính năng, PascalCase
│   └── ui/ data/ layout/ shared/ customer/ visuals/   # component dùng chung
├── types/<tính năng>/      # <tính năng>.types.ts
├── utils/<tính năng>/      # hàm thuần, kebab-case
├── forms/<tính năng>/  content/<tính năng>/
├── providers/              # AuthContext, I18nContext, ToastContext, QueryProvider
├── lib/                    # api client, routes.ts, query, presentation, navigation, recent-pages
├── config/                 # env, navigation, sidebar-routes
└── messages/               # i18n vi / en / ja
```

- **Tên tính năng trùng package backend:** `mission`, `station`, `uav`, `user`, `notification`, `webhook`, `reporting`, `devicekey`, `storage`, `weather`, `training`... Chỉ frontend có `access` (backend `permission` + `role`), `catalog`, `profile`, `marketing`.
- **Không tạo lại `src/features`:** `npm run architecture:check` chặn.
- **`components/` chỉ chứa component:** hàm và cấu hình dùng chung ở `lib/` hoặc `config/`.

## 2. Tầng dữ liệu

```text
Component → hooks/<tính năng>/useX.ts → api/<tính năng>/x.api.ts → @/lib/api (apiClient)
```

- **Query key:** `queryKeys.of(userId, feature, ...parts)`, cache tách riêng theo người dùng. Mỗi tính năng có `hooks/<tính năng>/query-keys.ts`.
- **Mutation:** nhận `MutationOptions<TData, TVars>`. `afterSuccess` làm mới cache, `QUIET` tắt toast.
- **Kiểm tra kiến trúc:** UI không import trực tiếp `@tanstack/react-query`, `@/api/*` hay `apiClient`.
- **Không còn danh sách ngoại lệ:** training, hộp thoại đăng nhập và các màn hình nhiệm vụ đã chuyển sang `hooks/training`, `hooks/auth/useAuthFlow` và `hooks/mission/useMissionWorkflow`. Luồng nhiều bước tuần tự dùng hook trả về hàm request ổn định.

## 3. Feature `weather`

- **Gọi API:** `api/weather/weather.api.ts` và `hooks/weather/useWeather.ts` cung cấp `useForecastAssessment`, `useMissionWeather`, `useStationsWeather`, `useWeatherProvider` và `useUpdateWeatherProvider`.
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
- Không gọi `fetch(` trong `api/`, `hooks/`, `components/`, `utils/` hoặc `providers/`.
- Các file i18n vi, en và ja phải luôn có cùng bộ khoá.

## Kiểm thử

```bash
cd frontend
node --test tests/*.test.mjs   # 221/221 pass
npm run typecheck              # sạch
npm run architecture:check     # OK
```
