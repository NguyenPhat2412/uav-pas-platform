package com.uav.platform.modules.user.config.request;

import com.uav.platform.error.SystemException;
import java.util.Map;
import java.util.Set;

/** Explicit allowlist prevents identity and administrative fields from entering a self update. */
public record UserProfileUpdateRequest(String fullName, String phoneNumber, String expectedRevision) {
    public static UserProfileUpdateRequest from(Map<String, Object> body) {
        if (!body.keySet().equals(Set.of("fullName", "phoneNumber", "expectedRevision"))) {
            throw SystemException.badRequest("Chỉ được cập nhật họ tên và số điện thoại kèm phiên bản hồ sơ.");
        }
        if (body.get("fullName") != null && !(body.get("fullName") instanceof String)
                || !(body.get("phoneNumber") instanceof String) || !(body.get("expectedRevision") instanceof String)) {
            throw SystemException.badRequest("Thông tin hồ sơ không đúng định dạng.");
        }
        return new UserProfileUpdateRequest((String) body.get("fullName"), (String) body.get("phoneNumber"), (String) body.get("expectedRevision"));
    }
}
