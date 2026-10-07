package com.uav.platform.error;

import java.time.LocalDateTime;

public record ErrorResponse(
        LocalDateTime timestamp,
        int status,
        String error,
        String code,
        String message,
        String path
) {
    public ErrorResponse(LocalDateTime timestamp, int status, String error, String message, String path) {
        this(timestamp, status, error, null, message, path);
    }

    public static ErrorResponse of(int status, String error, String message, String path) {
        return new ErrorResponse(LocalDateTime.now(), status, error, null, message, path);
    }

    public static ErrorResponse ofCode(int status, String error, String code, String message, String path) {
        return new ErrorResponse(LocalDateTime.now(), status, error, code, message, path);
    }
}
