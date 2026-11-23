package com.uav.platform.service.impl.notification.policy;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

import com.uav.platform.dao.notification.INotificationModulePolicyDao;
import com.uav.platform.dao.notification.IUserNotificationPreferenceDao;
import com.uav.platform.dto.record.notification.policy.EffectiveNotificationChannels;
import com.uav.platform.dto.response.notification.policy.NotificationModulePolicyResponse;
import com.uav.platform.dto.response.notification.policy.UserNotificationModulePreferenceResponse;
import com.uav.platform.entity.notification.NotificationModulePolicy;
import com.uav.platform.entity.notification.UserNotificationPreference;
import com.uav.platform.enums.notification.NotificationModuleCode;
import com.uav.platform.enums.notification.NotificationSeverity;
import com.uav.platform.enums.notification.NotificationType;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@ExtendWith(MockitoExtension.class)
class NotificationPolicyOperationsCoverageTest {

    @Mock private INotificationModulePolicyDao policyRepository;
    @Mock private IUserNotificationPreferenceDao preferenceRepository;

    private NotificationPolicyOperations ops;

    @BeforeEach
    void setUp() {
        ops = new NotificationPolicyOperations(policyRepository, preferenceRepository);
    }

    @Test
    void resolveModuleCodeCoversAllReferenceTypesAndTypeFallbacks() {
        assertEquals(
                NotificationModuleCode.SAR,
                NotificationPolicyOperations.resolveModuleCode(null, "sar"));
        assertEquals(
                NotificationModuleCode.AIRSPACE,
                NotificationPolicyOperations.resolveModuleCode(null, "PERMIT"));
        assertEquals(
                NotificationModuleCode.AIRSPACE,
                NotificationPolicyOperations.resolveModuleCode(null, "AIRSPACE"));
        assertEquals(
                NotificationModuleCode.MISSION,
                NotificationPolicyOperations.resolveModuleCode(null, "MISSION"));
        assertEquals(
                NotificationModuleCode.MARKETPLACE,
                NotificationPolicyOperations.resolveModuleCode(null, "MARKETPLACE"));
        assertEquals(
                NotificationModuleCode.MARKETPLACE,
                NotificationPolicyOperations.resolveModuleCode(null, "ESCROW"));
        assertEquals(
                NotificationModuleCode.MARKETPLACE,
                NotificationPolicyOperations.resolveModuleCode(null, "LISTING"));
        assertEquals(
                NotificationModuleCode.MARKETPLACE,
                NotificationPolicyOperations.resolveModuleCode(null, "PAYOUT"));
        assertEquals(
                NotificationModuleCode.MARKETPLACE,
                NotificationPolicyOperations.resolveModuleCode(null, "PROVIDER"));
        assertEquals(
                NotificationModuleCode.MARKETPLACE,
                NotificationPolicyOperations.resolveModuleCode(null, "RFQ"));
        assertEquals(
                NotificationModuleCode.BILLING,
                NotificationPolicyOperations.resolveModuleCode(null, "INVOICE"));
        assertEquals(
                NotificationModuleCode.BILLING,
                NotificationPolicyOperations.resolveModuleCode(null, "QUOTA"));
        assertEquals(
                NotificationModuleCode.BILLING,
                NotificationPolicyOperations.resolveModuleCode(null, "BILLING"));
        assertEquals(
                NotificationModuleCode.BILLING,
                NotificationPolicyOperations.resolveModuleCode(null, "PAYMENT"));
        assertEquals(
                NotificationModuleCode.SUPPORT,
                NotificationPolicyOperations.resolveModuleCode(null, "SUPPORT"));
        assertEquals(
                NotificationModuleCode.MAINTENANCE,
                NotificationPolicyOperations.resolveModuleCode(null, "MAINTENANCE"));
        assertEquals(
                NotificationModuleCode.MAINTENANCE,
                NotificationPolicyOperations.resolveModuleCode(null, "REPAIR"));
        assertEquals(
                NotificationModuleCode.STORAGE,
                NotificationPolicyOperations.resolveModuleCode(null, "STORAGE"));
        assertEquals(
                NotificationModuleCode.STORAGE,
                NotificationPolicyOperations.resolveModuleCode(null, "FILE"));
        assertEquals(
                NotificationModuleCode.STORAGE,
                NotificationPolicyOperations.resolveModuleCode(null, "DRIVE"));

        // Fallbacks when referenceType is unknown or null
        assertEquals(
                NotificationModuleCode.SYSTEM,
                NotificationPolicyOperations.resolveModuleCode(null, "OTHER"));
        assertEquals(
                NotificationModuleCode.SAR,
                NotificationPolicyOperations.resolveModuleCode(
                        NotificationType.SAR_TARGET_FOUND, null));
        assertEquals(
                NotificationModuleCode.MISSION,
                NotificationPolicyOperations.resolveModuleCode(
                        NotificationType.MISSION_ASSIGNED, ""));
        assertEquals(
                NotificationModuleCode.MISSION,
                NotificationPolicyOperations.resolveModuleCode(
                        NotificationType.MISSION_STATUS_CHANGED, " "));
        assertEquals(
                NotificationModuleCode.BILLING,
                NotificationPolicyOperations.resolveModuleCode(
                        NotificationType.QUOTA_WARNING, "UNKNOWN"));
        assertEquals(
                NotificationModuleCode.BILLING,
                NotificationPolicyOperations.resolveModuleCode(NotificationType.PAYMENT, null));
        assertEquals(
                NotificationModuleCode.SYSTEM,
                NotificationPolicyOperations.resolveModuleCode(NotificationType.SYSTEM, null));
    }

    @Test
    void defaultSeverityAndFallbackPolicyCoverEveryModule() {
        assertEquals(NotificationSeverity.INFO, NotificationPolicyOperations.defaultSeverity(null));
        for (NotificationModuleCode code : NotificationModuleCode.values()) {
            NotificationModulePolicy p = NotificationPolicyOperations.fallbackPolicy(code);
            assertEquals(code, p.getModuleCode());
            assertNotNull(p.getDisplayNameVi());
            assertNotNull(p.getDisplayNameEn());
            assertNotNull(p.getDisplayNameJa());
            assertNotNull(p.getDescriptionVi());
            assertNotNull(p.getDescriptionEn());
            assertNotNull(p.getDescriptionJa());
            NotificationModulePolicyResponse resp =
                    NotificationPolicyOperations.toPolicyResponse(p);
            assertEquals(code, resp.moduleCode());
        }
    }

    @Test
    void ensureAllSeededSavesMissingAndSkipsWhenComplete() {
        NotificationModulePolicy sar =
                NotificationPolicyOperations.fallbackPolicy(NotificationModuleCode.SAR);
        List<NotificationModulePolicy> all =
                Arrays.stream(NotificationModuleCode.values())
                        .map(NotificationPolicyOperations::fallbackPolicy)
                        .toList();

        // Missing policies case
        when(policyRepository.findAllByOrderBySortOrderAscIdAsc()).thenReturn(List.of(sar), all);
        List<NotificationModulePolicy> seeded = ops.ensureAllSeeded();
        assertEquals(NotificationModuleCode.values().length, seeded.size());
        verify(policyRepository).saveAll(anyList());

        // Already complete case
        reset(policyRepository);
        when(policyRepository.findAllByOrderBySortOrderAscIdAsc()).thenReturn(all);
        List<NotificationModulePolicy> existing = ops.ensureAllSeeded();
        assertEquals(NotificationModuleCode.values().length, existing.size());
        verify(policyRepository, never()).saveAll(anyList());
    }

    @Test
    void evaluateCoversDisabledMandatoryNullUserMutedAndSelectivePreferences() {
        // Disabled policy
        NotificationModulePolicy disabled =
                NotificationPolicyOperations.fallbackPolicy(NotificationModuleCode.SYSTEM);
        disabled.setEnabled(false);
        when(policyRepository.findByModuleCode(NotificationModuleCode.SYSTEM))
                .thenReturn(Optional.of(disabled));
        EffectiveNotificationChannels disabledRes = ops.evaluate(1L, NotificationType.SYSTEM, null);
        assertFalse(disabledRes.enabled());
        assertFalse(disabledRes.inApp());

        // Mandatory policy (ignores user preference lookup)
        NotificationModulePolicy sar =
                NotificationPolicyOperations.fallbackPolicy(NotificationModuleCode.SAR);
        sar.setSeverity(null);
        sar.setCooldownSeconds(null);
        when(policyRepository.findByModuleCode(NotificationModuleCode.SAR))
                .thenReturn(Optional.of(sar));
        EffectiveNotificationChannels sarRes =
                ops.evaluate(1L, NotificationType.SAR_TARGET_FOUND, "SAR");
        assertTrue(sarRes.mandatory());
        assertEquals(NotificationSeverity.CRITICAL, sarRes.severity());
        assertEquals(0, sarRes.cooldownSeconds());
        verify(preferenceRepository, never())
                .findByUserIdAndModuleCode(1L, NotificationModuleCode.SAR);

        // Null userId skips preference lookup
        when(policyRepository.findByModuleCode(NotificationModuleCode.MISSION))
                .thenReturn(Optional.empty());
        EffectiveNotificationChannels anonMission =
                ops.evaluate(null, NotificationType.MISSION_ASSIGNED, "MISSION");
        assertTrue(anonMission.inApp());
        assertTrue(anonMission.email());

        // Muted user preference
        NotificationModulePolicy billing =
                NotificationPolicyOperations.fallbackPolicy(NotificationModuleCode.BILLING);
        billing.setCooldownSeconds(30);
        UserNotificationPreference mutedPref = new UserNotificationPreference();
        mutedPref.setMuted(true);
        when(policyRepository.findByModuleCode(NotificationModuleCode.BILLING))
                .thenReturn(Optional.of(billing));
        when(preferenceRepository.findByUserIdAndModuleCode(2L, NotificationModuleCode.BILLING))
                .thenReturn(Optional.of(mutedPref));
        EffectiveNotificationChannels mutedRes =
                ops.evaluate(2L, NotificationType.PAYMENT, "BILLING");
        assertFalse(mutedRes.inApp());
        assertFalse(mutedRes.screenPopup());
        assertFalse(mutedRes.desktopOs());
        assertFalse(mutedRes.mobilePush());
        assertFalse(mutedRes.email());
        assertEquals(30, mutedRes.cooldownSeconds());

        // Selective channel preferences
        UserNotificationPreference selective = new UserNotificationPreference();
        selective.setMuted(false);
        selective.setScreenPopupEnabled(false);
        selective.setDesktopOsEnabled(true);
        selective.setMobilePushEnabled(false);
        selective.setEmailEnabled(true);
        when(preferenceRepository.findByUserIdAndModuleCode(3L, NotificationModuleCode.BILLING))
                .thenReturn(Optional.of(selective));
        EffectiveNotificationChannels selRes =
                ops.evaluate(3L, NotificationType.PAYMENT, "BILLING");
        assertTrue(selRes.inApp());
        assertFalse(selRes.screenPopup());
        assertTrue(selRes.desktopOs());
        assertFalse(selRes.mobilePush());
        assertTrue(selRes.email());
    }

    @Test
    void toUserPrefResponseHandlesMandatoryNullPrefAndUserOverrides() {
        NotificationModulePolicy mandatory =
                NotificationPolicyOperations.fallbackPolicy(NotificationModuleCode.SAR);
        UserNotificationPreference muted = new UserNotificationPreference();
        muted.setMuted(true);
        muted.setScreenPopupEnabled(false);
        muted.setDesktopOsEnabled(false);
        muted.setMobilePushEnabled(false);
        muted.setEmailEnabled(false);

        UserNotificationModulePreferenceResponse mandResp =
                NotificationPolicyOperations.toUserPrefResponse(mandatory, muted);
        assertTrue(mandResp.mandatory());
        assertFalse(mandResp.muted());
        assertTrue(mandResp.screenPopupEnabled());
        assertTrue(mandResp.desktopOsEnabled());
        assertTrue(mandResp.mobilePushEnabled());
        assertTrue(mandResp.emailEnabled());

        NotificationModulePolicy optional =
                NotificationPolicyOperations.fallbackPolicy(NotificationModuleCode.MISSION);
        UserNotificationModulePreferenceResponse defaultResp =
                NotificationPolicyOperations.toUserPrefResponse(optional, null);
        assertFalse(defaultResp.muted());
        assertTrue(defaultResp.emailEnabled());

        UserNotificationModulePreferenceResponse overridden =
                NotificationPolicyOperations.toUserPrefResponse(optional, muted);
        assertTrue(overridden.muted());
        assertFalse(overridden.screenPopupEnabled());
        assertFalse(overridden.desktopOsEnabled());
        assertFalse(overridden.mobilePushEnabled());
        assertFalse(overridden.emailEnabled());
    }
}
