package com.uav.platform.service.notification.policy;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.uav.platform.dto.record.notification.delivery.NotificationDeliveryPayload;
import com.uav.platform.dto.request.notification.inbox.CreateNotificationRequest;
import com.uav.platform.dto.request.notification.policy.UpdateNotificationModulePolicyRequest;
import com.uav.platform.dto.request.notification.policy.UpdateUserNotificationPreferenceRequest;
import com.uav.platform.dto.response.notification.inbox.NotificationResponse;
import com.uav.platform.entity.notification.Notification;
import com.uav.platform.entity.notification.NotificationModulePolicy;
import com.uav.platform.entity.notification.UserNotificationPreference;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.notification.NotificationModuleCode;
import com.uav.platform.enums.notification.NotificationSeverity;
import com.uav.platform.enums.notification.NotificationType;
import com.uav.platform.error.SystemException;
import com.uav.platform.mapper.notification.inbox.NotificationMapper;
import com.uav.platform.repository.notification.NotificationModulePolicyRepository;
import com.uav.platform.repository.notification.NotificationRepository;
import com.uav.platform.repository.notification.UserNotificationPreferenceRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.impl.notification.delivery.NotificationDeliveryOperations;
import com.uav.platform.service.impl.notification.inbox.NotificationServiceImpl;
import com.uav.platform.service.impl.notification.policy.NotificationPolicyOperations;
import com.uav.platform.service.impl.notification.policy.NotificationPolicyServiceImpl;
import com.uav.platform.transport.websocket.RealtimeEventBroadcaster;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;
import org.mockito.ArgumentCaptor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.util.Optional;

class NotificationModulePolicyTest {

    private NotificationRepository notificationRepository;
    private NotificationModulePolicyRepository policyRepository;
    private UserNotificationPreferenceRepository preferenceRepository;
    private UserRepository userRepository;
    private NotificationDeliveryOperations deliveryOperations;
    private RealtimeEventBroadcaster realtime;
    private NotificationPolicyOperations policyOperations;
    private NotificationServiceImpl notificationService;
    private NotificationPolicyServiceImpl policyService;
    private AppUser user;

    @BeforeEach
    void setUp() {
        notificationRepository = mock(NotificationRepository.class);
        policyRepository = mock(NotificationModulePolicyRepository.class);
        preferenceRepository = mock(UserNotificationPreferenceRepository.class);
        userRepository = mock(UserRepository.class);
        deliveryOperations = mock(NotificationDeliveryOperations.class);
        realtime = mock(RealtimeEventBroadcaster.class);

        policyOperations = new NotificationPolicyOperations(policyRepository, preferenceRepository);
        NotificationMapper mapper = Mappers.getMapper(NotificationMapper.class);
        notificationService =
                new NotificationServiceImpl(notificationRepository, userRepository, mapper);
        notificationService.setDeliveryOperations(deliveryOperations);
        notificationService.setPolicyOperations(policyOperations);
        notificationService.setRealtime(realtime);

        policyService =
                new NotificationPolicyServiceImpl(
                        policyRepository,
                        preferenceRepository,
                        userRepository,
                        policyOperations,
                        notificationService);

        user = new AppUser();
        user.setId(42L);
        user.setUsername("pilot01");
        user.setEmail("pilot01@uav.all1.vn");
        user.setFullName("Pilot 01");
        when(userRepository.findById(42L)).thenReturn(Optional.of(user));
        when(userRepository.findByUsername("pilot01")).thenReturn(Optional.of(user));
        when(notificationRepository.save(any(Notification.class)))
                .thenAnswer(
                        inv -> {
                            Notification n = inv.getArgument(0);
                            n.setId(99L);
                            return n;
                        });
    }

    @Test
    void resolvesAllNineModulesAccuratelyFromReferenceAndType() {
        assertEquals(
                NotificationModuleCode.SAR,
                NotificationPolicyOperations.resolveModuleCode(
                        NotificationType.SAR_TARGET_FOUND, "SAR"));
        assertEquals(
                NotificationModuleCode.AIRSPACE,
                NotificationPolicyOperations.resolveModuleCode(NotificationType.SYSTEM, "PERMIT"));
        assertEquals(
                NotificationModuleCode.MISSION,
                NotificationPolicyOperations.resolveModuleCode(
                        NotificationType.MISSION_ASSIGNED, "MISSION"));
        assertEquals(
                NotificationModuleCode.MARKETPLACE,
                NotificationPolicyOperations.resolveModuleCode(NotificationType.PAYMENT, "ESCROW"));
        assertEquals(
                NotificationModuleCode.BILLING,
                NotificationPolicyOperations.resolveModuleCode(
                        NotificationType.QUOTA_WARNING, "QUOTA"));
        assertEquals(
                NotificationModuleCode.SUPPORT,
                NotificationPolicyOperations.resolveModuleCode(NotificationType.SYSTEM, "SUPPORT"));
        assertEquals(
                NotificationModuleCode.MAINTENANCE,
                NotificationPolicyOperations.resolveModuleCode(
                        NotificationType.SYSTEM, "MAINTENANCE"));
        assertEquals(
                NotificationModuleCode.STORAGE,
                NotificationPolicyOperations.resolveModuleCode(NotificationType.SYSTEM, "STORAGE"));
        assertEquals(
                NotificationModuleCode.SYSTEM,
                NotificationPolicyOperations.resolveModuleCode(NotificationType.SYSTEM, null));
    }

    @Test
    void disabledModuleSuppressesPersistenceRealtimeAndExternalChannels() {
        NotificationModulePolicy disabled =
                NotificationPolicyOperations.fallbackPolicy(NotificationModuleCode.MARKETPLACE);
        disabled.setEnabled(false);
        when(policyRepository.findByModuleCode(NotificationModuleCode.MARKETPLACE))
                .thenReturn(Optional.of(disabled));

        NotificationResponse res =
                notificationService.sendNotification(
                        new CreateNotificationRequest(
                                42L,
                                "Đơn mới",
                                "Khách đặt dịch vụ",
                                NotificationType.PAYMENT,
                                "MARKETPLACE",
                                10L));

        assertNull(res.id());
        assertEquals(NotificationModuleCode.MARKETPLACE, res.moduleCode());
        verify(notificationRepository, never()).save(any());
        verifyNoInteractions(deliveryOperations, realtime);
    }

    @Test
    void mandatorySafetyModuleRejectsUserMutingAndEnforcesScreenPopup() {
        NotificationModulePolicy sar =
                NotificationPolicyOperations.fallbackPolicy(NotificationModuleCode.SAR);
        sar.setMandatory(true);
        when(policyRepository.findByModuleCode(NotificationModuleCode.SAR))
                .thenReturn(Optional.of(sar));

        var auth = new UsernamePasswordAuthenticationToken("pilot01", "x");
        SystemException ex =
                assertThrows(
                        SystemException.class,
                        () ->
                                policyService.updateUserPreference(
                                        NotificationModuleCode.SAR,
                                        new UpdateUserNotificationPreferenceRequest(
                                                true, false, false, false, false),
                                        auth));
        assertEquals("NOTIFICATION_MODULE_MANDATORY", ex.getCode());
    }

    @Test
    void nonMandatoryUserPreferenceDisablesScreenPopupAndEmailWithoutBlockingBell() {
        NotificationModulePolicy billing =
                NotificationPolicyOperations.fallbackPolicy(NotificationModuleCode.BILLING);
        billing.setEmailEnabled(true);
        billing.setMobilePushEnabled(true);
        billing.setScreenPopupEnabled(true);
        billing.setDesktopOsEnabled(true);
        when(policyRepository.findByModuleCode(NotificationModuleCode.BILLING))
                .thenReturn(Optional.of(billing));

        UserNotificationPreference pref = new UserNotificationPreference();
        pref.setUser(user);
        pref.setModuleCode(NotificationModuleCode.BILLING);
        pref.setMuted(false);
        pref.setScreenPopupEnabled(false);
        pref.setDesktopOsEnabled(true);
        pref.setMobilePushEnabled(true);
        pref.setEmailEnabled(false);
        when(preferenceRepository.findByUserIdAndModuleCode(42L, NotificationModuleCode.BILLING))
                .thenReturn(Optional.of(pref));
        when(notificationRepository.countByUserIdAndIsReadFalse(42L)).thenReturn(3L);

        NotificationResponse saved =
                notificationService.sendNotification(
                        new CreateNotificationRequest(
                                42L,
                                "Hoá đơn #12",
                                "Đã xác nhận thanh toán",
                                NotificationType.PAYMENT,
                                "INVOICE",
                                12L));

        assertEquals(99L, saved.id());
        assertEquals(NotificationModuleCode.BILLING, saved.moduleCode());
        assertEquals(NotificationSeverity.ACTION, saved.severity());

        var payloadCaptor = ArgumentCaptor.forClass(NotificationDeliveryPayload.class);
        verify(deliveryOperations).dispatchAfterCommit(payloadCaptor.capture());
        assertTrue(payloadCaptor.getValue().mobilePushAllowed());
        assertFalse(payloadCaptor.getValue().emailAllowed());

        verify(realtime).publishNotificationCreated(eq(42L), any(), eq(3L), eq(false), eq(true));
    }

    @Test
    void adminCanUpdateModulePolicyAndFireTestNotification() {
        NotificationModulePolicy storage =
                NotificationPolicyOperations.fallbackPolicy(NotificationModuleCode.STORAGE);
        when(policyRepository.findByModuleCode(NotificationModuleCode.STORAGE))
                .thenReturn(Optional.of(storage));
        when(policyRepository.save(any(NotificationModulePolicy.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        var updated =
                policyService.updateModule(
                        NotificationModuleCode.STORAGE,
                        new UpdateNotificationModulePolicyRequest(
                                true,
                                NotificationSeverity.CRITICAL,
                                false,
                                true,
                                true,
                                true,
                                false,
                                true,
                                30));
        assertEquals(NotificationSeverity.CRITICAL, updated.severity());
        assertTrue(updated.desktopOsEnabled());
        assertTrue(updated.emailEnabled());

        var auth = new UsernamePasswordAuthenticationToken("pilot01", "x");
        NotificationResponse testRes =
                policyService.sendTestNotification(NotificationModuleCode.STORAGE, auth);
        assertEquals(99L, testRes.id());
        assertEquals(NotificationModuleCode.STORAGE, testRes.moduleCode());
        assertEquals(NotificationSeverity.CRITICAL, testRes.severity());
    }
}
