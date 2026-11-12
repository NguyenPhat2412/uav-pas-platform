# Clean Architecture & Auth Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Triển khai bộ khung Clean Architecture (Exception handling toàn cục, Endpoint tập trung, CORS, OpenAPI Swagger, Security) và hoàn thiện module Authentication (đăng ký người dùng) cho backend `uav-pas-platform`.

**Architecture:** Áp dụng Clean Layered Architecture chuẩn Spring Boot với Spring Data JPA làm tầng truy cập dữ liệu chính. Tầng `common` đảm nhiệm chuẩn hóa ngoại lệ và định dạng response, tầng `config` quản lý bảo mật và tích hợp bên thứ ba, tầng `auth` độc lập quản lý toàn bộ luồng người dùng và xác thực.

**Tech Stack:** Java 21, Spring Boot 4.1.1, Spring Data JPA, Spring Security, BCrypt, SpringDoc OpenAPI 3, JUnit 5, Mockito, MockMvc.

## Global Constraints

- Package cơ sở: `com.uav_pass.local`
- Thư mục làm việc: `/Users/macbook/HK7/uav-pas-platform/backend`
- Tất cả các endpoint API đều bắt đầu bằng tiền tố `/api/v1`
- Không trả về trường `passwordHash` trong bất kỳ response nào gửi về client
- Kiểm tra trùng lặp email, username, phoneNumber trước khi lưu user mới và ném lỗi 409 Conflict

---

### Task 1: Add Springdoc OpenAPI Dependency & Infrastructure Config

**Files:**
- Modify: `backend/pom.xml`
- Create: `backend/src/main/java/com/uav_pass/local/config/OpenApiConfig.java`
- Create: `backend/src/main/java/com/uav_pass/local/config/CorsConfig.java`

**Interfaces:**
- Produces: 
  - `CorsConfig` (`WebMvcConfigurer` bean mở CORS cho `http://localhost:3000`)
  - `OpenApiConfig` (`OpenAPI` bean với metadata title & version)

- [ ] **Step 1: Cập nhật dependency trong `pom.xml`**

Thêm dependency `springdoc-openapi-starter-webmvc-ui` vào `backend/pom.xml`:

```xml
		<dependency>
			<groupId>org.springdoc</groupId>
			<artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
			<version>2.8.5</version>
		</dependency>
```

- [ ] **Step 2: Tạo cấu hình OpenApiConfig**

Tạo file `backend/src/main/java/com/uav_pass/local/config/OpenApiConfig.java`:

```java
package com.uav_pass.local.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("UAV PAS Platform API")
                        .version("1.0.0")
                        .description("Tài liệu API hệ thống UAV PAS Platform"));
    }
}
```

- [ ] **Step 3: Tạo cấu hình CorsConfig**

Tạo file `backend/src/main/java/com/uav_pass/local/config/CorsConfig.java`:

```java
package com.uav_pass.local.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins("http://localhost:3000")
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }
}
```

- [ ] **Step 4: Kiểm tra biên dịch**

Run: `./mvnw -f /Users/macbook/HK7/uav-pas-platform/backend/pom.xml compile -DskipTests`  
Expected: `BUILD SUCCESS` (Lưu ý: nếu `UserRepository` báo lỗi `existsByUsername` thì sửa ở Task 4 hoặc bỏ tạm thời).

- [ ] **Step 5: Commit**

```bash
git add backend/pom.xml backend/src/main/java/com/uav_pass/local/config/
git commit -m "feat(config): add OpenAPI swagger and CORS configuration"
```

---

### Task 2: Common Infrastructure (Constants, Exceptions, ErrorResponse, GlobalExceptionHandler)

**Files:**
- Create: `backend/src/main/java/com/uav_pass/local/common/constant/CoreConstants.java`
- Create: `backend/src/main/java/com/uav_pass/local/common/constant/RestEndpoint.java`
- Create: `backend/src/main/java/com/uav_pass/local/common/exception/SystemException.java`
- Create: `backend/src/main/java/com/uav_pass/local/common/dto/ErrorResponse.java`
- Create: `backend/src/main/java/com/uav_pass/local/common/exception/GlobalExceptionHandler.java`
- Test: `backend/src/test/java/com/uav_pass/local/common/exception/GlobalExceptionHandlerTest.java`

**Interfaces:**
- Produces:
  - `RestEndpoint.AUTH = "/api/v1/auth"`, `RestEndpoint.REGISTER = "/register"`
  - `SystemException.badRequest(msg)`, `SystemException.conflict(msg)`, `SystemException.notFound(msg)`
  - `GlobalExceptionHandler` bắt lỗi và trả `ResponseEntity<ErrorResponse>`

- [ ] **Step 1: Viết test cho GlobalExceptionHandler**

Tạo file `backend/src/test/java/com/uav_pass/local/common/exception/GlobalExceptionHandlerTest.java`:

```java
package com.uav_pass.local.common.exception;

import com.uav_pass.local.common.dto.ErrorResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.junit.jupiter.api.Assertions.*;

class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler exceptionHandler;
    private MockHttpServletRequest request;

    @BeforeEach
    void setUp() {
        exceptionHandler = new GlobalExceptionHandler();
        request = new MockHttpServletRequest();
        request.setRequestURI("/api/v1/test");
    }

    @Test
    void handleSystemException_ReturnsCorrectStatusAndBody() {
        SystemException ex = SystemException.conflict("Dữ liệu đã tồn tại");
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleSystemException(ex, request);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("Dữ liệu đã tồn tại", response.getBody().message());
        assertEquals(409, response.getBody().status());
        assertEquals("/api/v1/test", response.getBody().path());
    }

    @Test
    void handleGenericException_ReturnsInternalServerError() {
        Exception ex = new RuntimeException("Unexpected error");
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleGenericException(ex, request);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(500, response.getBody().status());
    }
}
```

- [ ] **Step 2: Chạy test để xác nhận test thất bại (chưa có class)**

Run: `./mvnw -f /Users/macbook/HK7/uav-pas-platform/backend/pom.xml test -Dtest=GlobalExceptionHandlerTest`  
Expected: Biên dịch thất bại do thiếu `GlobalExceptionHandler`, `SystemException`, `ErrorResponse`.

- [ ] **Step 3: Tạo CoreConstants & RestEndpoint**

Tạo `backend/src/main/java/com/uav_pass/local/common/constant/CoreConstants.java`:

```java
package com.uav_pass.local.common.constant;

public final class CoreConstants {
    private CoreConstants() {}

    public static final String EMAIL_ALREADY_EXISTS = "Email đã tồn tại trong hệ thống";
    public static final String USERNAME_ALREADY_EXISTS = "Tên đăng nhập đã tồn tại trong hệ thống";
    public static final String PHONE_ALREADY_EXISTS = "Số điện thoại đã tồn tại trong hệ thống";
    public static final String USER_NOT_FOUND = "Không tìm thấy người dùng";
    public static final String INTERNAL_SERVER_ERROR = "Đã xảy ra lỗi máy chủ nội bộ. Vui lòng thử lại sau";
}
```

Tạo `backend/src/main/java/com/uav_pass/local/common/constant/RestEndpoint.java`:

```java
package com.uav_pass.local.common.constant;

public final class RestEndpoint {
    private RestEndpoint() {}

    public static final String API_PREFIX = "/api/v1";

    public static final String AUTH = API_PREFIX + "/auth";
    public static final String REGISTER = "/register";
    public static final String LOGIN = "/login";

    public static final String USERS = API_PREFIX + "/users";
    public static final String USER_ID = "/{id}";
}
```

- [ ] **Step 4: Tạo SystemException & ErrorResponse**

Tạo `backend/src/main/java/com/uav_pass/local/common/exception/SystemException.java`:

```java
package com.uav_pass.local.common.exception;

import org.springframework.http.HttpStatus;

public class SystemException extends RuntimeException {
    private final HttpStatus status;

    public SystemException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public static SystemException badRequest(String message) {
        return new SystemException(message, HttpStatus.BAD_REQUEST);
    }

    public static SystemException notFound(String message) {
        return new SystemException(message, HttpStatus.NOT_FOUND);
    }

    public static SystemException conflict(String message) {
        return new SystemException(message, HttpStatus.CONFLICT);
    }

    public static SystemException unauthorized(String message) {
        return new SystemException(message, HttpStatus.UNAUTHORIZED);
    }

    public static SystemException internalError(String message) {
        return new SystemException(message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
```

Tạo `backend/src/main/java/com/uav_pass/local/common/dto/ErrorResponse.java`:

```java
package com.uav_pass.local.common.dto;

import java.time.LocalDateTime;

public record ErrorResponse(
        LocalDateTime timestamp,
        int status,
        String error,
        String message,
        String path
) {
    public static ErrorResponse of(int status, String error, String message, String path) {
        return new ErrorResponse(LocalDateTime.now(), status, error, message, path);
    }
}
```

- [ ] **Step 5: Tạo GlobalExceptionHandler**

Tạo `backend/src/main/java/com/uav_pass/local/common/exception/GlobalExceptionHandler.java`:

```java
package com.uav_pass.local.common.exception;

import com.uav_pass.local.common.constant.CoreConstants;
import com.uav_pass.local.common.dto.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(SystemException.class)
    public ResponseEntity<ErrorResponse> handleSystemException(SystemException ex, HttpServletRequest request) {
        log.warn("System exception occurred [{}]: {}", ex.getStatus(), ex.getMessage());
        ErrorResponse body = ErrorResponse.of(
                ex.getStatus().value(),
                ex.getStatus().getReasonPhrase(),
                ex.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(ex.getStatus()).body(body);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(MethodArgumentNotValidException ex, HttpServletRequest request) {
        String details = ex.getBindingResult().getFieldErrors().stream()
                .map(err -> err.getField() + ": " + err.getDefaultMessage())
                .collect(Collectors.joining("; "));
        log.warn("Validation failed: {}", details);

        ErrorResponse body = ErrorResponse.of(
                HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.getReasonPhrase(),
                details,
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex, HttpServletRequest request) {
        log.error("Unhandled exception: ", ex);
        ErrorResponse body = ErrorResponse.of(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                HttpStatus.INTERNAL_SERVER_ERROR.getReasonPhrase(),
                CoreConstants.INTERNAL_SERVER_ERROR,
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }
}
```

- [ ] **Step 6: Chạy test để xác nhận test vượt qua**

Run: `./mvnw -f /Users/macbook/HK7/uav-pas-platform/backend/pom.xml test -Dtest=GlobalExceptionHandlerTest`  
Expected: `BUILD SUCCESS` (2 tests passed)

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/uav_pass/local/common/ backend/src/test/java/com/uav_pass/local/common/
git commit -m "feat(common): add CoreConstants, RestEndpoint, SystemException, and GlobalExceptionHandler"
```

---

### Task 3: Spring Security Configuration

**Files:**
- Create: `backend/src/main/java/com/uav_pass/local/config/SecurityConfig.java`

**Interfaces:**
- Produces:
  - `PasswordEncoder` bean (`BCryptPasswordEncoder`)
  - `SecurityFilterChain` cho phép truy cập public endpoint auth và swagger, tắt CSRF.

- [ ] **Step 1: Viết mã cấu hình SecurityConfig**

Tạo file `backend/src/main/java/com/uav_pass/local/config/SecurityConfig.java`:

```java
package com.uav_pass.local.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/api/v1/auth/**",
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html"
                        ).permitAll()
                        .anyRequest().authenticated()
                );

        return http.build();
    }
}
```

- [ ] **Step 2: Kiểm tra biên dịch**

Run: `./mvnw -f /Users/macbook/HK7/uav-pas-platform/backend/pom.xml compile -DskipTests`  
Expected: `BUILD SUCCESS`

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/uav_pass/local/config/SecurityConfig.java
git commit -m "feat(security): configure SecurityFilterChain and BCrypt password encoder"
```

---

### Task 4: Align Domain Entity & Repository (AppUser, UserRepository, RegisterRequest, UserResponse)

**Files:**
- Modify: `backend/src/main/java/com/uav_pass/local/auth/entity/AppUser.java`
- Modify: `backend/src/main/java/com/uav_pass/local/auth/repository/UserRepository.java`
- Modify: `backend/src/main/java/com/uav_pass/local/auth/dto/RegisterRequest.java`
- Create: `backend/src/main/java/com/uav_pass/local/auth/dto/UserResponse.java`

**Interfaces:**
- Consumes: `UserStatus`
- Produces:
  - `AppUser` với trường `username`, `createdAt`, `updatedAt`
  - `UserRepository` với `existsByEmail`, `existsByUsername`, `existsByPhoneNumber`, `findByEmail`, `findByUsername`
  - `UserResponse.fromEntity(AppUser user)`

- [ ] **Step 1: Cập nhật AppUser Entity**

Sửa `backend/src/main/java/com/uav_pass/local/auth/entity/AppUser.java`:

```java
package com.uav_pass.local.auth.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "phone_number", nullable = false, length = 20)
    private String phoneNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private UserStatus status;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    protected AppUser() {}

    public AppUser(String username, String email, String passwordHash, String phoneNumber, UserStatus status) {
        this.username = username;
        this.email = email;
        this.passwordHash = passwordHash;
        this.phoneNumber = phoneNumber;
        this.status = status != null ? status : UserStatus.ACTIVE;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = UserStatus.ACTIVE;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public UserStatus getStatus() {
        return status;
    }

    public void setStatus(UserStatus status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
```

- [ ] **Step 2: Cập nhật UserRepository**

Sửa `backend/src/main/java/com/uav_pass/local/auth/repository/UserRepository.java`:

```java
package com.uav_pass.local.auth.repository;

import com.uav_pass.local.auth.entity.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<AppUser, Long> {
    boolean existsByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByPhoneNumber(String phoneNumber);

    Optional<AppUser> findByEmail(String email);
    Optional<AppUser> findByUsername(String username);
}
```

- [ ] **Step 3: Cập nhật RegisterRequest DTO**

Sửa `backend/src/main/java/com/uav_pass/local/auth/dto/RegisterRequest.java`:

```java
package com.uav_pass.local.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Username is required")
        @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
        String username,

        @NotBlank(message = "Email is required")
        @Email(message = "Email should be valid")
        String email,

        @NotBlank(message = "Password is required")
        @Size(min = 8, message = "Password must be at least 8 characters long")
        String password,

        @NotBlank(message = "Phone number is required")
        String phoneNumber
) {}
```

- [ ] **Step 4: Tạo UserResponse DTO**

Tạo `backend/src/main/java/com/uav_pass/local/auth/dto/UserResponse.java`:

```java
package com.uav_pass.local.auth.dto;

import com.uav_pass.local.auth.entity.AppUser;
import com.uav_pass.local.auth.entity.UserStatus;

import java.time.LocalDateTime;

public record UserResponse(
        Long id,
        String username,
        String email,
        String phoneNumber,
        UserStatus status,
        LocalDateTime createdAt
) {
    public static UserResponse fromEntity(AppUser user) {
        if (user == null) return null;
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getPhoneNumber(),
                user.getStatus(),
                user.getCreatedAt()
        );
    }
}
```

- [ ] **Step 5: Kiểm tra biên dịch**

Run: `./mvnw -f /Users/macbook/HK7/uav-pas-platform/backend/pom.xml compile -DskipTests`  
Expected: `BUILD SUCCESS`

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/uav_pass/local/auth/
git commit -m "feat(auth): align AppUser with username, add UserResponse DTO and update UserRepository"
```

---

### Task 5: Auth Service & Implementation

**Files:**
- Create: `backend/src/main/java/com/uav_pass/local/auth/service/AuthService.java`
- Create: `backend/src/main/java/com/uav_pass/local/auth/service/impl/AuthServiceImpl.java`
- Test: `backend/src/test/java/com/uav_pass/local/auth/service/AuthServiceTest.java`

**Interfaces:**
- Consumes: `UserRepository`, `PasswordEncoder`, `RegisterRequest`, `UserResponse`, `SystemException`
- Produces: `UserResponse register(RegisterRequest request)`

- [ ] **Step 1: Viết test cho AuthService**

Tạo `backend/src/test/java/com/uav_pass/local/auth/service/AuthServiceTest.java`:

```java
package com.uav_pass.local.auth.service;

import com.uav_pass.local.auth.dto.RegisterRequest;
import com.uav_pass.local.auth.dto.UserResponse;
import com.uav_pass.local.auth.entity.AppUser;
import com.uav_pass.local.auth.entity.UserStatus;
import com.uav_pass.local.auth.repository.UserRepository;
import com.uav_pass.local.auth.service.impl.AuthServiceImpl;
import com.uav_pass.local.common.exception.SystemException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthServiceImpl(userRepository, passwordEncoder);
    }

    @Test
    void register_Success() {
        RegisterRequest request = new RegisterRequest("johndoe", "john@example.com", "P@ssword123", "0987654321");

        when(userRepository.existsByEmail("john@example.com")).thenReturn(false);
        when(userRepository.existsByUsername("johndoe")).thenReturn(false);
        when(userRepository.existsByPhoneNumber("0987654321")).thenReturn(false);
        when(passwordEncoder.encode("P@ssword123")).thenReturn("hashedPassword");

        AppUser savedUser = new AppUser("johndoe", "john@example.com", "hashedPassword", "0987654321", UserStatus.ACTIVE);
        when(userRepository.save(any(AppUser.class))).thenReturn(savedUser);

        UserResponse response = authService.register(request);

        assertNotNull(response);
        assertEquals("johndoe", response.username());
        assertEquals("john@example.com", response.email());
        assertEquals("0987654321", response.phoneNumber());
        assertEquals(UserStatus.ACTIVE, response.status());

        verify(userRepository, times(1)).save(any(AppUser.class));
    }

    @Test
    void register_DuplicateEmail_ThrowsConflict() {
        RegisterRequest request = new RegisterRequest("johndoe", "john@example.com", "P@ssword123", "0987654321");
        when(userRepository.existsByEmail("john@example.com")).thenReturn(true);

        SystemException ex = assertThrows(SystemException.class, () -> authService.register(request));
        assertEquals(409, ex.getStatus().value());
        verify(userRepository, never()).save(any(AppUser.class));
    }

    @Test
    void register_DuplicateUsername_ThrowsConflict() {
        RegisterRequest request = new RegisterRequest("johndoe", "john@example.com", "P@ssword123", "0987654321");
        when(userRepository.existsByEmail("john@example.com")).thenReturn(false);
        when(userRepository.existsByUsername("johndoe")).thenReturn(true);

        SystemException ex = assertThrows(SystemException.class, () -> authService.register(request));
        assertEquals(409, ex.getStatus().value());
        verify(userRepository, never()).save(any(AppUser.class));
    }
}
```

- [ ] **Step 2: Chạy test để xác nhận test thất bại (chưa có code)**

Run: `./mvnw -f /Users/macbook/HK7/uav-pas-platform/backend/pom.xml test -Dtest=AuthServiceTest`  
Expected: Thất bại do chưa có `AuthService`, `AuthServiceImpl`.

- [ ] **Step 3: Tạo AuthService interface & AuthServiceImpl**

Tạo `backend/src/main/java/com/uav_pass/local/auth/service/AuthService.java`:

```java
package com.uav_pass.local.auth.service;

import com.uav_pass.local.auth.dto.RegisterRequest;
import com.uav_pass.local.auth.dto.UserResponse;

public interface AuthService {
    UserResponse register(RegisterRequest request);
}
```

Tạo `backend/src/main/java/com/uav_pass/local/auth/service/impl/AuthServiceImpl.java`:

```java
package com.uav_pass.local.auth.service.impl;

import com.uav_pass.local.auth.dto.RegisterRequest;
import com.uav_pass.local.auth.dto.UserResponse;
import com.uav_pass.local.auth.entity.AppUser;
import com.uav_pass.local.auth.entity.UserStatus;
import com.uav_pass.local.auth.repository.UserRepository;
import com.uav_pass.local.auth.service.AuthService;
import com.uav_pass.local.common.constant.CoreConstants;
import com.uav_pass.local.common.exception.SystemException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthServiceImpl(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public UserResponse register(RegisterRequest request) {
        if (request == null) {
            throw SystemException.badRequest("Dữ liệu đăng ký không được để trống");
        }

        if (userRepository.existsByEmail(request.email().trim())) {
            throw SystemException.conflict(CoreConstants.EMAIL_ALREADY_EXISTS);
        }

        if (userRepository.existsByUsername(request.username().trim())) {
            throw SystemException.conflict(CoreConstants.USERNAME_ALREADY_EXISTS);
        }

        if (userRepository.existsByPhoneNumber(request.phoneNumber().trim())) {
            throw SystemException.conflict(CoreConstants.PHONE_ALREADY_EXISTS);
        }

        String hashedPassword = passwordEncoder.encode(request.password());

        AppUser newUser = new AppUser(
                request.username().trim(),
                request.email().trim(),
                hashedPassword,
                request.phoneNumber().trim(),
                UserStatus.ACTIVE
        );

        AppUser savedUser = userRepository.save(newUser);
        return UserResponse.fromEntity(savedUser);
    }
}
```

- [ ] **Step 4: Chạy test để xác nhận test vượt qua**

Run: `./mvnw -f /Users/macbook/HK7/uav-pas-platform/backend/pom.xml test -Dtest=AuthServiceTest`  
Expected: `BUILD SUCCESS` (3 tests passed)

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/uav_pass/local/auth/service/ backend/src/test/java/com/uav_pass/local/auth/service/
git commit -m "feat(auth): implement AuthService and add unit test"
```

---

### Task 6: Auth REST Controller & Integration Verification

**Files:**
- Create: `backend/src/main/java/com/uav_pass/local/auth/controller/AuthController.java`
- Test: `backend/src/test/java/com/uav_pass/local/auth/controller/AuthControllerTest.java`

**Interfaces:**
- Consumes: `AuthService`, `RestEndpoint.AUTH`, `RestEndpoint.REGISTER`
- Produces: POST `/api/v1/auth/register` $\rightarrow$ returns HTTP 201 Created and `UserResponse`

- [ ] **Step 1: Viết test cho AuthController**

Tạo `backend/src/test/java/com/uav_pass/local/auth/controller/AuthControllerTest.java`:

```java
package com.uav_pass.local.auth.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.uav_pass.local.auth.dto.RegisterRequest;
import com.uav_pass.local.auth.dto.UserResponse;
import com.uav_pass.local.auth.entity.UserStatus;
import com.uav_pass.local.auth.service.AuthService;
import com.uav_pass.local.common.constant.RestEndpoint;
import com.uav_pass.local.common.exception.GlobalExceptionHandler;
import com.uav_pass.local.common.exception.SystemException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    private MockMvc mockMvc;

    @Mock
    private AuthService authService;

    @InjectMocks
    private AuthController authController;

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(authController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
        objectMapper = new ObjectMapper();
    }

    @Test
    void register_ValidRequest_ReturnsCreated() throws Exception {
        RegisterRequest request = new RegisterRequest("johndoe", "john@example.com", "P@ssword123", "0987654321");
        UserResponse response = new UserResponse(1L, "johndoe", "john@example.com", "0987654321", UserStatus.ACTIVE, LocalDateTime.now());

        when(authService.register(any(RegisterRequest.class))).thenReturn(response);

        mockMvc.perform(post(RestEndpoint.AUTH + RestEndpoint.REGISTER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.username").value("johndoe"))
                .andExpect(jsonPath("$.email").value("john@example.com"))
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    @Test
    void register_InvalidEmail_ReturnsBadRequest() throws Exception {
        RegisterRequest request = new RegisterRequest("johndoe", "invalid-email", "P@ssword123", "0987654321");

        mockMvc.perform(post(RestEndpoint.AUTH + RestEndpoint.REGISTER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void register_DuplicateEmail_ReturnsConflict() throws Exception {
        RegisterRequest request = new RegisterRequest("johndoe", "john@example.com", "P@ssword123", "0987654321");

        when(authService.register(any(RegisterRequest.class)))
                .thenThrow(SystemException.conflict("Email đã tồn tại trong hệ thống"));

        mockMvc.perform(post(RestEndpoint.AUTH + RestEndpoint.REGISTER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message").value("Email đã tồn tại trong hệ thống"));
    }
}
```

- [ ] **Step 2: Chạy test để xác nhận test thất bại (chưa có AuthController)**

Run: `./mvnw -f /Users/macbook/HK7/uav-pas-platform/backend/pom.xml test -Dtest=AuthControllerTest`  
Expected: Biên dịch thất bại do thiếu `AuthController`.

- [ ] **Step 3: Tạo AuthController**

Tạo `backend/src/main/java/com/uav_pass/local/auth/controller/AuthController.java`:

```java
package com.uav_pass.local.auth.controller;

import com.uav_pass.local.auth.dto.RegisterRequest;
import com.uav_pass.local.auth.dto.UserResponse;
import com.uav_pass.local.auth.service.AuthService;
import com.uav_pass.local.common.constant.RestEndpoint;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(RestEndpoint.AUTH)
@Tag(name = "Authentication", description = "Các API đăng ký và xác thực người dùng")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @Operation(summary = "Đăng ký tài khoản người dùng mới")
    @PostMapping(RestEndpoint.REGISTER)
    public ResponseEntity<UserResponse> register(@Valid @RequestBody RegisterRequest request) {
        UserResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
```

- [ ] **Step 4: Chạy test để xác nhận tất cả test vượt qua**

Run: `./mvnw -f /Users/macbook/HK7/uav-pas-platform/backend/pom.xml test`  
Expected: `BUILD SUCCESS` (Tất cả test case trong dự án đều PASS)

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/uav_pass/local/auth/controller/ backend/src/test/java/com/uav_pass/local/auth/controller/
git commit -m "feat(auth): implement AuthController with OpenAPI annotations and MockMvc tests"
```
