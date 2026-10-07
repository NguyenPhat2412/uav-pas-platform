package com.uav.platform.modules.user.service;


import com.uav.platform.modules.user.common.*;

import com.uav.platform.modules.user.config.response.ZaloUserProfile;

public interface ZaloOAuthService {
    String getAuthorizationUrl();
    ZaloUserProfile authenticateWithZalo(String code);

    default ZaloUserProfile getUserProfile(String code) {
        return authenticateWithZalo(code);
    }
}
