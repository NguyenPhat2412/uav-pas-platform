package com.uav.platform.error;

import com.uav.platform.common.constant.CoreConstants;
import com.uav.platform.common.dto.response.ErrorResponse;
import com.uav.platform.config.routes.ApiRoutes;

import jakarta.servlet.http.HttpServletRequest;

import lombok.extern.slf4j.Slf4j;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(SystemException.class)
    public ResponseEntity<ErrorResponse> handleSystemException(
            SystemException ex, HttpServletRequest request) {
        log.warn("System exception occurred [{}]: {}", ex.getStatus(), ex.getMessage());
        return respond(
                ex.getStatus(),
                ex.getCode(),
                ex.getMessage(),
                request,
                ex.getField() == null ? null : Map.of(ex.getField(), ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(
            MethodArgumentNotValidException ex, HttpServletRequest request) {
        String details =
                ex.getBindingResult().getFieldErrors().stream()
                        .map(err -> err.getField() + ": " + err.getDefaultMessage())
                        .collect(Collectors.joining("; "));
        log.warn("Validation failed: {}", details);
        // One message per field so the client can mark each input; an empty field reports
        // "required" rather than a
        // size or format rule it also fails.
        Map<String, String> fields = new LinkedHashMap<>();
        ex.getBindingResult()
                .getFieldErrors()
                .forEach(
                        err -> {
                            String text = ValidationMessages.vietnamese(err);
                            if ("NotBlank".equals(err.getCode()) || "NotNull".equals(err.getCode()))
                                fields.put(err.getField(), text);
                            else fields.putIfAbsent(err.getField(), text);
                        });
        String message = fields.isEmpty() ? details : fields.values().iterator().next();
        return respond(
                HttpStatus.BAD_REQUEST,
                "VALIDATION_ERROR",
                message,
                request,
                fields.isEmpty() ? null : fields);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleMalformedJson(
            HttpMessageNotReadableException ex, HttpServletRequest request) {
        log.warn("Malformed JSON request on {}: {}", request.getRequestURI(), ex.getMessage());
        if (ApiRoutes.Users.FULL_PROFILE.equals(request.getRequestURI())) {
            return respond(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_PROFILE_REQUEST",
                    "Thông tin hồ sơ không đúng định dạng.",
                    request);
        }
        return respond(
                HttpStatus.BAD_REQUEST,
                "MALFORMED_JSON_REQUEST",
                "Malformed or unreadable request payload.",
                request);
    }

    @ExceptionHandler({
        MethodArgumentTypeMismatchException.class,
        MissingServletRequestParameterException.class
    })
    public ResponseEntity<ErrorResponse> handleParameterException(
            Exception ex, HttpServletRequest request) {
        log.warn("Invalid request parameter on {}: {}", request.getRequestURI(), ex.getMessage());
        return respond(
                HttpStatus.BAD_REQUEST, "INVALID_REQUEST_PARAMETER", ex.getMessage(), request);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(
            AccessDeniedException ex, HttpServletRequest request) {
        return respond(
                HttpStatus.FORBIDDEN,
                "ACCESS_DENIED",
                "You do not have permission to access this resource",
                request);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoResourceFound(
            NoResourceFoundException ex, HttpServletRequest request) {
        return respond(
                HttpStatus.NOT_FOUND,
                "RESOURCE_NOT_FOUND",
                "The requested endpoint or resource does not exist.",
                request);
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ResponseEntity<ErrorResponse> handleOptimisticLock(
            OptimisticLockingFailureException ex, HttpServletRequest request) {
        return respond(
                HttpStatus.CONFLICT,
                "OPTIMISTIC_LOCK_CONFLICT",
                "The resource changed while you were editing it. Reload and try again.",
                request);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrityViolation(
            DataIntegrityViolationException ex, HttpServletRequest request) {
        String detail = ex.getMostSpecificCause().getMessage();
        if (detail != null && detail.toLowerCase(Locale.ROOT).contains("uk_users_phone_number")) {
            return handleSystemException(
                    SystemException.conflict(CoreConstants.PHONE_ALREADY_EXISTS), request);
        }
        log.warn("Data integrity violation on {}", request.getRequestURI());
        return respond(
                HttpStatus.CONFLICT,
                "DATA_INTEGRITY_CONFLICT",
                "Data integrity constraint violated. Please check duplicate or referenced records.",
                request);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleBadArgument(
            IllegalArgumentException ex, HttpServletRequest request) {
        return respond(
                HttpStatus.BAD_REQUEST,
                resolveCode(ex.getMessage(), "INVALID_ARGUMENT"),
                ex.getMessage(),
                request);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ErrorResponse> handleConflictState(
            IllegalStateException ex, HttpServletRequest request) {
        return respond(
                HttpStatus.CONFLICT,
                resolveCode(ex.getMessage(), "INVALID_STATE"),
                ex.getMessage(),
                request);
    }

    @ExceptionHandler(NoHandlerFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(Exception ex, HttpServletRequest request) {
        return respond(
                HttpStatus.NOT_FOUND, "NOT_FOUND", "The requested resource was not found", request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(
            Exception ex, HttpServletRequest request) {
        log.error("Unhandled exception: ", ex);
        return respond(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "INTERNAL_SERVER_ERROR",
                CoreConstants.INTERNAL_SERVER_ERROR,
                request);
    }

    private String resolveCode(String message, String defaultCode) {
        return message != null && message.matches("[A-Z0-9_]+") ? message : defaultCode;
    }

    private ResponseEntity<ErrorResponse> respond(
            HttpStatus status, String code, String message, HttpServletRequest request) {
        return respond(status, code, message, request, null);
    }

    private ResponseEntity<ErrorResponse> respond(
            HttpStatus status,
            String code,
            String message,
            HttpServletRequest request,
            Map<String, String> fields) {
        return ResponseEntity.status(status)
                .body(
                        new ErrorResponse(
                                LocalDateTime.now(),
                                status.value(),
                                status.getReasonPhrase(),
                                code,
                                message,
                                request.getRequestURI(),
                                fields));
    }
}
