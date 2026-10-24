# Triển khai UAV PAS lên VPS

Kiến trúc: **một domain `https://uav.all1.vn`**.

```
Trình duyệt ──HTTPS──> nginx trên VPS (chứng chỉ Let's Encrypt qua certbot)
                                                      ├─ /api/**          → backend  127.0.0.1:18080 (Spring Boot)
                                                      ├─ /actuator/health → backend
                                                      └─ /**              → frontend 127.0.0.1:13100 (Next.js)
Ảnh/tệp: trình duyệt ⇄ Cloudflare R2 (bucket uavpas) qua URL ký tạm thời
PostgreSQL: chỉ trong mạng Docker, không mở cổng ra ngoài
```

Vì sao không dùng `api.uav.all1.vn`: SSL miễn phí của Cloudflare chỉ phủ `*.all1.vn` (một cấp), không phủ tên hai cấp.
Chạy chung một domain cũng giúp cookie đăng nhập chỉ thuộc `uav.all1.vn` và không cần CORS giữa web và API.

Các file trong thư mục này:

| File | Dùng để |
|---|---|
| `docker-compose.prod.yml` | postgres + backend + frontend, cổng chỉ mở trên 127.0.0.1 |
| `.env.production` | cấu hình thật (R2, mật khẩu DB, JWT). **Không commit, không gửi qua chat.** |
| `.env.production.example` | bản mẫu không có bí mật |
| `nginx/uav.all1.vn.conf` | server block cho nginx trên VPS |

---

## 0. Trước khi bắt đầu (bảo mật)

Mật khẩu root đã từng được gửi qua chat, nên hãy đổi nó và chuyển sang đăng nhập bằng SSH key.

Trên **máy Mac**:

```bash
ssh-keygen -t ed25519 -C "uav-pas-deploy"        # bỏ qua nếu đã có ~/.ssh/id_ed25519
ssh-copy-id root@160.22.123.184
ssh root@160.22.123.184                          # thử đăng nhập bằng key
```

Trên **VPS**:

```bash
passwd                                           # đặt mật khẩu root mới
```

## 1. Kiểm tra VPS

```bash
ssh root@160.22.123.184
free -h                                          # build Next.js + Maven cần khoảng 3 GB RAM (kể cả swap)
docker --version; docker compose version
nginx -v
ss -ltnp | grep -E ':(80|443|13100|18080) '      # 13100/18080 phải đang trống
ls /etc/nginx/sites-enabled/                     # xem trang âm nhạc đang được cấu hình ở đâu
```

Nếu RAM dưới 3 GB, thêm swap:

```bash
fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

Nếu chưa có Docker:

```bash
curl -fsSL https://get.docker.com | sh
```

## 2. Chép mã nguồn và cấu hình lên VPS

Trên **máy Mac**, tại thư mục gốc repo (`uav-pas-platform`):

```bash
rsync -az --delete \
  --exclude node_modules --exclude .next --exclude target --exclude .git --exclude .claude \
  --exclude .DS_Store --exclude .idea --exclude .vscode \
  --exclude '/.env' --exclude '/backend/.env' --exclude '/frontend/.env' --exclude '.env.local' \
  --exclude 'deploy/.env.production' --exclude 'deploy/build.log' \
  --exclude 'docs/handoff' --exclude 'docs/screenshots' \
  ./ root@160.22.123.184:/opt/uav-pas/
scp deploy/.env.production root@160.22.123.184:/opt/uav-pas/deploy/.env.production
ssh root@160.22.123.184 'chmod 600 /opt/uav-pas/deploy/.env.production'
```

> Dùng `rsync` thay vì `git clone`, vì trên máy còn nhiều thay đổi chưa commit. Sau khi commit và push đầy đủ, có thể chuyển sang `git pull`.

Nếu có số hotline điều phối, sửa `NEXT_PUBLIC_DISPATCH_HOTLINE` trong `/opt/uav-pas/deploy/.env.production` trước khi build.

## 3. Build và chạy

Trên **VPS**:

```bash
cd /opt/uav-pas/deploy
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f backend   # chờ dòng "Started UavPlatformApplication", Ctrl+C để thoát
curl -s http://127.0.0.1:18080/actuator/health                                          # {"status":"UP"...}
curl -sI http://127.0.0.1:13100 | head -1                                                # HTTP/1.1 200
```

Lần đầu khởi động, Flyway tự tạo toàn bộ bảng trong database mới.

## 4. Cloudflare

- **DNS**: bản ghi `uav` đã trỏ về VPS `160.22.123.184` (đang chạy).
- **R2 → uavpas → Settings → CORS Policy**: phải có `https://uav.all1.vn` trong `AllowedOrigins` (dùng JSON đã gửi trước đó).

## 5. nginx + HTTPS (certbot, giống các site khác trên VPS)

Trên **VPS**:

```bash
cp /opt/uav-pas/deploy/nginx/uav.all1.vn.conf /etc/nginx/sites-available/uav.all1.vn
ln -sf /etc/nginx/sites-available/uav.all1.vn /etc/nginx/sites-enabled/uav.all1.vn
nginx -t && systemctl reload nginx
certbot --nginx -d uav.all1.vn --redirect      # tự thêm HTTPS, tự gia hạn
```

Không có server block này thì `uav.all1.vn` rơi vào site `banquyenviet.vn` (site đó khai báo `server_name … _` để bắt mọi domain).
Khi chạy lại `cp` sau này, các dòng HTTPS do certbot thêm sẽ mất: chạy lại lệnh `certbot --nginx -d uav.all1.vn --redirect`.

## 6. Kiểm tra

```bash
curl -s https://uav.all1.vn/actuator/health        # {"status":"UP"...}
curl -s -o /dev/null -w "%{http_code}\n" https://uav.all1.vn/api/v1/auth/me   # 401 khi chưa đăng nhập
curl -s -o /dev/null -w "%{http_code}\n" https://uav.all1.vn/customer/login   # 200
```

Mở `https://uav.all1.vn` trên trình duyệt, đăng ký, rồi thử tải ảnh đại diện ở trang **Tài khoản** để kiểm tra R2.

## 7. Tạo tài khoản quản trị đầu tiên

Database mới không có admin. Đăng ký một tài khoản tại `https://uav.all1.vn/customer/register`, rồi nâng quyền trên **VPS**:

```bash
cd /opt/uav-pas/deploy
docker compose --env-file .env.production -f docker-compose.prod.yml exec postgres \
  psql -U uav_pas -d uav_pas -c "UPDATE users SET role='ROLE_ADMIN' WHERE email='EMAIL_CUA_BAN';"
```

Sau đó đăng nhập lại tại `https://uav.all1.vn/admin/login`.

## 8. Cập nhật phiên bản mới

```bash
# trên Mac: chạy lại lệnh rsync ở bước 2 (không cần scp lại .env.production nếu không đổi)
# trên VPS:
cd /opt/uav-pas/deploy && docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

## 9. Sao lưu database

```bash
mkdir -p /opt/uav-pas/backups
cat > /etc/cron.daily/uav-pas-backup <<'CRON'
#!/bin/sh
cd /opt/uav-pas/deploy && docker compose --env-file .env.production -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U uav_pas uav_pas | gzip > /opt/uav-pas/backups/uav_pas-$(date +\%F).sql.gz
find /opt/uav-pas/backups -name '*.sql.gz' -mtime +14 -delete
CRON
chmod +x /etc/cron.daily/uav-pas-backup
```

## Xử lý sự cố

| Triệu chứng | Kiểm tra |
|---|---|
| Lỗi 502 | `docker compose ... ps`; backend/frontend đã chạy chưa; `curl 127.0.0.1:18080/actuator/health` |
| Lỗi SSL 525/526 | `certbot certificates`; `nginx -t`; chạy lại `certbot --nginx -d uav.all1.vn` |
| Đăng nhập xong bị đăng xuất ngay | `APP_COOKIE_SECURE=true` yêu cầu HTTPS; nginx phải gửi `X-Forwarded-Proto https` |
| Tải ảnh lên báo lỗi | CORS của bucket R2 thiếu `https://uav.all1.vn` |
| Build bị dừng giữa chừng (killed) | Thiếu RAM; thêm swap ở bước 1 |
