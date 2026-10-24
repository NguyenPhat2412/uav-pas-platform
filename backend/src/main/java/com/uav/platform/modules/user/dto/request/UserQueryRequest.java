package com.uav.platform.modules.user.dto.request;

import com.uav.platform.modules.user.enums.UserRole;
import com.uav.platform.modules.user.enums.UserStatus;

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
