# Thiết Kế Chi Tiết Hệ Thống Xác Thực Đầy Đủ (JWT, Zalo OA, Frontend i18n & Clean Backend)

**Ngày:** 03/10/2026  
**Dự án:** UAV PAS Platform (Full-stack: Backend + Frontend)  
**Tác giả:** Antigravity & User  
**Trạng thái:** Approved  

---

## 1. Mục tiêu và Phạm vi

Xây dựng toàn diện hệ thống Xác thực (Authentication) cho UAV PAS Platform:
- **Backend**:
  - Tích hợp chuẩn bảo mật **JWT (JSON Web Token)** để cấp phát và xác thực phiên đăng nhập không trạng thái (stateless).
  - Bổ sung trường `zaloId`, `fullName`, `avatarUrl` trong cơ sở dữ liệu `AppUser`.
  - Cung cấp các endpoint: Đăng nhập mật khẩu (`POST /api/v1/auth/login`), Đăng nhập qua Zalo OA (`GET /api/v1/auth/zalo/url`, `POST /api/v1/auth/zalo/callback`), và Lấy thông tin tài khoản hiện tại (`GET /api/v1/auth/me`).
  - Hỗ trợ Mock Zalo OAuth Service cho môi trường phát triển cục bộ (local dev).
- **Frontend**:
  - Tái cấu trúc thư mục `frontend/src/` theo mô hình Feature-based chuẩn (tương thích mẫu dự án `apmarket`: `features/`, `components/`, `contexts/`, `i18n/`, `messages/`, `lib/`).
  - Tích hợp bảng màu Tailwind CSS tùy chỉnh, Google Fonts `Be Vietnam Pro` và biểu tượng `Material Symbols Outlined` từ bản thiết kế HTML của UAV PAS.
  - Xây dựng Component dạng Props-driven: `AuthSidebar`, `LoginForm` (hỗ trợ chuyển đổi giữa đăng nhập mật khẩu và Zalo OA), `RegisterForm`, `ZaloLoginButton`.
  - Hỗ trợ đa ngôn ngữ quốc tế hóa (**i18n**) toàn diện qua `I18nContext` với 2 bộ ngôn ngữ `vi.json` và `en.json`.

---

## 2. Kiến trúc Backend & Database

### 2.1. Cập nhật Thực thể & Repository
- **`AppUser`**:
  - `id`: Long (PK)
  - `username`: String (50, unique, nullable = false)
  - `email`: String (255, unique, nullable = false)
  - `passwordHash`: String (255, nullable = true để hỗ trợ tài khoản Zalo OAuth)
  - `phoneNumber`: String (20, nullable = true)
  - `zaloId`: String (100, unique, nullable = true)
  - `fullName`: String (100, nullable = true)
  - `avatarUrl`: String (500, nullable = true)
  - `status`: UserStatus (ACTIVE, INACTIVE, SUSPENDED)
  - `createdAt`, `updatedAt`: LocalDateTime (quản lý bởi `@PrePersist`, `@PreUpdate`)
- **`UserRepository`**:
  - Bổ sung: `Optional<AppUser> findByZaloId(String zaloId);`
  - Bổ sung: `boolean existsByZaloId(String zaloId);`

### 2.2. JWT & Bộ lọc Bảo mật
- **`io.jsonwebtoken:jjwt-api:0.12.6`** (+ `jjwt-impl`, `jjwt-jackson` runtime).
- **`JwtTokenProvider`**:
  - Tạo accessToken với thời hạn (mặc định 24h), ký bằng khóa bí mật HMAC-SHA256 (`app.jwt.secret`).
  - Trích xuất `username` / `userId` từ token.
  - Kiểm tra tính hợp lệ và hạn sử dụng của token.
- **`JwtAuthenticationFilter`**:
  - Đọc header `Authorization: Bearer <token>`.
  - Xác thực token và thiết lập `UsernamePasswordAuthenticationToken` vào `SecurityContextHolder`.

### 2.3. Tầng Nghiệp vụ Auth & Zalo OA
- **DTOs**:
  - `LoginRequest(String usernameOrEmail, String password)`
  - `AuthResponse(String accessToken, String tokenType, UserResponse user)`
  - `ZaloLoginRequest(String code, String redirectUri)`
- **`ZaloOAuthService`**:
  - `getAuthorizationUrl()`: Tạo URL đăng nhập Zalo OA.
  - `authenticateWithZalo(String code)`: Trao đổi code lấy thông tin người dùng Zalo. Nếu chưa có tài khoản, tự động tạo mới `AppUser` gắn `zaloId`.
- **`AuthService`**:
  - `AuthResponse login(LoginRequest request)`
  - `UserResponse register(RegisterRequest request)`
  - `AuthResponse loginWithZalo(ZaloLoginRequest request)`
  - `String getZaloAuthUrl()`
  - `UserResponse getCurrentUser(String username)`

---

## 3. Kiến trúc Frontend (`frontend/src/`)

### 3.1. Cấu trúc Thư mục
```text
frontend/src/
├── app/
│   ├── layout.tsx              # Root Layout: Provider (I18n, Auth), Fonts
│   ├── page.tsx                # Trang chủ: redirect sang /login nếu chưa auth
│   ├── (auth)/
│   │   ├── login/page.tsx      # Trang Đăng nhập
│   │   └── register/page.tsx   # Trang Đăng ký
│   └── globals.css             # Tailwind base & custom utility styles
├── components/ui/
│   ├── Button.tsx
│   ├── Input.tsx
│   └── PasswordInput.tsx       # Input kèm nút toggle hiển thị/ẩn mật khẩu
├── features/auth/
│   ├── components/
│   │   ├── AuthSidebar.tsx     # Cột trái UAV PAS radar, logo, telemetry
│   │   ├── LoginForm.tsx       # Form đăng nhập 2 chế độ (Password & Zalo OA)
│   │   ├── RegisterForm.tsx    # Form đăng ký
│   │   └── ZaloLoginButton.tsx # Nút CTA Zalo OA chính thức
│   ├── hooks/useAuth.ts
│   ├── services/auth.service.ts
│   └── types/auth.types.ts
├── contexts/
│   ├── AuthContext.tsx         # User state, token in localStorage, login, logout
│   └── I18nContext.tsx         # Language switcher, t(key)
├── i18n/
│   └── config.ts
├── messages/
│   ├── vi.json                 # Bản dịch tiếng Việt
│   └── en.json                 # Bản dịch tiếng Anh
└── lib/
    ├── api.client.ts           # Fetch client tự đính Bearer token
    └── utils.ts                # cn helper
```

### 3.2. Thiết kế Giao diện người dùng
- Màu sắc thương hiệu định nghĩa trong Tailwind:
  - `primary`: `#004ac6`, `primary-container`: `#2563eb`
  - `inverse-surface`: `#213145`, `inverse-on-surface`: `#eaf1ff`
  - `surface-container-lowest`: `#ffffff`, `surface-container-highest`: `#d3e4fe`
- Hai chế độ đăng nhập linh hoạt trong `LoginForm`:
  1. Đăng nhập qua Mật khẩu (Email + Password + Show/Hide eye icon).
  2. Đăng nhập một chạm qua Zalo OA (Zalo Official Account).

---

## 4. Kế hoạch Kiểm thử & Xác nhận
1. Backend Unit Tests & MockMvc Tests:
   - `AuthServiceTest`: Đăng nhập đúng, sai mật khẩu (401), tài khoản không hoạt động, đăng nhập Zalo.
   - `AuthControllerTest`: Kiểm tra endpoint `/api/v1/auth/login`, `/api/v1/auth/zalo/url`, `/api/v1/auth/me`.
   - `JwtTokenProviderTest`: Kiểm tra sinh và xác minh token JWT.
2. Frontend Build Verification:
   - `npm run build` trên thư mục `frontend` để đảm bảo không lỗi kiểu TypeScript và tương thích SSR.
