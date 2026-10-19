# Frontend: một ứng dụng, chia theo features

Kiến trúc hiện hành từ 18/10/2026. Tham khảo cách tổ chức của `management-shop`; không sao chép nghiệp vụ hoặc sửa dự án tham khảo.

```text
frontend/
├── src/
│   ├── app/                 # định tuyến và layout; page chỉ chuyển tới feature
│   │   ├── (public)/        # website công khai ở /
│   │   ├── (customer)/customer/
│   │   ├── (operations)/operations/
│   │   ├── (admin)/admin/
│   │   └── health/
│   ├── features/            # giao diện, quy tắc, API, hooks và types theo nghiệp vụ
│   ├── components/          # thành phần dùng chung, khung trang và biến thể từng khu vực
│   ├── contexts/            # AuthContext và I18nContext duy nhất
│   ├── providers/           # QueryProvider và PortalProviders
│   ├── lib/                # API client, registry endpoint, các bộ truy vấn liên phân hệ
│   ├── hooks/
│   ├── config/
│   ├── types/
│   ├── i18n/
│   ├── messages/
│   └── styles/
├── public/                  # ảnh và tài nguyên phục vụ trực tiếp
├── assets/                  # ảnh gốc, nguồn và giấy phép
├── tests/                   # kiểm thử hợp đồng và trình duyệt
├── scripts/check-architecture.mjs
├── Dockerfile
└── package.json             # một dependency tree, một lockfile, một tiến trình
```

## Quy tắc phát triển

- Chức năng mới nằm trong `src/features/<nghiệp-vụ>`. Các miền hiện có: auth, access, audit, billing, catalog, dashboard, inventory, maintenance, marketing, media, missions, navigation, notifications, profile, reports, sar, settings, stations, uavs, users.
- `src/app/**/page.tsx` chỉ export trang từ feature. Các biến thể UI của customer, operations, admin nằm trong feature tương ứng; không tái tạo ba ứng dụng riêng.
- Thành phần dùng chung đặt trong `src/components`. Biến thể hình thức theo khu vực được giữ khi cần để không làm thay đổi giao diện hiện hành.
- Truy cập mạng qua `src/lib/api/index.ts`; registry endpoint ở `src/lib/api/routes.ts`. Dịch vụ đặc thù mới đặt trong feature. Các adapter liên nhiều nghiệp vụ được chuyển nguyên trạng vào `lib/api` và `lib/query` để giữ hợp đồng hiện tại.
- Một `AuthContext` quản lý phiên cookie, quyền chi tiết, làm mới quyền và xóa cache khi đổi tài khoản. Quyền vẫn kiểm tra theo từng trang/từng thao tác; đường dẫn khu vực không thay thế việc kiểm tra quyền.
- Root layout riêng của từng nhóm route cô lập CSS nhưng cùng một Next app và runtime. Chuyển giữa nhóm có thể tải lại trang theo cơ chế nhiều root layout của Next; đăng nhập tiếp tục dùng cookie hiện tại.
- Toàn bộ import nội bộ dùng `@/`. Không thêm workspace `@uav/*`, thư mục `apps`, `packages`, `legacy` hoặc script đồng bộ bản sao mã nguồn.
- Mỗi thay đổi phải qua `npm run architecture:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. Bộ trình duyệt nghiệp vụ thật chạy qua runner CI cô lập.

## Bảo toàn tính năng và dữ liệu

56 trang từ website và ba khu vực được chuyển sang feature. Đường dẫn công khai giữ nguyên; đường dẫn khu vực thêm prefix `/customer`, `/operations`, `/admin`. Xem bảng đầy đủ trong `FRONTEND_ROUTE_MIGRATION.md`.

Các màn hình legacy trước đây: missions/create/list/detail tương ứng customer missions; operations/admin missions/operator missions tương ứng operations overview/dispatch/assigned missions; access-control tương ứng admin access-control; đăng nhập/đăng ký tương ứng khu vực phù hợp. Trang preview chỉ trình diễn cũ được loại khỏi runtime, không phải chức năng nghiệp vụ. Không còn máy chủ legacy ở cổng 3300.

Ảnh thực tế và nguồn ảnh được giữ trong `public/images` và `assets/uav-photos`. Khi tài nguyên cũ trùng tên nhưng khác nội dung, bản riêng được giữ dưới `public/areas/<area>` và đường dẫn sử dụng được cập nhật.

Không thay schema, dữ liệu DB, object storage hoặc logic backend trong đợt tái cấu trúc. Bản sao nguồn frontend trước khi sửa (gồm thay đổi chưa commit), SHA-256 và patch trạng thái Git nằm trong `docs/work/frontend-unification-20261018/`. Các thư mục đã nghỉ được chuyển vào `retired/` tại đây, ngoài source/build và được Git bỏ qua. Không nạp lại kiến trúc cũ từ bản sao này vào frontend đang phát triển.
