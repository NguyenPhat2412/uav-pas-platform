package com.uav.platform.error;

import lombok.Getter;

import org.springframework.http.HttpStatus;

import java.text.Normalizer;
import java.util.Locale;

@Getter
public class SystemException extends RuntimeException {
    private final HttpStatus status;
    private final String code;

    public SystemException(String message, HttpStatus status) {
        this(message, status, normalize(message));
    }

    public SystemException(String message, HttpStatus status, String code) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public static String normalize(String message) {
        if (message == null || message.isBlank()) return "SYSTEM_ERROR";
        String ascii =
                Normalizer.normalize(message.trim(), Normalizer.Form.NFD)
                        .replaceAll("\\p{M}+", "")
                        .replace('đ', 'd')
                        .replace('Đ', 'D')
                        .toUpperCase(Locale.ROOT)
                        .replaceAll("[^A-Z0-9]+", "_")
                        .replaceAll("^_+|_+$", "");
        return ascii.isEmpty() ? "SYSTEM_ERROR" : ascii;
    }

    public static SystemException badRequest(String message) {
        return new SystemException(message, HttpStatus.BAD_REQUEST);
    }

    public static SystemException badRequest(String message, String code) {
        return new SystemException(message, HttpStatus.BAD_REQUEST, code);
    }

    public static SystemException unauthorized(String message) {
        return new SystemException(message, HttpStatus.UNAUTHORIZED);
    }

    public static SystemException unauthorized(String message, String code) {
        return new SystemException(message, HttpStatus.UNAUTHORIZED, code);
    }

    public static SystemException forbidden(String message) {
        return new SystemException(message, HttpStatus.FORBIDDEN);
    }

    public static SystemException forbidden(String message, String code) {
        return new SystemException(message, HttpStatus.FORBIDDEN, code);
    }

    public static SystemException notFound(String message) {
        return new SystemException(message, HttpStatus.NOT_FOUND);
    }

    public static SystemException notFound(String message, String code) {
        return new SystemException(message, HttpStatus.NOT_FOUND, code);
    }

    public static SystemException conflict(String message) {
        return new SystemException(message, HttpStatus.CONFLICT);
    }

    public static SystemException conflict(String message, String code) {
        return new SystemException(message, HttpStatus.CONFLICT, code);
    }

    public static SystemException serviceUnavailable(String message) {
        return new SystemException(message, HttpStatus.SERVICE_UNAVAILABLE);
    }

    public static SystemException serviceUnavailable(String message, String code) {
        return new SystemException(message, HttpStatus.SERVICE_UNAVAILABLE, code);
    }

    public static SystemException internalError(String message) {
        return new SystemException(message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    public static SystemException internalError(String message, String code) {
        return new SystemException(message, HttpStatus.INTERNAL_SERVER_ERROR, code);
    }
}
