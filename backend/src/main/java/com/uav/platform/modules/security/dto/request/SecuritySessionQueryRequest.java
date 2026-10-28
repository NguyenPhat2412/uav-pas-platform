package com.uav.platform.modules.security.dto.request;

import com.uav.platform.modules.user.enums.UserRole;

/** Session-list query after HTTP binding; the service clamps paging. */
public record SecuritySessionQueryRequest(
        int page, int size, String keyword, UserRole role, boolean activeOnly) {}
