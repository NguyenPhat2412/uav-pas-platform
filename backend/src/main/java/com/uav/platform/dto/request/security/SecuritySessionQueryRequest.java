package com.uav.platform.dto.request.security;

import com.uav.platform.enums.user.UserRole;

/** Session-list query after HTTP binding; the service clamps paging. */
public record SecuritySessionQueryRequest(
        int page, int size, String keyword, UserRole role, boolean activeOnly) {}
