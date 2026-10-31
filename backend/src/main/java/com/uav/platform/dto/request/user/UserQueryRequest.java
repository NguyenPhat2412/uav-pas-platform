package com.uav.platform.dto.request.user;

import com.uav.platform.enums.user.UserRole;
import com.uav.platform.enums.user.UserStatus;

/** User-list query values after HTTP parameter binding; service rules still sanitize paging/sort. */
public record UserQueryRequest(
        int page,
        int size,
        String sortBy,
        String direction,
        String keyword,
        UserRole role,
        UserStatus status) {

    public UserQueryRequest(
            int page, int size, String sortBy, String direction, String keyword, UserRole role) {
        this(page, size, sortBy, direction, keyword, role, null);
    }
}
