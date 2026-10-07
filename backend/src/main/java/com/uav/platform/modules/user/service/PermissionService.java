package com.uav.platform.modules.user.service;


import com.uav.platform.modules.user.common.*;

import com.uav.platform.modules.user.config.response.PermissionResponse;
import com.uav.platform.modules.user.common.PermissionCode;
import org.springframework.security.core.Authentication;

import java.util.List;

public interface PermissionService {
    boolean has(Authentication authentication, String permissionCode);
    List<PermissionResponse> list();
    List<com.uav.platform.modules.user.config.response.UserPermissionResponse> listUserPermissions(Long userId);
    void removeUserPermission(Long userId, PermissionCode code, String actorUsername);
    void setUserPermission(Long userId, PermissionCode code, boolean granted, String actorUsername);
}
