package com.uav.platform.modules.user.config.request;

import com.uav.platform.modules.user.common.*;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("DTO Bean Validation Tests")
class ValidationDtoTest {

    private static Validator validator;

    @BeforeAll
    static void setUp() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @Test
    @DisplayName("Valid RegisterRequest should have no violations")
    void registerRequest_Valid_NoViolations() {
        RegisterRequest request = new RegisterRequest("pilot_01", "pilot@uav.vn", "P@ssword123", "0912345678");
        Set<ConstraintViolation<RegisterRequest>> violations = validator.validate(request);
        assertTrue(violations.isEmpty());
    }

    @Test
    @DisplayName("RegisterRequest with invalid email and short password should have violations")
    void registerRequest_Invalid_HasViolations() {
        RegisterRequest request = new RegisterRequest("", "invalid-email", "short", "");
        Set<ConstraintViolation<RegisterRequest>> violations = validator.validate(request);
        assertFalse(violations.isEmpty());
        assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("email")));
        assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("username")));
        assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("password")));
    }

    @Test
    @DisplayName("Valid LoginRequest should have no violations")
    void loginRequest_Valid_NoViolations() {
        LoginRequest request = new LoginRequest("pilot_01", "P@ssword123");
        Set<ConstraintViolation<LoginRequest>> violations = validator.validate(request);
        assertTrue(violations.isEmpty());
    }

    @Test
    @DisplayName("LoginRequest with blank fields should have violations")
    void loginRequest_Blank_HasViolations() {
        LoginRequest request = new LoginRequest("", "  ");
        Set<ConstraintViolation<LoginRequest>> violations = validator.validate(request);
        assertEquals(2, violations.size());
    }

    @Test
    @DisplayName("Valid ZaloLoginRequest should pass validation")
    void zaloLoginRequest_Valid() {
        ZaloLoginRequest request = new ZaloLoginRequest("zalo_oauth_code_12345", "http://localhost:3000/callback");
        Set<ConstraintViolation<ZaloLoginRequest>> violations = validator.validate(request);
        assertTrue(violations.isEmpty());
    }

    @Test
    @DisplayName("Blank ZaloLoginRequest code should fail validation")
    void zaloLoginRequest_BlankCode() {
        ZaloLoginRequest request = new ZaloLoginRequest("", null);
        Set<ConstraintViolation<ZaloLoginRequest>> violations = validator.validate(request);
        assertFalse(violations.isEmpty());
        assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("code")));
    }

    @Test
    @DisplayName("Valid RefreshTokenRequest should pass validation")
    void refreshTokenRequest_Valid() {
        RefreshTokenRequest request = new RefreshTokenRequest("d9b23e80-7601-44bb-8b77-3e11762ffb76");
        Set<ConstraintViolation<RefreshTokenRequest>> violations = validator.validate(request);
        assertTrue(violations.isEmpty());
    }

    @Test
    @DisplayName("Blank RefreshTokenRequest should fail validation")
    void refreshTokenRequest_Blank() {
        RefreshTokenRequest request = new RefreshTokenRequest("   ");
        Set<ConstraintViolation<RefreshTokenRequest>> violations = validator.validate(request);
        assertFalse(violations.isEmpty());
        assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("refreshToken")));
    }
}
