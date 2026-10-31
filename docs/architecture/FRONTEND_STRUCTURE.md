# Frontend: một ứng dụng, chia theo tầng rồi theo tính năng

Kiến trúc hiện hành từ 31/10/2026, giống bố cục backend (`controller/<tính năng>`, `service/<tính năng>`...). Bản 18/10/2026 dùng `src/features/<tính năng>/<tầng>` đã được thay thế. Tham khảo cách tổ chức của `management-shop`; không sao chép nghiệp vụ hoặc sửa dự án tham khảo.

```text
frontend/
├── src/
│   ├── app/                 # định tuyến và layout; page chỉ chuyển tới feature
│   │   ├── (public)/        # website công khai ở /
│   │   ├── (customer)/customer/
│   │   ├── (operations)/operations/
│   │   ├── (admin)/admin/
│   │   └── health/
│   ├── api/<tính năng>/        # <tính năng>.api.ts: request tới backend qua @/lib/api
│   ├── hooks/<tính năng>/      # query-keys.ts và useXxx.ts (React Query); hook dùng chung ở hooks/
│   ├── components/<tính năng>/ # giao diện theo tính năng; dùng chung: ui, data, layout, shared, customer, visuals
│   ├── types/<tính năng>/      # <tính năng>.types.ts; types/index.ts dùng chung
│   ├── utils/<tính năng>/      # hàm thuần theo tính năng
│   ├── forms/<tính năng>/      # schema form (missions, profile)
│   ├── content/<tính năng>/    # nội dung tĩnh (marketing)
│   ├── providers/           # AuthContext, I18nContext, ToastContext, QueryProvider, PortalProviders
│   ├── lib/                # API client, routes.ts, queryKeys, presentation (nhãn hiển thị), navigation, recent-pages
│   ├── config/              # env, navigation, sidebar-routes (menu ba cổng)
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

- Chức năng mới chia vào đúng tầng: `src/api/<tính năng>`, `src/hooks/<tính năng>`, `src/components/<tính năng>`, `src/types/<tính năng>`, `src/utils/<tính năng>`. Không tạo lại `src/features` (bị `architecture:check` chặn). Luồng dữ liệu: component → `hooks/<tính năng>` → `api/<tính năng>` → `@/lib/api`.
- Tên thư mục tính năng trùng tên package backend: `mission`, `station`, `uav`, `user`, `notification`, `webhook`, `reporting`, `devicekey`, `storage`, `weather`, `training`... Các nhóm chỉ có ở frontend: `access` (backend `permission` + `role`), `catalog` (gói dịch vụ trong `mission`), `profile` (trong `user`), `marketing` (website).
- `components/` chỉ chứa component. Hàm, hằng và cấu hình dùng chung đặt ở `lib/` hoặc `config/`.
- Không còn danh sách ngoại lệ tầng dữ liệu: mọi component lấy dữ liệu qua `hooks/<tính năng>`. Luồng nhiều bước tuần tự (upload từng tệp, đăng nhập nhiều bước, điều phối nhiệm vụ) dùng hook trả về hàm request ổn định (`useTrainingUploads`, `useAuthFlow`, `useMissionWorkflow`), không gọi `api/*` trực tiếp.
- `src/app/**/page.tsx` chỉ dựng trang từ một tầng của tính năng (thường là `components/<tính năng>`). Các biến thể UI của customer, operations, admin nằm trong feature tương ứng; không tái tạo ba ứng dụng riêng.
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
