package com.uav.platform.modules.user.config.response;

import com.uav.platform.modules.user.common.*;

public record ZaloUserProfile(
        String id,
        String name,
        String avatar
) {
    public String zaloId() {
        return id;
    }

    public String fullName() {
        return name;
    }

    public String avatarUrl() {
        return avatar;
    }
}
