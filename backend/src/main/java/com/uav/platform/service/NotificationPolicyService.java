package com.uav.platform.service;

import com.uav.platform.dto.request.UpdateNotificationModulePolicyRequest;
import com.uav.platform.dto.request.UpdateUserNotificationPreferenceRequest;
import com.uav.platform.dto.response.NotificationModulePolicyResponse;
import com.uav.platform.dto.response.NotificationResponse;
import com.uav.platform.dto.response.UserNotificationModulePreferenceResponse;
import com.uav.platform.enums.NotificationModuleCode;

import org.springframework.security.core.Authentication;

import java.util.List;

public interface NotificationPolicyService {

    List<NotificationModulePolicyResponse> listModules();

    NotificationModulePolicyResponse updateModule(
            NotificationModuleCode moduleCode, UpdateNotificationModulePolicyRequest request);

    NotificationResponse sendTestNotification(
            NotificationModuleCode moduleCode, Authentication auth);

    List<UserNotificationModulePreferenceResponse> listUserPreferences(Authentication auth);

    UserNotificationModulePreferenceResponse updateUserPreference(
            NotificationModuleCode moduleCode,
            UpdateUserNotificationPreferenceRequest request,
            Authentication auth);
}
