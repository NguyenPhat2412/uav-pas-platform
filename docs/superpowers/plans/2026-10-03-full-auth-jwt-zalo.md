# Full Auth JWT, Zalo OA, and Frontend i18n Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng toàn diện hệ thống Authentication cho UAV PAS Platform gồm Backend (JWT, cơ sở dữ liệu Zalo OA, endpoints login/register/zalo/me) và Frontend (Next.js tái cấu trúc theo mẫu `apmarket` với `src/features/auth`, giao diện sidebar UAV PAS, form đăng nhập 2 chế độ Mật khẩu & Zalo OA, form đăng ký, hỗ trợ đa ngôn ngữ i18n).

**Architecture:** 
- Backend: Clean Layered Architecture với Spring Data JPA, JJWT 0.12.6, Spring Security Stateless, Zalo OAuth2 Service.
- Frontend: Feature-based architecture (`src/features/auth`), Props-driven UI components, React Context cho Auth và i18n, Tailwind CSS tùy chỉnh theo nhận diện UAV PAS.

**Tech Stack:** Java 21, Spring Boot 4.1.1, Spring Security, JJWT, PostgreSQL, Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4.

## Global Constraints

- Backend package: `com.uav_pass.local`
- Backend endpoints bắt đầu với `/api/v1/auth`
- Không bao giờ trả về trường `passwordHash` trong response DTO
- Frontend nằm trong `frontend/src/` tuân thủ mẫu `apmarket`
- Mọi chuỗi giao diện trên Frontend đều được dịch song ngữ qua `messages/vi.json` và `messages/en.json`

---

### Task 1: Backend Database & JWT Infrastructure

**Files:**
- Modify: `backend/pom.xml`
- Modify: `backend/src/main/java/com/uav_pass/local/auth/entity/AppUser.java`
- Modify: `backend/src/main/java/com/uav_pass/local/auth/repository/UserRepository.java`
- Create: `backend/src/main/java/com/uav_pass/local/config/jwt/JwtTokenProvider.java`
- Create: `backend/src/main/java/com/uav_pass/local/config/jwt/JwtAuthenticationFilter.java`
- Modify: `backend/src/main/java/com/uav_pass/local/config/SecurityConfig.java`
- Test: `backend/src/test/java/com/uav_pass/local/config/jwt/JwtTokenProviderTest.java`

- [ ] **Step 1: Bổ sung dependencies JJWT vào `backend/pom.xml`**

Thêm các dependency JJWT (version 0.12.6):
```xml
		<dependency>
			<groupId>io.jsonwebtoken</groupId>
			<artifactId>jjwt-api</artifactId>
			<version>0.12.6</version>
		</dependency>
		<dependency>
			<groupId>io.jsonwebtoken</groupId>
			<artifactId>jjwt-impl</artifactId>
			<version>0.12.6</version>
			<scope>runtime</scope>
		</dependency>
		<dependency>
			<groupId>io.jsonwebtoken</groupId>
			<artifactId>jjwt-jackson</artifactId>
			<version>0.12.6</version>
			<scope>runtime</scope>
		</dependency>
```

- [ ] **Step 2: Cập nhật AppUser Entity & UserRepository**

Cập nhật `AppUser.java`: thêm `zaloId`, `fullName`, `avatarUrl`, cho phép `passwordHash` nullable (hỗ trợ Zalo login).
Cập nhật `UserRepository.java`: thêm `Optional<AppUser> findByZaloId(String zaloId)` và `boolean existsByZaloId(String zaloId)`.

- [ ] **Step 3: Tạo JwtTokenProvider và JwtAuthenticationFilter**

Tạo `backend/src/main/java/com/uav_pass/local/config/jwt/JwtTokenProvider.java`:
- Quản lý signing key bí mật HMAC-SHA256 (`app.jwt.secret`).
- Hàm `generateToken(Long userId, String username, String email)`.
- Hàm `getUsernameFromToken(String token)`.
- Hàm `validateToken(String token)`.

Tạo `backend/src/main/java/com/uav_pass/local/config/jwt/JwtAuthenticationFilter.java`:
- Trích xuất Bearer token từ `Authorization` header.
- Thiết lập `UsernamePasswordAuthenticationToken` vào `SecurityContextHolder`.

- [ ] **Step 4: Cập nhật SecurityConfig để tích hợp JwtAuthenticationFilter**

Gắn `JwtAuthenticationFilter` vào trước `UsernamePasswordAuthenticationFilter`.

- [ ] **Step 5: Viết Unit Test cho JwtTokenProvider**

Tạo `backend/src/test/java/com/uav_pass/local/config/jwt/JwtTokenProviderTest.java` kiểm tra sinh token, giải mã token hợp lệ và từ chối token giả mạo.

- [ ] **Step 6: Kiểm tra biên dịch & Test**

Chạy: `./backend/mvnw -f backend/pom.xml test -Dtest="JwtTokenProviderTest"`  
Expected: BUILD SUCCESS

- [ ] **Step 7: Commit**

```bash
git add backend/pom.xml backend/src/main/java/ backend/src/test/
git commit -m "feat(security): add JJWT dependencies, update AppUser for Zalo, and implement JWT provider and filter"
```

---

### Task 2: Backend Login, Zalo OA Service & Endpoints

**Files:**
- Create: `backend/src/main/java/com/uav_pass/local/auth/dto/LoginRequest.java`
- Create: `backend/src/main/java/com/uav_pass/local/auth/dto/AuthResponse.java`
- Create: `backend/src/main/java/com/uav_pass/local/auth/dto/ZaloLoginRequest.java`
- Create: `backend/src/main/java/com/uav_pass/local/auth/service/ZaloOAuthService.java`
- Create: `backend/src/main/java/com/uav_pass/local/auth/service/impl/ZaloOAuthServiceImpl.java`
- Modify: `backend/src/main/java/com/uav_pass/local/common/constant/CoreConstants.java`
- Modify: `backend/src/main/java/com/uav_pass/local/common/constant/RestEndpoint.java`
- Modify: `backend/src/main/java/com/uav_pass/local/auth/service/AuthService.java`
- Modify: `backend/src/main/java/com/uav_pass/local/auth/service/impl/AuthServiceImpl.java`
- Modify: `backend/src/main/java/com/uav_pass/local/auth/controller/AuthController.java`
- Test: `backend/src/test/java/com/uav_pass/local/auth/service/AuthServiceTest.java`
- Test: `backend/src/test/java/com/uav_pass/local/auth/controller/AuthControllerTest.java`

- [ ] **Step 1: Định nghĩa DTOs và Hằng số mới**

Tạo `LoginRequest.java`:
```java
public record LoginRequest(
    @NotBlank(message = "Username or email is required") String usernameOrEmail,
    @NotBlank(message = "Password is required") String password
) {}
```
Tạo `AuthResponse.java`:
```java
public record AuthResponse(
    String accessToken,
    String tokenType,
    UserResponse user
) {}
```
Tạo `ZaloLoginRequest.java`:
```java
public record ZaloLoginRequest(
    @NotBlank(message = "Zalo auth code is required") String code,
    String redirectUri
) {}
```
Cập nhật `RestEndpoint.java`:
- `LOGIN = "/login"`
- `ZALO_URL = "/zalo/url"`
- `ZALO_CALLBACK = "/zalo/callback"`
- `ME = "/me"`

- [ ] **Step 2: Triển khai ZaloOAuthService**

Tạo `ZaloOAuthService.java` & `ZaloOAuthServiceImpl.java`:
- `String getAuthorizationUrl()`
- `ZaloUserProfile getUserProfile(String code)` (hỗ trợ mock khi chạy local không có Zalo App credentials).

- [ ] **Step 3: Cập nhật AuthService & AuthServiceImpl**

Bổ sung các phương thức:
- `AuthResponse login(LoginRequest request)`: tìm theo email hoặc username, kiểm tra password qua `passwordEncoder.matches`, tạo JWT token.
- `AuthResponse loginWithZalo(ZaloLoginRequest request)`: tìm hoặc tạo `AppUser` qua `zaloId`, tạo JWT token.
- `String getZaloAuthUrl()`.
- `UserResponse getCurrentUser(String username)`.

- [ ] **Step 4: Cập nhật AuthController**

Thêm các endpoint:
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/zalo/url`
- `POST /api/v1/auth/zalo/callback`
- `GET /api/v1/auth/me`

- [ ] **Step 5: Viết Unit & MockMvc Test**

Cập nhật `AuthServiceTest.java` và `AuthControllerTest.java` kiểm tra luồng login thành công, sai mật khẩu (401), đăng nhập Zalo OA.

- [ ] **Step 6: Kiểm tra toàn bộ test suite**

Run: `./backend/mvnw -f backend/pom.xml test -Dtest="*Test"`  
Expected: BUILD SUCCESS (tất cả unit tests đều PASS).

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/ backend/src/test/
git commit -m "feat(auth): implement login, Zalo OA OAuth flow, and me endpoints with JWT"
```

---

### Task 3: Frontend Project Structure, Tailwind Theme, i18n & Core Libs

**Files:**
- Modify: `frontend/tailwind.config.mjs`
- Create: `frontend/src/lib/utils.ts`
- Create: `frontend/src/lib/api.client.ts`
- Create: `frontend/src/i18n/config.ts`
- Create: `frontend/src/messages/vi.json`
- Create: `frontend/src/messages/en.json`
- Create: `frontend/src/contexts/I18nContext.tsx`
- Create: `frontend/src/contexts/AuthContext.tsx`
- Create: `frontend/src/components/ui/Button.tsx`
- Create: `frontend/src/components/ui/Input.tsx`
- Create: `frontend/src/components/ui/PasswordInput.tsx`

- [ ] **Step 1: Cập nhật `tailwind.config.mjs`**

Khai báo toàn bộ bảng màu từ HTML template của người dùng:
`colors: { "primary": "#004ac6", "primary-container": "#2563eb", "inverse-surface": "#213145", ... }`

- [ ] **Step 2: Tạo utilities và API Client**

Tạo `frontend/src/lib/utils.ts` (`cn` helper).
Tạo `frontend/src/lib/api.client.ts` đóng gói fetch gọi `NEXT_PUBLIC_API_URL` (port 8080), tự động đính kèm `Authorization: Bearer <token>` nếu có trong localStorage.

- [ ] **Step 3: Thiết lập đa ngôn ngữ (i18n)**

Tạo `frontend/src/i18n/config.ts`.
Tạo `frontend/src/messages/vi.json` và `frontend/src/messages/en.json` chứa các nhãn:
- `auth.login`, `auth.register`, `auth.email`, `auth.password`, `auth.phone`
- `auth.loginWithPassword`, `auth.loginWithZalo`
- `sidebar.title`, `sidebar.subtitle`, `sidebar.description`, `sidebar.cert`
Tạo `frontend/src/contexts/I18nContext.tsx` với hook `useI18n()`.

- [ ] **Step 4: Thiết lập AuthContext**

Tạo `frontend/src/contexts/AuthContext.tsx` quản lý user state, token, hàm login, register, logout.

- [ ] **Step 5: Tạo UI Primitive Components**

Tạo `Button.tsx`, `Input.tsx`, `PasswordInput.tsx` (có tích hợp nút ẩn/hiện mật khẩu).

- [ ] **Step 6: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): setup Tailwind theme, core lib, i18n messages, contexts, and UI primitives"
```

---

### Task 4: Frontend Auth Feature Components & Pages

**Files:**
- Create: `frontend/src/features/auth/types/auth.types.ts`
- Create: `frontend/src/features/auth/services/auth.service.ts`
- Create: `frontend/src/features/auth/hooks/useAuth.ts`
- Create: `frontend/src/features/auth/components/AuthSidebar.tsx`
- Create: `frontend/src/features/auth/components/ZaloLoginButton.tsx`
- Create: `frontend/src/features/auth/components/LoginForm.tsx`
- Create: `frontend/src/features/auth/components/RegisterForm.tsx`
- Create: `frontend/src/app/layout.tsx`
- Create: `frontend/src/app/page.tsx`
- Create: `frontend/src/app/(auth)/login/page.tsx`
- Create: `frontend/src/app/(auth)/register/page.tsx`

- [ ] **Step 1: Tạo types, services và hooks cho Auth Feature**

Tạo `auth.types.ts`, `auth.service.ts`, `useAuth.ts`.

- [ ] **Step 2: Tạo AuthSidebar Component**

Tái cấu trúc sidebar thương hiệu UAV PAS từ HTML template thành React Component nhận props, hỗ trợ đa ngôn ngữ, animation SVG radar và grid.

- [ ] **Step 3: Tạo ZaloLoginButton & LoginForm Component**

Tạo `ZaloLoginButton.tsx` với logo Zalo và styling chuẩn.
Tạo `LoginForm.tsx` nhận các props:
- Hỗ trợ 2 nút/tab: "Đăng nhập bằng Mật khẩu" và "Đăng nhập Zalo OA".
- Xử lý submit form, hiển thị trạng thái loading "Đang xác thực...", báo lỗi đẹp mắt.

- [ ] **Step 4: Tạo RegisterForm Component**

Tạo `RegisterForm.tsx` nhận props, validation mật khẩu tối thiểu 8 ký tự, gọi `authService.register`, link chuyển về Đăng nhập.

- [ ] **Step 5: Tạo Layout và Pages**

Cập nhật `frontend/src/app/layout.tsx`: nạp font Google `Be Vietnam Pro`, `Material Symbols Outlined`, bọc `I18nProvider` và `AuthProvider`.
Tạo `frontend/src/app/(auth)/login/page.tsx` và `frontend/src/app/(auth)/register/page.tsx`.
Cập nhật `frontend/src/app/page.tsx` tự động chuyển hướng sang `/login` hoặc dashboard.

- [ ] **Step 6: Xác minh Build Frontend**

Chạy: `cd frontend && npm run build`  
Expected: Next.js build thành công không có lỗi TypeScript hay JSX.

- [ ] **Step 7: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): implement Auth feature components, pages, and integrate Zalo OA and password login"
```
