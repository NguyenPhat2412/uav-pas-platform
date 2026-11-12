# Kiến trúc 3 Cổng Web Độc lập: `customer/`, `operations/`, `admin/`

Kiến trúc hiện hành tách hoàn toàn phần giao diện Web thành **3 thư mục ứng dụng độc lập ở cấp cao nhất** (`customer/`, `operations/`, `admin/`), khớp trực tiếp với 3 nhánh dịch vụ trên GitHub (`customer`, `operations`, `admin`) và mỗi ứng dụng chỉ giữ đúng các route cùng tập phụ thuộc (`api`, `hooks`, `components`, `types`, `utils`, `forms`, `content`) của riêng cổng đó.

```text
uav-pas-platform/
├── customer/                    # Cổng Khách hàng & Trang công khai (:3100, nhánh customer)
│   ├── src/
│   │   ├── app/
│   │   │   ├── (public)/        # Website công khai ở /
│   │   │   ├── (customer)/customer/
│   │   │   └── health/
│   │   ├── api/<tính năng>/     # Chỉ chứa API client dùng bởi Customer & Public
│   │   ├── hooks/<tính năng>/   # Chỉ chứa React Query hooks của Customer & Public
│   │   ├── components/<tính năng>/ # Chỉ chứa UI của Customer & Public + base ui/layout/shared
│   │   ├── types/<tính năng>/
│   │   ├── utils/<tính năng>/
│   │   ├── forms/<tính năng>/
│   │   ├── content/marketing/   # Nội dung tĩnh trang chủ & giải pháp
│   │   ├── providers/
│   │   ├── lib/
│   │   ├── config/
│   │   ├── i18n/
│   │   ├── messages/
│   │   └── styles/
│   ├── scripts/check-architecture.mjs
│   └── package.json             # uav-pas-customer (next dev -p 3100)
│
├── operations/                  # Cổng Vận hành & Mô phỏng bay (:3200, nhánh operations)
│   ├── src/
│   │   ├── app/
│   │   │   ├── (operations)/operations/
│   │   │   ├── health/
│   │   │   └── page.tsx         # Cổng đăng nhập trực tiếp tại :3200/
│   │   ├── api/<tính năng>/     # Chỉ chứa API client của Operations (mission, uav, station, simulation, sar...)
│   │   ├── hooks/<tính năng>/
│   │   ├── components/<tính năng>/
│   │   ├── types/<tính năng>/
│   │   ├── utils/<tính năng>/
│   │   ├── forms/<tính năng>/
│   │   ├── providers/
│   │   ├── lib/
│   │   ├── config/
│   │   ├── i18n/
│   │   ├── messages/
│   │   └── styles/
│   ├── scripts/check-architecture.mjs
│   └── package.json             # uav-pas-operations (next dev -p 3200)
│
└── admin/                       # Cổng Quản trị hệ thống (:3300, nhánh admin)
    ├── src/
    │   ├── app/
    │   │   ├── (admin)/admin/
    │   │   ├── health/
    │   │   └── page.tsx         # Cổng đăng nhập trực tiếp tại :3300/
    │   ├── api/<tính năng>/     # Chỉ chứa API client của Admin (access, audit, dashboard, reporting, settings...)
    │   ├── hooks/<tính năng>/
    │   ├── components/<tính năng>/
    │   ├── types/<tính năng>/
    │   ├── utils/<tính năng>/
    │   ├── forms/<tính năng>/
    │   ├── providers/
    │   ├── lib/
    │   ├── config/
    │   ├── i18n/
    │   ├── messages/
    │   └── styles/
    ├── scripts/check-architecture.mjs
    └── package.json             # uav-pas-admin (next dev -p 3300)
```

## Quy tắc phát triển và cô lập mã nguồn

- **Cô lập tuyệt đối theo cổng (`check-architecture.mjs`):**
  - `customer/` chỉ chứa `(public)` và `(customer)` (31 route, 373 file nguồn); cấm tồn tại `(operations)` hoặc `(admin)`.
  - `operations/` chỉ chứa `(operations)` (25 route, 354 file nguồn); cấm tồn tại `(public)`, `(customer)` hoặc `(admin)`.
  - `admin/` chỉ chứa `(admin)` (51 route, 438 file nguồn); cấm tồn tại `(public)`, `(customer)` hoặc `(operations)`.
- **Chia theo tầng rồi theo tính năng bên trong mỗi cổng:** `src/api/<tính năng>`, `src/hooks/<tính năng>`, `src/components/<tính năng>`, `src/types/<tính năng>`, `src/utils/<tính năng>`, `src/forms/<tính năng>`. Không tạo lại `src/features`. Luồng dữ liệu: component → `hooks/<tính năng>` → `api/<tính năng>` → `@/lib/api`.
- **Liên kết xuyên cổng (Cross-Portal Redirects):**
  - Mỗi cổng định nghĩa `redirects()` trong `next.config.ts` thông qua các biến môi trường `NEXT_PUBLIC_CUSTOMER_URL` (`http://localhost:3100`), `NEXT_PUBLIC_OPERATIONS_URL` (`http://localhost:3200`) và `NEXT_PUBLIC_ADMIN_URL` (`http://localhost:3300`).
  - Khi người dùng chuyển cổng qua `PortalSwitcher` hoặc đăng nhập với vai trò thuộc cổng khác, trình duyệt tự động điều hướng sang đúng cổng tương ứng và dùng chung phiên cookie xác thực với Backend (`:8080`).
- **Đồng bộ với Mobile (`mobile/scripts/sync-shared.mjs`):**
  - Ứng dụng React Native (`mobile/`) tự động tra cứu các tệp dùng chung (`lib/`, `types/`, `utils/`, `forms/`, `messages/`) từ 3 thư mục `customer/`, `operations/`, `admin/`.
- **Kiểm chứng bắt buộc trên mỗi cổng:**
  - Mỗi thay đổi phải vượt qua `npm run architecture:check`, `npm run typecheck`, `npm run lint`, `npm test` trên cả 3 cổng `customer`, `operations`, `admin` và `mobile`.
