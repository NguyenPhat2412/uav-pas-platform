#!/usr/bin/env bash
# Đồng bộ một chiều từ nhánh tích hợp `main` sang 8 nhánh chuyên biệt cô lập:
#   backend, database, customer, operations, admin, mobile, ba, testcase
#
# Đặc điểm an toàn:
# - Chỉ trích xuất đúng cây thư mục thuộc phạm vi của từng nhánh (không kéo toàn bộ monorepo).
# - Thao tác trực tiếp trên Git Plumbing (GIT_INDEX_FILE tạm), KHÔNG checkout đổi nhánh làm xáo trộn working tree.
# - Sử dụng lịch sử nhánh cô lập độc lập (không tạo commit xóa thư mục từ main), ngăn chặn tuyệt đối
#   rủi ro gộp ngược nhầm làm mất code của mảng khác trên `main`.
# - Chỉ tạo commit mới trên nhánh con khi nội dung thuộc phạm vi nhánh đó thực sự thay đổi.
#
# Cách dùng:
#   ./scripts/sync-branches.sh           # Đồng bộ local cả 8 nhánh từ main
#   ./scripts/sync-branches.sh --push    # Đồng bộ local và đẩy main + 8 nhánh lên origin

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

SOURCE_REF="${SOURCE_REF:-refs/heads/main}"
SOURCE_SHORT="$(git rev-parse --short "$SOURCE_REF")"
DO_PUSH=false
FORCE_INIT=false

for arg in "$@"; do
    case "$arg" in
        --push) DO_PUSH=true ;;
        --reinit) FORCE_INIT=true ;;
        *)
            echo "Tham số không hợp lệ: $arg (hỗ trợ: --push, --reinit)" >&2
            exit 1
            ;;
    esac
done

branch_paths() {
    case "$1" in
        backend)
            printf '%s\n' ".gitignore" "backend" "api-contract"
            ;;
        database)
            printf '%s\n' ".gitignore" "docker-compose.yml" \
                "backend/src/main/resources/db/migration" \
                "docs/architecture/UAV_PAS_SCHEMA_INVENTORY.md" \
                "docs/architecture/BACKEND_DATABASE_MIGRATIONS.md"
            ;;
        customer)
            printf '%s\n' ".gitignore" "customer"
            ;;
        operations)
            printf '%s\n' ".gitignore" "operations" "edge/kv260"
            ;;
        admin)
            printf '%s\n' ".gitignore" "admin"
            ;;
        mobile)
            printf '%s\n' ".gitignore" "mobile"
            ;;
        ba)
            printf '%s\n' ".gitignore" "docs/README.md" \
                "docs/business" "docs/specs" "docs/plans" "docs/architecture"
            ;;
        testcase)
            printf '%s\n' ".gitignore" "api-contract" \
                "backend/src/test" "customer/tests" "operations/tests" \
                "admin/tests" "mobile/tests" "edge/kv260/tests" "docs/reports"
            ;;
        *)
            echo "Nhánh không xác định: $1" >&2
            exit 1
            ;;
    esac
}

branch_readme() {
    case "$1" in
        backend)
            cat <<'EOF'
# Nhánh `backend`: Dịch vụ Backend Spring Boot & Hợp đồng API

Nhánh này **chỉ chứa mã nguồn Backend và đặc tả API** (được tách cô lập từ `main`):

- `backend/` — Dịch vụ Spring Boot 4.1 (Java 21), bảo mật JWT/RBAC, điều phối nhiệm vụ UAV, không phận NFZ, thời tiết, mô phỏng bay, thanh toán SePay/VietQR, hỗ trợ trực tuyến 2 chiều và bộ kiểm thử JUnit.
- `api-contract/` — Đặc tả OpenAPI (`openapi.json`) và bộ kiểm thử Postman (`postman_collection.json`).

## Chạy và kiểm thử độc lập

```bash
cd backend
./mvnw spotless:check
./mvnw spring-boot:run       # http://localhost:8080
./mvnw test
```
EOF
            ;;
        database)
            cat <<'EOF'
# Nhánh `database`: Lược đồ PostgreSQL & Flyway Migrations

Nhánh này **chỉ chứa các tập tin cơ sở dữ liệu và cấu hình khởi chạy PostgreSQL** (được tách cô lập từ `main`):

- `backend/src/main/resources/db/migration/` — Toàn bộ các bản nâng cấp lược đồ Flyway tuần tự (`V1` đến `V47`).
- `docker-compose.yml` — Cấu hình khởi chạy PostgreSQL 16 & dịch vụ lưu trữ phục vụ phát triển cục bộ.
- `docs/architecture/UAV_PAS_SCHEMA_INVENTORY.md` & `BACKEND_DATABASE_MIGRATIONS.md` — Tài liệu danh mục bảng và quy chuẩn migration.
EOF
            ;;
        customer)
            cat <<'EOF'
# Nhánh `customer`: Trang Chủ Công Khai & Cổng Khách Hàng (`:3100`)

Nhánh này **chỉ chứa ứng dụng Web `customer/`** (được tách cô lập từ `main`, không kèm code của `backend`, `admin`, `operations` hay `mobile`):

- Website giới thiệu dịch vụ UAV PAS (`/`), popup gợi ý dịch vụ theo ngữ cảnh cuộn trang, kênh liên hệ Zalo & khung hỗ trợ trực tuyến 2 chiều với Admin.
- Cổng Khách hàng (`/customer/*`): khởi tạo nhiệm vụ khảo sát GIS, theo dõi vùng bay NFZ, quản lý gói cước/hóa đơn PDF và Học viện đào tạo UAV.

## Chạy và kiểm thử độc lập

```bash
cd customer
npm install
npm run dev                  # http://localhost:3100
npm run architecture:check && npm run typecheck && npm run lint && npm test
```
EOF
            ;;
        operations)
            cat <<'EOF'
# Nhánh `operations`: Cổng Vận Hành, Trạm Mặt Đất & KV260 Edge AI (`:3200`)

Nhánh này **chỉ chứa ứng dụng Web `operations/` và tác tử biên `edge/kv260/`** (được tách cô lập từ `main`):

- `operations/` — Cổng Vận hành (`http://localhost:3200`): gợi ý điều phối thông minh, phiếu kiểm tra an toàn trước bay, trung tâm mô phỏng bay số (`/operations/simulation`), buồng lái SAR AI (`/operations/sar-cockpit`), bảo trì đội bay và biên tập học liệu đào tạo.
- `edge/kv260/` — Tác tử thu thập telemetry & nhận diện mục tiêu biên trên phần cứng AMD Xilinx Kria KV260.

## Chạy và kiểm thử độc lập

```bash
cd operations
npm install
npm run dev                  # http://localhost:3200
npm run architecture:check && npm run typecheck && npm run lint && npm test
```
EOF
            ;;
        admin)
            cat <<'EOF'
# Nhánh `admin`: Cổng Quản Trị Hệ Thống (`:3300`)

Nhánh này **chỉ chứa ứng dụng Web `admin/`** (được tách cô lập từ `main`, không kèm code của `customer`, `operations`, `backend` hay `mobile`):

- Quản trị người dùng, phân quyền RBAC chi tiết, khóa thiết bị telemetry và nhật ký kiểm toán.
- Quản lý vùng trời & NOTAM tạm thời (`/admin/airspace`), cấu hình thời tiết & an toàn bay, cấu hình thanh toán & liên hệ công khai (Hotline / Zalo / Email).
- Hộp thư hỗ trợ trực tuyến `/admin/support` kèm mẫu trả lời nhanh 1 chạm và phân tích chất lượng phục vụ (`/admin/reports`).

## Chạy và kiểm thử độc lập

```bash
cd admin
npm install
npm run dev                  # http://localhost:3300
npm run architecture:check && npm run typecheck && npm run lint && npm test
```
EOF
            ;;
        mobile)
            cat <<'EOF'
# Nhánh `mobile`: Ứng Dụng Di Động Đa Vai Trò (Expo / React Native iOS)

Nhánh này **chỉ chứa ứng dụng di động `mobile/`** (được tách cô lập từ `main`, đã bao gồm sẵn `mobile/src/shared/` để biên dịch và kiểm thử độc lập):

- Hỗ trợ đầy đủ phân hệ Khách hàng (`src/app/customer/*`), Vận hành & SAR thực địa (`src/app/operations/*`), cùng Hộp thư hỗ trợ trực tuyến / trả lời nhanh cho Quản trị viên.
- Tuân thủ kiến trúc phân tầng nghiêm ngặt (`15–360` dòng/file, lưu khóa phiên trong `expo-secure-store`, bảng màu tập trung tại `styles/tokens.ts`).

## Chạy và kiểm thử độc lập

```bash
cd mobile
npm install
npx expo start --port 8081
npm run architecture:check && npx tsc --noEmit && npm test
```
EOF
            ;;
        ba)
            cat <<'EOF'
# Nhánh `ba`: Tài Liệu Phân Tích Nghiệp Vụ, Đặc Tả & Kiến Trúc

Nhánh này **chỉ chứa tài liệu BA, đặc tả thiết kế và kế hoạch kiến trúc** (được tách cô lập từ `main`):

- `docs/business/` — Tài liệu Phân tích Nghiệp vụ (`ba.pdf`, `BA_V3.md`), ma trận truy vết yêu cầu (`TRACEABILITY_V3.md`) và tiêu chí nghiệm thu.
- `docs/specs/` & `docs/plans/` — Đặc tả kỹ thuật và lộ trình triển khai từng giai đoạn.
- `docs/architecture/` — Tài liệu thiết kế kiến trúc đa cổng, bảo mật phiên xác thực và mô hình dữ liệu.
EOF
            ;;
        testcase)
            cat <<'EOF'
# Nhánh `testcase`: Bộ Kiểm Thử Tự Động, Hợp Đồng API & Báo Cáo Kiểm Chứng

Nhánh này **chỉ chứa các bộ kiểm thử tự động, kịch bản Postman/OpenAPI và báo cáo kiểm chứng** (được tách cô lập từ `main`):

- `api-contract/` — Bộ kiểm thử tự động Postman CLI (`postman_collection.json`) và đặc tả `openapi.json`.
- `backend/src/test/` — Bộ kiểm thử đơn vị và tích hợp bảo mật/cơ sở dữ liệu của Backend.
- `customer/tests/`, `operations/tests/`, `admin/tests/`, `mobile/tests/`, `edge/kv260/tests/` — Bộ kiểm thử kiến trúc, hợp đồng giao diện và luồng nghiệp vụ phía Client & Edge.
- `docs/reports/` — Hồ sơ kết quả kiểm thử và báo cáo nghiệm thu qua các mốc phát triển.
EOF
            ;;
    esac
}

BRANCHES=(backend database customer operations admin mobile ba testcase)
FORCE_PUSH_BRANCHES=()
FAST_PUSH_BRANCHES=()

sync_one_branch() {
    local branch="$1"
    local tmp_index
    tmp_index="$(mktemp "${TMPDIR:-/tmp}/uav-sync-index.XXXXXX")"
    rm -f "$tmp_index"

    local paths=()
    while IFS= read -r line; do
        [[ -n "$line" ]] && paths+=("$line")
    done < <(branch_paths "$branch")

    GIT_INDEX_FILE="$tmp_index" git ls-tree -r -z "$SOURCE_REF" -- "${paths[@]}" \
        | GIT_INDEX_FILE="$tmp_index" git update-index --add -z --index-info

    local readme_blob
    readme_blob="$(branch_readme "$branch" | git hash-object -w --stdin)"
    GIT_INDEX_FILE="$tmp_index" git update-index --add --cacheinfo "100644,${readme_blob},README.md"

    local new_tree
    new_tree="$(GIT_INDEX_FILE="$tmp_index" git write-tree)"
    rm -f "$tmp_index"

    local ref="refs/heads/$branch"
    local needs_root=false

    if [[ "$FORCE_INIT" == "true" ]] || ! git show-ref --verify --quiet "$ref"; then
        needs_root=true
    elif git cat-file -e "${ref}:.github" 2>/dev/null; then
        # Nhánh vẫn đang giữ cây monorepo cũ (chứa .github từ main) -> khởi tạo lại cây cô lập sạch
        needs_root=true
    fi

    local file_count
    file_count="$(git ls-tree -r --name-only "$new_tree" | wc -l | tr -d ' ')"

    if [[ "$needs_root" == "true" ]]; then
        local commit_sha
        commit_sha="$(git commit-tree "$new_tree" -m "chore($branch): isolate $branch branch scope from main@${SOURCE_SHORT}")"
        git update-ref "$ref" "$commit_sha"
        FORCE_PUSH_BRANCHES+=("$branch")
        printf "  [isolated] %-12s -> %s (%s files)\n" "$branch" "$(git rev-parse --short "$commit_sha")" "$file_count"
    else
        local current_tree
        current_tree="$(git rev-parse "${ref}^{tree}")"
        if [[ "$new_tree" == "$current_tree" ]]; then
            printf "  [up-to-date] %-10s == %s (%s files)\n" "$branch" "$(git rev-parse --short "$ref")" "$file_count"
        else
            local commit_sha
            commit_sha="$(git commit-tree "$new_tree" -p "$ref" -m "chore($branch): sync isolated $branch files from main@${SOURCE_SHORT}")"
            git update-ref "$ref" "$commit_sha"
            printf "  [synced]   %-12s -> %s (%s files)\n" "$branch" "$(git rev-parse --short "$commit_sha")" "$file_count"
        fi
        if git cat-file -e "refs/remotes/origin/${branch}:.github" 2>/dev/null; then
            FORCE_PUSH_BRANCHES+=("$branch")
        else
            FAST_PUSH_BRANCHES+=("$branch")
        fi
    fi
}

echo "Đồng bộ 8 nhánh chuyên biệt cô lập từ main (${SOURCE_SHORT})..."
for b in "${BRANCHES[@]}"; do
    sync_one_branch "$b"
done

if [[ "$DO_PUSH" == "true" ]]; then
    echo "Đang đẩy main lên origin..."
    git push origin main
    if [[ ${#FORCE_PUSH_BRANCHES[@]} -gt 0 ]]; then
        echo "Đang cập nhật cây cô lập mới lên origin cho: ${FORCE_PUSH_BRANCHES[*]}"
        git push --force-with-lease origin "${FORCE_PUSH_BRANCHES[@]}"
    fi
    if [[ ${#FAST_PUSH_BRANCHES[@]} -gt 0 ]]; then
        echo "Đang đẩy đồng bộ tăng trưởng lên origin cho: ${FAST_PUSH_BRANCHES[*]}"
        git push origin "${FAST_PUSH_BRANCHES[@]}"
    fi
fi
