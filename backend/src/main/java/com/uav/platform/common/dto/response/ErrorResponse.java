package com.uav.platform.common.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDateTime;
import java.util.Map;

public record ErrorResponse(
        LocalDateTime timestamp,
        int status,
        String error,
        String code,
        String message,
        String path,
        /** Field name to message for input errors; absent for other errors. */
        @JsonInclude(JsonInclude.Include.NON_NULL) Map<String, String> fields) {
    public ErrorResponse(
            LocalDateTime timestamp, int status, String error, String message, String path) {
        this(timestamp, status, error, null, message, path, null);
    }

    public static ErrorResponse of(int status, String error, String message, String path) {
        return new ErrorResponse(LocalDateTime.now(), status, error, null, message, path, null);
    }

    public static ErrorResponse ofCode(
            int status, String error, String code, String message, String path) {
        return new ErrorResponse(LocalDateTime.now(), status, error, code, message, path, null);
    }
}
