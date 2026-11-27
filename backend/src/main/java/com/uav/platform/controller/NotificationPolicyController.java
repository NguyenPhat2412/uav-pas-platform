package com.uav.platform.controller;

import com.uav.platform.config.ApiRoutes;
import com.uav.platform.dto.request.UpdateNotificationModulePolicyRequest;
import com.uav.platform.dto.request.UpdateUserNotificationPreferenceRequest;
import com.uav.platform.dto.response.NotificationModulePolicyResponse;
import com.uav.platform.dto.response.NotificationResponse;
import com.uav.platform.dto.response.UserNotificationModulePreferenceResponse;
import com.uav.platform.enums.NotificationModuleCode;
import com.uav.platform.service.NotificationPolicyService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping(ApiRoutes.Notifications.BASE)
@RequiredArgsConstructor
public class NotificationPolicyController {

    private static final String ADMIN_READ =
            "@permissionService.has(authentication, 'DASHBOARD_VIEW') or @permissionService.has(authentication, 'SETTINGS_MANAGE') or @permissionService.has(authentication, 'USER_MANAGE') or hasAnyRole('SUPER_ADMIN','SYSTEM_ADMIN')";

    private static final String ADMIN_WRITE =
            "@permissionService.has(authentication, 'SETTINGS_MANAGE') or @permissionService.has(authentication, 'USER_MANAGE') or hasAnyRole('SUPER_ADMIN','SYSTEM_ADMIN')";

    private final NotificationPolicyService policyService;

    @GetMapping(ApiRoutes.Notifications.MODULES)
    @PreAuthorize(ADMIN_READ)
    public ResponseEntity<List<NotificationModulePolicyResponse>> listModules() {
        return ResponseEntity.ok(policyService.listModules());
    }

    @PutMapping(ApiRoutes.Notifications.MODULE_BY_CODE)
    @PreAuthorize(ADMIN_WRITE)
    public ResponseEntity<NotificationModulePolicyResponse> updateModule(
            @PathVariable NotificationModuleCode moduleCode,
            @Valid @RequestBody UpdateNotificationModulePolicyRequest request) {
        return ResponseEntity.ok(policyService.updateModule(moduleCode, request));
    }

    @PostMapping(ApiRoutes.Notifications.MODULE_TEST)
    @PreAuthorize(ADMIN_WRITE)
    public ResponseEntity<NotificationResponse> sendTestNotification(
            @PathVariable NotificationModuleCode moduleCode, Authentication auth) {
        return ResponseEntity.ok(policyService.sendTestNotification(moduleCode, auth));
    }

    @GetMapping(ApiRoutes.Notifications.PREFERENCES)
    public ResponseEntity<List<UserNotificationModulePreferenceResponse>> listUserPreferences(
            Authentication auth) {
        return ResponseEntity.ok(policyService.listUserPreferences(auth));
    }

    @PutMapping(ApiRoutes.Notifications.PREFERENCE_BY_MODULE)
    public ResponseEntity<UserNotificationModulePreferenceResponse> updateUserPreference(
            @PathVariable NotificationModuleCode moduleCode,
            @Valid @RequestBody UpdateUserNotificationPreferenceRequest request,
            Authentication auth) {
        return ResponseEntity.ok(policyService.updateUserPreference(moduleCode, request, auth));
    }
}
