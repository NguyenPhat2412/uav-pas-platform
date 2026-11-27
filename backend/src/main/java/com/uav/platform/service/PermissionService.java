package com.uav.platform.service;

import com.uav.platform.dto.response.PermissionCodesResponse;
import com.uav.platform.dto.response.PermissionResponse;
import com.uav.platform.dto.response.UserPermissionResponse;
import com.uav.platform.enums.PermissionCode;

import org.springframework.security.core.Authentication;

import java.util.Arrays;
import java.util.List;

public interface PermissionService {
    boolean has(Authentication authentication, String permissionCode);

    default PermissionCodesResponse current(Authentication authentication) {
        return new PermissionCodesResponse(
                Arrays.stream(PermissionCode.values())
                        .filter(code -> has(authentication, code.name()))
                        .map(Enum::name)
                        .toList());
    }

    List<PermissionResponse> list();

    List<UserPermissionResponse> listUserPermissions(Long userId);

    void removeUserPermission(Long userId, PermissionCode code, String actorUsername);

    void setUserPermission(Long userId, PermissionCode code, boolean granted, String actorUsername);
}
