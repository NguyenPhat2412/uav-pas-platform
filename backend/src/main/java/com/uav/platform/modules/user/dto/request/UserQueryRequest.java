package com.uav.platform.modules.user.dto.request;

import com.uav.platform.modules.user.enums.UserRole;

/** User-list query values after HTTP parameter binding; service rules still sanitize paging/sort. */
public record UserQueryRequest(
        int page, int size, String sortBy, String direction, String keyword, UserRole role) {}
