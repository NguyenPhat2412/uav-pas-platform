# UAV PAS Platform — Kiến trúc Quản lý Ngoại lệ Đa tầng (4-Layer Exception Handling)

Ngày cập nhật: **14/10/2026**  
Commit: `b3d8f9b`  
Thư mục Google Drive đích: `uav_platform_pass` (`1XIEMM23_0lirBKT4yXnKVssxLWWK-JSP`)

---

## 1. Tổng quan Kiến trúc 4 Tầng

Hệ thống **UAV PAS Platform** áp dụng mô hình quản lý ngoại lệ xuyên suốt từ Backend (Spring Boot 3 / Java 17) qua lớp hợp đồng API (`@uav/api-client` / `@uav/types`), lớp quản lý trạng thái bất đồng bộ (TanStack Query), đến tận giao diện người dùng (Next.js App Router Error Boundaries):

1. **Tầng 1 — Backend Global Exception Handler (`backend/.../error/GlobalExceptionHandler.java`)**
2. **Tầng 2 — API Client & Contract Normalization (`packages/api-client` & `packages/types`)**
3. **Tầng 3 — TanStack Query Retry Policy & Service Fallback (`packages/query` & `apps/*/features/*`)**
4. **Tầng 4 — Next.js Route Error & Not-Found Boundaries (`apps/{operations,customer,admin}/app/**/error.tsx` & `not-found.tsx`)**

---

## 2. Chi tiết Tầng 1: Backend (`GlobalExceptionHandler`)

Mọi phản hồi lỗi từ REST API đều được chuẩn hóa theo cấu trúc `ApiResponse<Void>` kết hợp `ErrorResponse`:

| Ngoại lệ (Exception) | HTTP Status | Mã lỗi (`code`) | Ý nghĩa & Xử lý |
|---|---|---|---|
| `ResourceNotFoundException` / `NoResourceFoundException` | `404 Not Found` | `RESOURCE_NOT_FOUND` | Không tìm thấy bản ghi hoặc đường dẫn API |
| `UnauthorizedException` / `BadCredentialsException` | `401 Unauthorized` | `UNAUTHORIZED` / `BAD_CREDENTIALS` | Chưa xác thực hoặc sai thông tin đăng nhập |
| `ForbiddenException` / `AccessDeniedException` | `403 Forbidden` | `FORBIDDEN` / `ACCESS_DENIED` | Không đủ quyền RBAC hoặc bị chặn bởi `DENY` override |
| `ConflictException` / `DataIntegrityViolationException` | `409 Conflict` | `CONFLICT` / `DATA_INTEGRITY_CONFLICT` | Xung đột trạng thái nghiệp vụ hoặc ràng buộc CSDL (unique/FK) |
| `UnprocessableEntityException` | `422 Unprocessable Entity` | `UNPROCESSABLE_ENTITY` | Vi phạm quy tắc nghiệp vụ (ví dụ: UAV không sẵn sàng, thiết bị hết tồn kho) |
| `MethodArgumentNotValidException` / `ConstraintViolationException` | `400 Bad Request` | `VALIDATION_ERROR` | Lỗi kiểm tra dữ liệu đầu vào kèm `validationErrors` chi tiết theo từng trường |
| `HttpMessageNotReadableException` | `400 Bad Request` | `MALFORMED_JSON_REQUEST` | Payload JSON sai cú pháp hoặc sai kiểu enum/ngày tháng |
| `MethodArgumentTypeMismatchException` / `MissingServletRequestParameterException` | `400 Bad Request` | `INVALID_REQUEST_PARAMETER` | Sai kiểu dữ liệu tham số URL/query (예: truyền chuỗi vào ID kiểu số) hoặc thiếu tham số bắt buộc |
| `Exception` (Uncaught) | `500 Internal Server Error` | `INTERNAL_SERVER_ERROR` | Ghi log stack trace phía server nhưng ẩn chi tiết nhạy cảm khỏi client |

---

## 3. Chi tiết Tầng 2: `@uav/api-client` & `ApiError`

Lớp `ApiError` trong `packages/api-client/src/index.ts` kế thừa từ `Error` và lưu trữ đầy đủ:
- `status`: Mã HTTP (`400`, `401`, `403`, `404`, `409`, `422`, `500`)
- `code`: Mã lỗi chuẩn hóa từ Backend (`MALFORMED_JSON_REQUEST`, `DATA_INTEGRITY_CONFLICT`, `VALIDATION_ERROR`, ...)
- `validationErrors`: Map lỗi chi tiết theo từng trường form (`Record<string, string>`)
- Tự động kích hoạt luồng làm mới token (`refreshToken()`) khi gặp `401` lần đầu và chuyển hướng đăng nhập nếu phiên hết hạn.

---

## 4. Chi tiết Tầng 3 & 4: TanStack Query & Next.js Error Boundaries

- **Chính sách Retry thông minh (`packages/query/src/index.ts`):** Không retry các lỗi nghiệp vụ/quyền (`401`, `403`, `422`), chỉ retry tối đa 2 lần cho các lỗi mạng tạm thời.
- **Route-level `error.tsx` & `not-found.tsx`:**
  - Được trang bị đầy đủ trên cả 3 cổng: **Operations (`:3102`)**, **Customer (`:3101`)**, và **Admin (`:3103`)**.
  - Hiển thị mã lỗi (`error.code`) và `error.digest`, cung cấp nút **"Thử lại ngay" (`reset()`)** để khôi phục component mà không làm mất trạng thái toàn trang.
