package com.uav.platform.error;

import org.springframework.http.HttpStatus;

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

    public HttpStatus getStatus() {
        return status;
    }

    public String getCode() { return code; }

    private static String normalize(String message) {
        if (message == null || message.isBlank()) return "SYSTEM_ERROR";
        return message.trim().toUpperCase().replaceAll("[^A-Z0-9]+", "_");
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
