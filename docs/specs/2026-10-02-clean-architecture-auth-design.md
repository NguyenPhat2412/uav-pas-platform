# Thiết Kế Kiến Trúc Backend Clean Architecture & Module Auth cho UAV PAS Platform

**Ngày:** 02/10/2026  
**Dự án:** UAV PAS Platform (`backend`)  
**Tác giả:** Antigravity & User  
**Trạng thái:** Approved  

---

## 1. Mục tiêu và Phạm vi

Áp dụng bộ khung kiến trúc Clean Layered Architecture kế thừa từ dự án mẫu `java-study` vào hệ thống `uav-pas-platform/backend`:
- Tinh gọn hóa kiến trúc mã nguồn với Spring Data JPA.
- Thiết lập hạ tầng chung (xử lý lỗi toàn cục, định dạng phản hồi chuẩn, quản lý endpoint tập trung, bảo mật và CORS).
- Chuẩn hóa thực thể `AppUser`, giải quyết bất đồng bộ trường `username` giữa Entity, DTO và Repository.
- Hoàn thiện luồng xác thực (Authentication) với đăng ký người dùng mới, mã hóa mật khẩu bằng BCrypt, và trả về dữ liệu an toàn.

---

## 2. Kiến trúc Tổng thể & Phân tầng Package

Package gốc: `com.uav_pass.local`

```text
com.uav_pass.local/
├── common/                               # Hạ tầng dùng chung
│   ├── constant/
│   │   ├── CoreConstants.java            # Hằng số thông điệp lỗi, message hệ thống
│   │   └── RestEndpoint.java             # Quản lý URL API tập trung (/api/v1/...)
│   ├── exception/
│   │   ├── SystemException.java          # Runtime exception với HttpStatus
│   │   └── GlobalExceptionHandler.java   # @RestControllerAdvice xử lý lỗi tập trung
│   └── dto/
│       └── ErrorResponse.java            # Format JSON phản hồi lỗi thống nhất
│
├── config/                               # Cấu hình Spring Boot
│   ├── CorsConfig.java                   # Cấu hình CORS cho Next.js Frontend
│   ├── OpenApiConfig.java                # Cấu hình Swagger UI (SpringDoc OpenAPI 3)
│   └── SecurityConfig.java               # Cấu hình SecurityFilterChain & PasswordEncoder
│
└── auth/                                 # Module Xác thực & Quản lý User
    ├── entity/
    │   ├── AppUser.java                  # Entity người dùng với JPA Lifecycle
    │   └── UserStatus.java               # Enum trạng thái tài khoản
    ├── repository/
    │   └── UserRepository.java           # Spring Data JPA Repository
    ├── dto/
    │   ├── RegisterRequest.java          # Request body đăng ký (Jakarta Validation)
    │   ├── LoginRequest.java             # Request body đăng nhập
    │   └── UserResponse.java             # Response DTO an toàn (không lộ hash mật khẩu)
    ├── service/
    │   ├── AuthService.java              # Interface nghiệp vụ xác thực
    │   └── impl/AuthServiceImpl.java     # Triển khai nghiệp vụ đăng ký / xác thực
    └── controller/
        └── AuthController.java           # REST Controller tiếp nhận request
```

---

## 3. Chi tiết Thiết kế Kỹ thuật

### 3.1. Tầng Common (Hạ tầng dùng chung)
- **`RestEndpoint`**:
  - `API_PREFIX = "/api/v1"`
  - `AUTH = API_PREFIX + "/auth"`
  - `REGISTER = "/register"`
  - `LOGIN = "/login"`
  - `USERS = API_PREFIX + "/users"`
- **`SystemException`**: Kế thừa `RuntimeException`, lưu trữ `HttpStatus status` và `String message`. Cung cấp static factory methods:
  - `badRequest(String message)` $\rightarrow$ HTTP 400
  - `unauthorized(String message)` $\rightarrow$ HTTP 401
  - `forbidden(String message)` $\rightarrow$ HTTP 403
  - `notFound(String message)` $\rightarrow$ HTTP 404
  - `conflict(String message)` $\rightarrow$ HTTP 409
  - `internalError(String message)` $\rightarrow$ HTTP 500
- **`ErrorResponse`**: Record chứa `timestamp`, `status`, `error`, `message`, `path`.
- **`GlobalExceptionHandler`**:
  - Bắt `SystemException`: Trả về `ResponseEntity<ErrorResponse>` với mã trạng thái tương ứng.
  - Bắt `MethodArgumentNotValidException`: Trích xuất các lỗi validation của Bean Validation (`@Valid`) thành chuỗi thông báo rõ ràng.
  - Bắt `Exception`: Xử lý lỗi không mong muốn, log lỗi và trả về HTTP 500 kèm thông báo an toàn.

### 3.2. Cấu hình Hệ thống (`config`)
- **`SecurityConfig`**:
  - Khai báo Bean `PasswordEncoder` trả về `new BCryptPasswordEncoder()`.
  - Cấu hình `SecurityFilterChain`:
    - Tắt CSRF (phù hợp REST API stateless).
    - Cấu hình `cors()` sử dụng cấu hình từ `CorsConfig`.
    - `authorizeHttpRequests`: Cho phép truy cập không cần xác thực (`permitAll`) đối với:
      - `/api/v1/auth/**`
      - `/swagger-ui/**`, `/swagger-ui.html`, `/v3/api-docs/**`
      - Các endpoint tĩnh / health check.
    - Yêu cầu xác thực (`authenticated`) với các request còn lại.
- **`CorsConfig`**:
  - Cấu hình `WebMvcConfigurer` cho phép origin `http://localhost:3000` (Frontend Next.js) và các domain cấu hình trong môi trường.
  - Hỗ trợ các methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`.
- **`OpenApiConfig`**:
  - Cung cấp Bean `OpenAPI` với Title: "UAV PAS Platform API", Version: "1.0", Description chi tiết.
- **Thư viện Maven**: Bổ sung `springdoc-openapi-starter-webmvc-ui` phiên bản tương thích vào `pom.xml`.

### 3.3. Module Auth & User
- **`AppUser`**:
  - Thuộc tính: `id` (Long, PK), `username` (String, unique, nullable = false), `email` (String, unique, nullable = false), `passwordHash` (String, nullable = false), `phoneNumber` (String, nullable = false), `status` (UserStatus, EnumType.STRING), `createdAt` (LocalDateTime), `updatedAt` (LocalDateTime).
  - Tích hợp `@PrePersist` và `@PreUpdate` để tự cập nhật `createdAt` và `updatedAt`.
- **`UserRepository`**:
  - Kế thừa `JpaRepository<AppUser, Long>`.
  - Các method truy vấn:
    - `boolean existsByEmail(String email)`
    - `boolean existsByUsername(String username)`
    - `boolean existsByPhoneNumber(String phoneNumber)`
    - `Optional<AppUser> findByEmail(String email)`
    - `Optional<AppUser> findByUsername(String username)`
- **`RegisterRequest`**:
  - Validation:
    - `username`: `@NotBlank`, `@Size(min = 3, max = 50)`
    - `email`: `@NotBlank`, `@Email`
    - `password`: `@NotBlank`, `@Size(min = 8)`
    - `phoneNumber`: `@NotBlank`
- **`UserResponse`**:
  - Record chứa `id`, `username`, `email`, `phoneNumber`, `status`, `createdAt`.
  - Static method `fromEntity(AppUser user)` để map an toàn từ Entity sang Response DTO.
- **`AuthService` & `AuthServiceImpl`**:
  - `UserResponse register(RegisterRequest request)`:
    - Kiểm tra nếu `existsByEmail` $\rightarrow$ ném `SystemException.conflict(CoreConstants.EMAIL_ALREADY_EXISTS)`.
    - Kiểm tra nếu `existsByUsername` $\rightarrow$ ném `SystemException.conflict(CoreConstants.USERNAME_ALREADY_EXISTS)`.
    - Kiểm tra nếu `existsByPhoneNumber` $\rightarrow$ ném `SystemException.conflict(CoreConstants.PHONE_ALREADY_EXISTS)`.
    - Băm mật khẩu bằng `passwordEncoder.encode(request.password())`.
    - Tạo `AppUser` mới với `status = UserStatus.ACTIVE`.
    - Lưu vào DB qua `userRepository.save(user)`.
    - Trả về `UserResponse.fromEntity(savedUser)`.
- **`AuthController`**:
  - `@RestController`, `@RequestMapping(RestEndpoint.AUTH)`.
  - `@PostMapping(RestEndpoint.REGISTER)`: Gọi `authService.register(request)` với `@Valid`, trả về `HttpStatus.CREATED`.

---

## 4. Kế hoạch Kiểm thử & Xác minh
1. **Biên dịch & Build**: Chạy `./mvnw clean compile` để đảm bảo không còn lỗi thiếu trường `username` hay xung đột phụ thuộc.
2. **Unit Test Service**: Viết unit test cho `AuthServiceImpl` kiểm tra các trường hợp: đăng ký thành công, trùng lặp email/username/phone.
3. **Integration / Controller Test**: Kiểm tra `AuthController` với MockMvc và xác nhận phản hồi lỗi đúng format `ErrorResponse`.
