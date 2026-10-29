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
| mục 10 bên dưới | giám sát uptime, log, chứng chỉ; những việc chỉ làm qua SSH |

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
  --exclude 'docs/handoff' --exclude 'docs/screenshots' --exclude '/backups' \
  ./ root@160.22.123.184:/opt/uav-pas/
scp deploy/.env.production root@160.22.123.184:/opt/uav-pas/deploy/.env.production
ssh root@160.22.123.184 'chmod 600 /opt/uav-pas/deploy/.env.production'
```

> Dùng `rsync` thay vì `git clone`, vì trên máy còn nhiều thay đổi chưa commit. Sau khi commit và push đầy đủ, có thể chuyển sang `git pull`.
>
> `--exclude '/backups'` là bắt buộc: `--delete` sẽ xóa mọi thứ trên VPS không có trong repo, kể cả bản sao lưu hằng ngày ở `/opt/uav-pas/backups` (mục 9).

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

Thư mục `.git` không được rsync lên VPS, nên mã commit và thời điểm build phải lấy trên **máy Mac** rồi truyền sang.
Chúng được gắn vào image backend (build args `APP_VERSION`, `APP_GIT_COMMIT`, `APP_BUILD_TIME`) và hiện ở
**Quản trị → Hạ tầng → Triển khai**. Build mà không truyền thì trang hiện `unknown`, hệ thống vẫn chạy bình thường.

```bash
# trên Mac, tại thư mục gốc repo: chạy lại lệnh rsync ở bước 2 (không cần scp lại .env.production nếu không đổi), rồi:
BUILD_ENV="APP_VERSION=$(git describe --tags --always --dirty) \
APP_GIT_COMMIT=$(git rev-parse --short HEAD)$(git diff --quiet HEAD || echo -dirty) \
APP_BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
ssh root@160.22.123.184 "cd /opt/uav-pas/deploy && $BUILD_ENV \
  docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build"
```

Hậu tố `-dirty` nghĩa là bản build có thay đổi chưa commit. Biến shell được ưu tiên hơn `--env-file`, nên không cần
(và không nên) ghi ba biến này vào `.env.production`.

## 9. Sao lưu database

Bản sao lưu phải nằm ngoài VPS: nếu VPS hỏng thì bản nằm trên chính nó cũng mất theo.
Cách dưới đây giữ 14 ngày trên VPS và đẩy thêm một bản lên bucket R2 riêng `uavpas-backups`.

**9.1. Chuẩn bị trên Cloudflare (làm một lần)**

- R2 → Create bucket `uavpas-backups` (không bật public access).
- R2 → Manage API tokens → tạo token mới, quyền **Object Read & Write**, chỉ áp dụng cho bucket `uavpas-backups`.
  Không dùng lại khoá của bucket `uavpas` (khoá đó nằm trong `.env.production`; nếu lộ, kẻ xấu có thể xoá cả ảnh lẫn bản sao lưu).
- Bucket `uavpas-backups` → Settings → Object lifecycle rules → xoá object sau 60 ngày.

**9.2. Cài rclone trên VPS (làm một lần)**

```bash
apt-get install -y rclone
rclone config    # n → tên: r2backup → kiểu: s3 → provider: Cloudflare → nhập Access Key ID / Secret Access Key của token vừa tạo
                 # endpoint: https://<ACCOUNT_ID>.r2.cloudflarestorage.com → các câu còn lại để mặc định
chmod 600 /root/.config/rclone/rclone.conf
rclone lsd r2backup:                             # phải thấy uavpas-backups
```

Khoá nhập vào `rclone config` chỉ nằm trong `/root/.config/rclone/rclone.conf` trên VPS; không ghi vào repo, không gửi qua chat.

**9.3. Script sao lưu hằng ngày**

```bash
mkdir -p /opt/uav-pas/backups && chmod 700 /opt/uav-pas/backups
cat > /etc/cron.daily/uav-pas-backup <<'CRON'
#!/bin/bash
set -euo pipefail
DIR=/opt/uav-pas/backups
FILE="$DIR/uav_pas-$(date +%F).sql.gz"
cd /opt/uav-pas/deploy
# Ghi ra file tạm rồi mới đổi tên, để một lần pg_dump lỗi không để lại file hỏng trông như bản hợp lệ.
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U uav_pas uav_pas | gzip > "$FILE.tmp"
gzip -t "$FILE.tmp"
mv "$FILE.tmp" "$FILE"
rclone copy "$FILE" r2backup:uavpas-backups/db/
find "$DIR" -name '*.sql.gz' -mtime +14 -delete
date -Is > "$DIR/LAST_SUCCESS"
CRON
chmod 700 /etc/cron.daily/uav-pas-backup
/etc/cron.daily/uav-pas-backup && ls -lh /opt/uav-pas/backups && rclone ls r2backup:uavpas-backups/db/
```

Nếu script lỗi ở bất kỳ bước nào, `LAST_SUCCESS` không được cập nhật. Kiểm tra định kỳ:

```bash
cat /opt/uav-pas/backups/LAST_SUCCESS            # phải là hôm nay hoặc hôm qua
```

**9.4. Thử khôi phục (nên làm mỗi tháng một lần)**

Bản sao lưu chỉ có giá trị khi khôi phục được. Thử vào một database tạm, không đụng vào database đang chạy:

```bash
cd /opt/uav-pas/deploy
C="docker compose --env-file .env.production -f docker-compose.prod.yml exec -T postgres"
$C createdb -U uav_pas uav_pas_restore_test
gunzip -c "$(ls -t /opt/uav-pas/backups/*.sql.gz | head -1)" | $C psql -q -U uav_pas -d uav_pas_restore_test
$C psql -U uav_pas -d uav_pas_restore_test -c "SELECT count(*) FROM users;"
$C dropdb -U uav_pas uav_pas_restore_test
```

## 10. Giám sát

Ứng dụng không được phép điều khiển Docker hay chạy lệnh trên VPS. Trang **Quản trị → Hạ tầng** chỉ *đọc*:
phiên bản đang chạy, lịch sử migration, hạn chứng chỉ TLS, bản sao lưu, dung lượng R2, database, cấu hình email.
Mọi thao tác thay đổi (khởi động lại, khôi phục, gia hạn chứng chỉ, xem log container) làm qua SSH như dưới đây,
vì cấp quyền Docker cho ứng dụng web đồng nghĩa cấp quyền root trên VPS cho bất kỳ ai chiếm được một tài khoản admin.

**10.1. Theo dõi uptime và cảnh báo**

Nên dùng dịch vụ **bên ngoài VPS** (UptimeRobot, Better Stack, Healthchecks…): nếu VPS chết thì công cụ giám sát chạy
trên chính nó cũng chết theo và không báo được.

- Monitor kiểu HTTP(S) keyword: URL `https://uav.all1.vn/actuator/health`, từ khoá `"UP"`, chu kỳ 1–5 phút.
- Thêm một monitor cho `https://uav.all1.vn/` (trang web, mong đợi 200).
- Bật cảnh báo qua email/Telegram, và cảnh báo hết hạn SSL nếu dịch vụ có (thường báo trước 14 ngày).

Nếu muốn tự host, chạy **Uptime Kuma** trên VPS, chỉ mở trên 127.0.0.1 và truy cập qua SSH tunnel:

```bash
docker run -d --name uptime-kuma --restart unless-stopped \
  --log-opt max-size=10m --log-opt max-file=3 \
  -p 127.0.0.1:3001:3001 -v uptime-kuma:/app/data louislam/uptime-kuma:1
# trên Mac: ssh -L 3001:127.0.0.1:3001 root@160.22.123.184  rồi mở http://localhost:3001
```

`/actuator/health` công khai chỉ trả `UP/DOWN`. Chi tiết (mail, sao lưu, TLS, webhook…) nằm ở **Quản trị → Sức khoẻ
hệ thống**, cần đăng nhập admin.

**10.2. Log container**

```bash
cd /opt/uav-pas/deploy
C="docker compose --env-file .env.production -f docker-compose.prod.yml"
$C ps                                   # trạng thái, số lần restart
$C logs --tail 200 backend              # 200 dòng cuối
$C logs -f --since 10m backend          # theo dõi trực tiếp 10 phút gần nhất, Ctrl+C để thoát
$C logs --since 1h backend | grep -E 'ERROR|WARN'
docker stats --no-stream                # CPU/RAM từng container
```

Log Docker mặc định không bao giờ xoay vòng và có thể làm đầy ổ đĩa. `docker-compose.prod.yml` đã giới hạn mỗi
container 5 file × 20 MB (`logging: json-file max-size/max-file`). Cấu hình này chỉ áp dụng cho container tạo mới:
lần `up -d --build` tiếp theo sẽ tạo lại container. Kiểm tra:

```bash
docker inspect --format '{{.HostConfig.LogConfig}}' $($C ps -q backend)   # {json-file map[max-file:5 max-size:20m]}
df -h /; docker system df                                                  # dung lượng ổ đĩa, image, volume
```

**10.3. Chứng chỉ HTTPS (certbot)**

```bash
certbot certificates                    # hạn của chứng chỉ uav.all1.vn trên nginx
systemctl list-timers | grep certbot    # timer tự gia hạn phải đang chạy
certbot renew --dry-run                 # thử gia hạn, không thay chứng chỉ thật
```

Trang **Hạ tầng → Triển khai** kiểm tra chứng chỉ mà trình duyệt nhìn thấy tại `APP_PUBLIC_URL`
(mỗi giờ một lần, báo vàng khi còn dưới 14 ngày). Nếu bản ghi DNS `uav` bật proxy Cloudflare (đám mây màu cam),
đó là chứng chỉ của Cloudflare, không phải của certbot: khi đó vẫn phải kiểm tra `certbot certificates` trên VPS.

**10.4. Sao lưu trong trang quản trị**

Thư mục `/opt/uav-pas/backups` (mục 9) được gắn **chỉ đọc** vào backend tại `/backups` (`APP_BACKUP_DIR`).
Trang **Hạ tầng → Sao lưu** đọc `LAST_SUCCESS` và danh sách `*.sql.gz`, báo **quá hạn** khi bản cuối cũ hơn 36 giờ
(`APP_BACKUP_STALE_AFTER_HOURS`). Ứng dụng không thấy bucket `uavpas-backups`: kiểm tra bản off-site bằng
`rclone ls r2backup:uavpas-backups/db/`. Khôi phục chỉ làm qua SSH theo mục 9.4.

## Xử lý sự cố

| Triệu chứng | Kiểm tra |
|---|---|
| Lỗi 502 | `docker compose ... ps`; backend/frontend đã chạy chưa; `curl 127.0.0.1:18080/actuator/health` |
| Lỗi SSL 525/526 | `certbot certificates`; `nginx -t`; chạy lại `certbot --nginx -d uav.all1.vn` |
| Đăng nhập xong bị đăng xuất ngay | `APP_COOKIE_SECURE=true` yêu cầu HTTPS; nginx phải gửi `X-Forwarded-Proto https` |
| Tải ảnh lên báo lỗi | CORS của bucket R2 thiếu `https://uav.all1.vn` |
| Build bị dừng giữa chừng (killed) | Thiếu RAM; thêm swap ở bước 1 |
| Trang Hạ tầng → Sao lưu báo "Thiếu" | `ls -l /opt/uav-pas/backups`; script ở mục 9.3 đã chạy chưa; container backend đã được tạo lại sau khi thêm volume chưa |
| Trang Triển khai hiện `unknown` | Build không qua lệnh ở mục 8 (thiếu `APP_GIT_COMMIT`…); không ảnh hưởng hoạt động |
