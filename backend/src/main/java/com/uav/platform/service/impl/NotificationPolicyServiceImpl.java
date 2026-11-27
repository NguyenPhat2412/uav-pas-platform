package com.uav.platform.service.impl;

import com.uav.platform.dao.INotificationModulePolicyDao;
import com.uav.platform.dao.IUserDao;
import com.uav.platform.dao.IUserNotificationPreferenceDao;
import com.uav.platform.dto.request.CreateNotificationRequest;
import com.uav.platform.dto.request.UpdateNotificationModulePolicyRequest;
import com.uav.platform.dto.request.UpdateUserNotificationPreferenceRequest;
import com.uav.platform.dto.response.NotificationModulePolicyResponse;
import com.uav.platform.dto.response.NotificationResponse;
import com.uav.platform.dto.response.UserNotificationModulePreferenceResponse;
import com.uav.platform.entity.AppUser;
import com.uav.platform.entity.NotificationModulePolicy;
import com.uav.platform.entity.UserNotificationPreference;
import com.uav.platform.enums.NotificationModuleCode;
import com.uav.platform.enums.NotificationType;
import com.uav.platform.error.SystemException;
import com.uav.platform.service.NotificationPolicyService;
import com.uav.platform.service.NotificationService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional
@RequiredArgsConstructor
public class NotificationPolicyServiceImpl implements NotificationPolicyService {

    private final INotificationModulePolicyDao policyRepository;
    private final IUserNotificationPreferenceDao preferenceRepository;
    private final IUserDao userRepository;
    private final NotificationPolicyOperations policyOperations;
    private final NotificationService notificationService;

    @Override
    public List<NotificationModulePolicyResponse> listModules() {
        return policyOperations.ensureAllSeeded().stream()
                .map(NotificationPolicyOperations::toPolicyResponse)
                .toList();
    }

    @Override
    public NotificationModulePolicyResponse updateModule(
            NotificationModuleCode moduleCode, UpdateNotificationModulePolicyRequest request) {
        NotificationModulePolicy policy =
                policyRepository
                        .findByModuleCode(moduleCode)
                        .orElseGet(() -> NotificationPolicyOperations.fallbackPolicy(moduleCode));
        policy.setEnabled(request.enabled());
        policy.setSeverity(request.severity());
        policy.setMandatory(request.mandatory());
        policy.setInAppEnabled(request.inAppEnabled());
        policy.setScreenPopupEnabled(request.screenPopupEnabled());
        policy.setDesktopOsEnabled(request.desktopOsEnabled());
        policy.setMobilePushEnabled(request.mobilePushEnabled());
        policy.setEmailEnabled(request.emailEnabled());
        policy.setCooldownSeconds(Math.max(0, request.cooldownSeconds()));
        NotificationModulePolicy saved = policyRepository.save(policy);
        return NotificationPolicyOperations.toPolicyResponse(saved);
    }

    @Override
    public NotificationResponse sendTestNotification(
            NotificationModuleCode moduleCode, Authentication auth) {
        AppUser actor = currentUser(auth);
        NotificationModulePolicy policy =
                policyRepository
                        .findByModuleCode(moduleCode)
                        .orElseGet(() -> NotificationPolicyOperations.fallbackPolicy(moduleCode));
        if (!Boolean.TRUE.equals(policy.getEnabled())) {
            throw new SystemException(
                    "Module " + moduleCode + " đang tắt nên không thể bắn thử thông báo.",
                    HttpStatus.CONFLICT,
                    "NOTIFICATION_MODULE_DISABLED");
        }
        NotificationType notifType =
                switch (moduleCode) {
                    case SAR -> NotificationType.SAR_TARGET_FOUND;
                    case MISSION -> NotificationType.MISSION_STATUS_CHANGED;
                    case BILLING -> NotificationType.PAYMENT;
                    default -> NotificationType.SYSTEM;
                };
        String title = "[Kiểm thử] " + policy.getDisplayNameVi();
        String content =
                "Thông báo thử nghiệm trực tiếp từ quản trị module "
                        + moduleCode.name()
                        + " ("
                        + policy.getSeverity().name()
                        + ") — kiểm tra hiển thị Popup màn hình, Khay HĐH và Mobile.";
        return notificationService.sendNotification(
                new CreateNotificationRequest(
                        actor.getId(), title, content, notifType, moduleCode.name(), null));
    }

    @Override
    public List<UserNotificationModulePreferenceResponse> listUserPreferences(Authentication auth) {
        AppUser user = currentUser(auth);
        List<NotificationModulePolicy> policies = policyOperations.ensureAllSeeded();
        Map<NotificationModuleCode, UserNotificationPreference> prefsByModule =
                new EnumMap<>(NotificationModuleCode.class);
        for (UserNotificationPreference pref : preferenceRepository.findByUserId(user.getId())) {
            prefsByModule.put(pref.getModuleCode(), pref);
        }
        return policies.stream()
                .map(
                        p ->
                                NotificationPolicyOperations.toUserPrefResponse(
                                        p, prefsByModule.get(p.getModuleCode())))
                .toList();
    }

    @Override
    public UserNotificationModulePreferenceResponse updateUserPreference(
            NotificationModuleCode moduleCode,
            UpdateUserNotificationPreferenceRequest request,
            Authentication auth) {
        AppUser user = currentUser(auth);
        NotificationModulePolicy policy =
                policyRepository
                        .findByModuleCode(moduleCode)
                        .orElseGet(() -> NotificationPolicyOperations.fallbackPolicy(moduleCode));
        if (Boolean.TRUE.equals(policy.getMandatory())
                && (Boolean.TRUE.equals(request.muted())
                        || !Boolean.TRUE.equals(request.screenPopupEnabled()))) {
            throw new SystemException(
                    "Module an toàn bay bắt buộc ("
                            + policy.getDisplayNameVi()
                            + ") không cho phép tắt thông báo.",
                    HttpStatus.BAD_REQUEST,
                    "NOTIFICATION_MODULE_MANDATORY");
        }

        UserNotificationPreference pref =
                preferenceRepository
                        .findByUserIdAndModuleCode(user.getId(), moduleCode)
                        .orElseGet(
                                () -> {
                                    UserNotificationPreference created =
                                            new UserNotificationPreference();
                                    created.setUser(user);
                                    created.setModuleCode(moduleCode);
                                    return created;
                                });
        pref.setMuted(Boolean.TRUE.equals(policy.getMandatory()) ? false : request.muted());
        pref.setScreenPopupEnabled(
                Boolean.TRUE.equals(policy.getMandatory()) || request.screenPopupEnabled());
        pref.setDesktopOsEnabled(request.desktopOsEnabled());
        pref.setMobilePushEnabled(request.mobilePushEnabled());
        pref.setEmailEnabled(request.emailEnabled());
        UserNotificationPreference saved = preferenceRepository.save(pref);
        return NotificationPolicyOperations.toUserPrefResponse(policy, saved);
    }

    private AppUser currentUser(Authentication auth) {
        if (auth == null || auth.getName() == null || auth.getName().isBlank()) {
            throw SystemException.unauthorized("Authentication required");
        }
        return userRepository
                .findByUsername(auth.getName())
                .orElseThrow(() -> SystemException.notFound("User not found: " + auth.getName()));
    }
}
