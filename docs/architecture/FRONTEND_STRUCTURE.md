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
│   │   ├── api/                 # Phẳng: *.api.ts
│   │   ├── hooks/               # Phẳng: use*.ts & *-query-keys.ts
│   │   ├── forms/               # Phẳng: *-form.ts (pure TypeScript)
│   │   ├── types/               # Phẳng: *.types.ts
│   │   ├── utils/               # Phẳng: *.ts & *-workflows.ts
│   │   ├── components/<nhóm>/   # Nhóm UI theo domain + ui/layout/shared
│   │   ├── content/marketing/   # Nội dung tĩnh trang chủ & giải pháp
│   │   ├── providers/  lib/  config/  i18n/  messages/  styles/
│   ├── scripts/check-architecture.mjs
│   └── package.json             # uav-pas-customer (next dev -p 3100)
│
├── operations/                  # Cổng Vận hành & Mô phỏng bay (:3200, nhánh operations)
│   └── src/                     # Cùng cấu trúc phẳng (api, hooks, forms, types, utils) + app/(operations)/
│
└── admin/                       # Cổng Quản trị hệ thống (:3300, nhánh admin)
    └── src/                     # Cùng cấu trúc phẳng (api, hooks, forms, types, utils) + app/(admin)/
```

## Quy tắc phát triển và cô lập mã nguồn

- **Cô lập tuyệt đối theo cổng (`check-architecture.mjs`):**
  - `customer/` chỉ chứa `(public)` và `(customer)`; cấm tồn tại `(operations)` hoặc `(admin)`.
  - `operations/` chỉ chứa `(operations)`; cấm tồn tại `(public)`, `(customer)` hoặc `(admin)`.
  - `admin/` chỉ chứa `(admin)`; cấm tồn tại `(public)`, `(customer)` hoặc `(operations)`.
- **5 tầng dữ liệu/logic phẳng hoàn toàn:** `src/api/`, `src/hooks/`, `src/forms/`, `src/types/`, `src/utils/` không tạo thư mục con theo tính năng (được kiểm soát tự động bởi `check-architecture.mjs`). Luồng dữ liệu: component → `hooks/` → `api/` → `@/lib/api`.
- **Chống drift xuyên cổng (`scripts/sync-web-shared.mjs`):** Các module nền tảng dùng chung giữa 3 cổng Web được kiểm soát đồng bộ bằng `node scripts/sync-web-shared.mjs --check`.
- **Liên kết xuyên cổng (Cross-Portal Redirects):**
  - Mỗi cổng định nghĩa `redirects()` trong `next.config.ts` thông qua các biến môi trường `NEXT_PUBLIC_CUSTOMER_URL` (`http://localhost:3100`), `NEXT_PUBLIC_OPERATIONS_URL` (`http://localhost:3200`) và `NEXT_PUBLIC_ADMIN_URL` (`http://localhost:3300`).
  - Khi người dùng chuyển cổng qua `PortalSwitcher` hoặc đăng nhập với vai trò thuộc cổng khác, trình duyệt tự động điều hướng sang đúng cổng tương ứng và dùng chung phiên cookie xác thực với Backend (`:8080`).
- **Đồng bộ với Mobile (`mobile/scripts/sync-shared.mjs`):**
  - Ứng dụng React Native (`mobile/`) tự động tra cứu các tệp dùng chung (`lib/`, `types/`, `utils/`, `forms/`, `messages/`) từ 3 thư mục `customer/`, `operations/`, `admin/`.
- **Kiểm chứng bắt buộc trên mỗi cổng:**
  - Mỗi thay đổi phải vượt qua `npm run architecture:check`, `npm run typecheck`, `npm run lint`, `npm test` trên cả 3 cổng `customer`, `operations`, `admin` và `mobile`.
