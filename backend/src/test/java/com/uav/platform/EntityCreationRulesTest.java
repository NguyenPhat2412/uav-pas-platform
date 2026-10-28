package com.uav.platform;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.uav.platform.modules.billing.entity.ServicePlan;
import com.uav.platform.modules.billing.service.impl.ServicePlanOperations;
import com.uav.platform.modules.billing.service.impl.UserQuotaOperations;
import com.uav.platform.modules.media.entity.MediaAsset;
import com.uav.platform.modules.mission.entity.Mission;
import com.uav.platform.modules.notification.enums.NotificationType;
import com.uav.platform.modules.notification.service.impl.NotificationOperations;
import com.uav.platform.modules.sar.enums.AiTaskStatus;
import com.uav.platform.modules.sar.enums.AiTaskType;
import com.uav.platform.modules.sar.enums.ProcessingNode;
import com.uav.platform.modules.sar.enums.SarStatus;
import com.uav.platform.modules.sar.service.impl.AiTaskOperations;
import com.uav.platform.modules.sar.service.impl.SarMissionOperations;
import com.uav.platform.modules.settings.service.impl.SystemConfigurationOperations;
import com.uav.platform.modules.user.entity.AppUser;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;

class EntityCreationRulesTest {
    @Test
    void planNormalizesOnlyNullableDefaultInputs() {
        var plan = ServicePlanOperations.create(null, null, null, null, null, null, null, null);

        assertNull(plan.getCode());
        assertNull(plan.getName());
        assertEquals(BigDecimal.ZERO, plan.getPrice());
        assertEquals("MONTHLY", plan.getBillingCycle());
        assertEquals(20.0, plan.getMaxMonthlyFlightHours());
        assertEquals(1, plan.getMaxConcurrentUavs());
        assertFalse(plan.getAllowSarAi());
        assertNull(plan.getDescription());
        assertTrue(plan.getActive());
    }

    @Test
    void planPreservesSuppliedValuesIncludingZeroAndFalse() {
        var price = new BigDecimal("12.50");
        var plan =
                ServicePlanOperations.create(
                        "TEST", "Test", price, "YEARLY", 0.0, 0, false, "note");

        assertEquals("TEST", plan.getCode());
        assertEquals("Test", plan.getName());
        assertSame(price, plan.getPrice());
        assertEquals("YEARLY", plan.getBillingCycle());
        assertEquals(0.0, plan.getMaxMonthlyFlightHours());
        assertEquals(0, plan.getMaxConcurrentUavs());
        assertFalse(plan.getAllowSarAi());
        assertEquals("note", plan.getDescription());
        assertTrue(plan.getActive());
        assertTrue(
                ServicePlanOperations.create("AI", "AI", price, "MONTHLY", 4.0, 2, true, null)
                        .getAllowSarAi());
    }

    @Test
    void quotaCopiesPlanLimitsAndUsesOneClockReadForItsCycle() {
        var user = mock(AppUser.class);
        var plan = ServicePlanOperations.create("TEST", "Test", null, null, 37.5, 4, null, null);
        // The cycle is exactly one billing period long, measured from a single clock read.
        var firstRead = LocalDateTime.of(2026, 1, 31, 23, 59, 59);
        var secondRead = LocalDateTime.of(2026, 2, 1, 0, 0);
        var expectedEnd = firstRead.plusMonths(1);
        try (var clock = mockStatic(LocalDateTime.class, CALLS_REAL_METHODS)) {
            clock.when(LocalDateTime::now).thenReturn(firstRead, secondRead);
            clock.clearInvocations();

            var quota = UserQuotaOperations.create(user, plan);

            assertSame(user, quota.getUser());
            assertSame(plan, quota.getPlan());
            assertEquals(0.0, quota.getFlightHoursUsed());
            assertEquals(37.5, quota.getFlightHoursLimit());
            assertEquals(0, quota.getConcurrentUavsUsed());
            assertEquals(4, quota.getConcurrentUavsLimit());
            assertEquals(firstRead, quota.getCycleStart());
            assertEquals(expectedEnd, quota.getCycleEnd());
            clock.verify(LocalDateTime::now, times(1));
        }
    }

    @Test
    void quotaPreservesNullPlanLimitsAndRejectsMissingPlanAsBefore() {
        var plan = new ServicePlan();
        plan.setMaxMonthlyFlightHours(null);
        plan.setMaxConcurrentUavs(null);

        var quota = UserQuotaOperations.create(null, plan);

        assertNull(quota.getUser());
        assertNull(quota.getFlightHoursLimit());
        assertNull(quota.getConcurrentUavsLimit());
        assertThrows(NullPointerException.class, () -> UserQuotaOperations.create(null, null));
    }

    @Test
    void aiTaskDefaultsNullOptionsAndStartsPending() {
        var task = AiTaskOperations.create(null, null, null, null, null);

        assertNull(task.getMission());
        assertNull(task.getMedia());
        assertEquals(AiTaskType.OBJECT_DETECTION_YOLOV8S, task.getTaskType());
        assertEquals(ProcessingNode.KV260_EDGE, task.getProcessingNode());
        assertEquals(0.75, task.getConfidenceThreshold());
        assertEquals(AiTaskStatus.PENDING, task.getStatus());
    }

    @Test
    void aiTaskPreservesSuppliedOptionsIncludingZeroConfidence() {
        var mission = mock(Mission.class);
        var media = mock(MediaAsset.class);
        var task =
                AiTaskOperations.create(
                        mission, media, AiTaskType.PERSON_SEARCH, ProcessingNode.CLOUD_GPU, 0.0);

        assertSame(mission, task.getMission());
        assertSame(media, task.getMedia());
        assertEquals(AiTaskType.PERSON_SEARCH, task.getTaskType());
        assertEquals(ProcessingNode.CLOUD_GPU, task.getProcessingNode());
        assertEquals(0.0, task.getConfidenceThreshold());
        assertEquals(AiTaskStatus.PENDING, task.getStatus());
    }

    @Test
    void sarMissionDefaultsNullOptionsAndStartsSearching() {
        var sar = SarMissionOperations.create(null, null, null, null, null, null, null, null);

        assertNull(sar.getMission());
        assertNull(sar.getSearchAreaPolygon());
        assertNull(sar.getLkpLatitude());
        assertNull(sar.getLkpLongitude());
        assertEquals(500.0, sar.getDriftRadiusMeters());
        assertNull(sar.getEmergencyContact());
        assertEquals(1, sar.getVictimCountEstimated());
        assertNull(sar.getNotes());
        assertEquals(SarStatus.SEARCHING, sar.getSarStatus());
    }

    @Test
    void sarMissionPreservesSuppliedValuesIncludingZeroOptions() {
        var mission = mock(Mission.class);
        var sar =
                SarMissionOperations.create(
                        mission, "polygon", 10.1, 20.2, 0.0, "contact", 0, "note");

        assertSame(mission, sar.getMission());
        assertEquals("polygon", sar.getSearchAreaPolygon());
        assertEquals(10.1, sar.getLkpLatitude());
        assertEquals(20.2, sar.getLkpLongitude());
        assertEquals(0.0, sar.getDriftRadiusMeters());
        assertEquals("contact", sar.getEmergencyContact());
        assertEquals(0, sar.getVictimCountEstimated());
        assertEquals("note", sar.getNotes());
        assertEquals(SarStatus.SEARCHING, sar.getSarStatus());
    }

    @Test
    void notificationDefaultsNullTypeAndStartsUnread() {
        var notification = NotificationOperations.create(null, null, null, null, null, null);

        assertNull(notification.getUser());
        assertNull(notification.getTitle());
        assertNull(notification.getContent());
        assertEquals(NotificationType.SYSTEM, notification.getType());
        assertNull(notification.getReferenceType());
        assertNull(notification.getReferenceId());
        assertFalse(notification.getIsRead());
    }

    @Test
    void notificationPreservesSuppliedValues() {
        var user = mock(AppUser.class);
        var notification =
                NotificationOperations.create(
                        user, "title", "content", NotificationType.PAYMENT, "INVOICE", 12L);

        assertSame(user, notification.getUser());
        assertEquals("title", notification.getTitle());
        assertEquals("content", notification.getContent());
        assertEquals(NotificationType.PAYMENT, notification.getType());
        assertEquals("INVOICE", notification.getReferenceType());
        assertEquals(12L, notification.getReferenceId());
        assertFalse(notification.getIsRead());
    }

    @Test
    void configurationDefaultsOnlyNullCategory() {
        var config = SystemConfigurationOperations.create(null, null, null, null, null);

        assertNull(config.getConfigKey());
        assertNull(config.getConfigValue());
        assertEquals("OPERATIONS", config.getCategory());
        assertNull(config.getDescription());
        assertNull(config.getUpdatedBy());
    }

    @Test
    void configurationPreservesSuppliedValuesIncludingEmptyCategory() {
        var config =
                SystemConfigurationOperations.create("key", "value", "", "description", "SYSTEM");

        assertEquals("key", config.getConfigKey());
        assertEquals("value", config.getConfigValue());
        assertEquals("", config.getCategory());
        assertEquals("description", config.getDescription());
        assertEquals("SYSTEM", config.getUpdatedBy());
    }
}
