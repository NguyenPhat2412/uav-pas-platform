# UAV PAS Frontend

Workspace này chứa bốn ứng dụng trong `apps`, thư viện chung trong `packages` và kiểm thử trong `tests`. Giao diện cũ nằm trong `legacy`, có lockfile và thư viện độc lập.

Xem [hướng dẫn cài đặt, chạy và kiểm thử](../docs/README.md).

- Cài workspace: `npm ci`.
- Cài giao diện cũ: `npm ci --prefix legacy`.
- Chạy giao diện cũ: `npm run dev`.
- Chạy ứng dụng mới: `npm run dev:web`, `npm run dev:customer`, `npm run dev:operations`, `npm run dev:admin`.
- `npm run build` build bốn ứng dụng và thư viện chung; `npm run build:legacy` build giao diện cũ.

Cài thư viện tại đây để `node_modules` luôn nằm trong `frontend`.
