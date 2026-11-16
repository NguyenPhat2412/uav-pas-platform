package com.uav.platform.service.notification.policy;

import com.uav.platform.dto.request.notification.policy.UpdateNotificationModulePolicyRequest;
import com.uav.platform.dto.request.notification.policy.UpdateUserNotificationPreferenceRequest;
import com.uav.platform.dto.response.notification.inbox.NotificationResponse;
import com.uav.platform.dto.response.notification.policy.NotificationModulePolicyResponse;
import com.uav.platform.dto.response.notification.policy.UserNotificationModulePreferenceResponse;
import com.uav.platform.enums.notification.NotificationModuleCode;

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
