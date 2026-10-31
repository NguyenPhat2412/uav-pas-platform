# UAV PAS Frontend

Một ứng dụng Next.js chia theo tầng rồi theo tính năng: `src/{api,hooks,components,types,utils}/<tính năng>`. `src/app` chỉ định tuyến và layout. Không còn kiến trúc
workspace nhiều app hoặc giao diện legacy.

```sh
npm ci
# Tạo .env.local từ .env.example, đặt API_URL đúng backend hiện hành.
npm run dev
```

Website: http://localhost:3100. Các khu vực: `/customer`, `/operations`, `/admin`.

Bản production: `npm run build` rồi `npm start`. Cài thư viện tại thư mục này để `node_modules` nằm trong frontend.

```sh
npm run architecture:check
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run test:e2e` dùng fixture từ runner cô lập `backend/infra/ci/run.py`; không chạy bộ tạo nhiệm vụ trên DB chính.
`npm run test:ui` kiểm tra route, quyền và responsive bằng dữ liệu giả lập riêng trong trình duyệt, không thay dữ liệu
backend.

Xem [kiến trúc](../docs/architecture/FRONTEND_STRUCTURE.md), [ánh xạ đường dẫn](../docs/architecture/FRONTEND_ROUTE_MIGRATION.md)
và [hướng dẫn toàn dự án](../docs/README.md).
