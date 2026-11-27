package com.uav.platform.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.uav.platform.dao.IAuditLogDao;
import com.uav.platform.dao.IInvoiceDao;
import com.uav.platform.dao.IMaintenanceScheduleDao;
import com.uav.platform.dao.IMissionDao;
import com.uav.platform.dao.IUavDao;
import com.uav.platform.dao.IUserDao;
import com.uav.platform.dao.IUserQuotaDao;
import com.uav.platform.dao.IWebhookDeliveryLogDao;
import com.uav.platform.dao.base.HibernateSpecification;
import com.uav.platform.dto.response.AdminAnalyticsResponse;
import com.uav.platform.entity.AppUser;
import com.uav.platform.entity.AuditLog;
import com.uav.platform.entity.Invoice;
import com.uav.platform.entity.MaintenanceSchedule;
import com.uav.platform.entity.Mission;
import com.uav.platform.entity.Station;
import com.uav.platform.entity.Uav;
import com.uav.platform.entity.UserQuota;
import com.uav.platform.entity.WebhookDeliveryLog;
import com.uav.platform.entity.WebhookSubscription;
import com.uav.platform.enums.InvoiceStatus;
import com.uav.platform.enums.MissionStatus;
import com.uav.platform.enums.UavStatus;
import com.uav.platform.service.PermissionService;

import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

class AdminAnalyticsServiceTest {

    @Test
    @SuppressWarnings("unchecked")
    void analyticsComputesKpisChartsHeatmapsQuotaWarningsAndAlerts() {
        IMissionDao missions = mock(IMissionDao.class);
        IUavDao uavs = mock(IUavDao.class);
        IUserDao users = mock(IUserDao.class);
        IInvoiceDao invoices = mock(IInvoiceDao.class);
        IUserQuotaDao quotas = mock(IUserQuotaDao.class);
        IMaintenanceScheduleDao schedules = mock(IMaintenanceScheduleDao.class);
        IAuditLogDao audit = mock(IAuditLogDao.class);
        IWebhookDeliveryLogDao webhookLogs = mock(IWebhookDeliveryLogDao.class);
        PermissionService permissions = mock(PermissionService.class);

        when(permissions.has(any(), anyString())).thenReturn(true);

        LocalDateTime now = LocalDateTime.now();
        Station station = new Station();
        station.setName("Station North");

        Mission completedCurrent = new Mission();
        completedCurrent.setCode("MSN-001");
        completedCurrent.setStatus(MissionStatus.COMPLETED);
        completedCurrent.setStartTime(now.minusHours(3));
        completedCurrent.setCompletedAt(now.minusHours(1));
        completedCurrent.setCreatedAt(now.minusHours(4));
        completedCurrent.setStation(station);
        completedCurrent.setLatitude(new BigDecimal("21.0285"));
        completedCurrent.setLongitude(new BigDecimal("105.8542"));

        Mission failedCurrent = new Mission();
        failedCurrent.setCode("MSN-002");
        failedCurrent.setStatus(MissionStatus.CANCELLED);
        failedCurrent.setCancelledAt(now.minusHours(2));
        failedCurrent.setCreatedAt(now.minusHours(5));

        Mission failedFallbackUpdated = new Mission();
        failedFallbackUpdated.setCode("MSN-003");
        failedFallbackUpdated.setStatus(MissionStatus.FAILED);
        failedFallbackUpdated.setUpdatedAt(now.minusDays(10));
        failedFallbackUpdated.setCreatedAt(now.minusDays(10));

        when(missions.findAll(any(HibernateSpecification.class)))
                .thenReturn(List.of(completedCurrent, failedCurrent, failedFallbackUpdated));
        when(missions.count(any(HibernateSpecification.class))).thenReturn(2L);

        Invoice paidInv =
                new Invoice(
                        "INV-1",
                        null,
                        null,
                        null,
                        new BigDecimal("1500000"),
                        now.plusDays(1),
                        null);
        paidInv.setStatus(InvoiceStatus.PAID);
        paidInv.setPaidAt(now.minusHours(1));
        paidInv.setCreatedAt(now.minusHours(2));

        Invoice pendingInv =
                new Invoice(
                        "INV-2",
                        null,
                        null,
                        null,
                        new BigDecimal("500000"),
                        now.minusHours(5),
                        null);
        pendingInv.setStatus(InvoiceStatus.PENDING);
        pendingInv.setCreatedAt(now.minusDays(1));

        when(invoices.findAll(any(HibernateSpecification.class)))
                .thenReturn(List.of(paidInv), List.of(paidInv, pendingInv));
        when(invoices.count(any(HibernateSpecification.class))).thenReturn(1L);
        when(users.count(any(HibernateSpecification.class))).thenReturn(4L);

        Uav busyUav = new Uav();
        busyUav.setStatus(UavStatus.IN_USE);
        when(uavs.findAll()).thenReturn(List.of(busyUav));

        MaintenanceSchedule overdue = new MaintenanceSchedule();
        overdue.setActive(true);
        overdue.setNextDueDate(LocalDate.now().minusDays(2));
        MaintenanceSchedule dueSoon = new MaintenanceSchedule();
        dueSoon.setActive(true);
        dueSoon.setNextDueDate(LocalDate.now().plusDays(3));
        MaintenanceSchedule inactive = new MaintenanceSchedule();
        inactive.setActive(false);
        when(schedules.findAll()).thenReturn(List.of(overdue, dueSoon, inactive));

        AuditLog logEntry =
                new AuditLog(
                        1L,
                        "admin",
                        com.uav.platform.enums.AuditAction.CREATE,
                        "MISSION",
                        "1",
                        "ok");
        logEntry.setCreatedAt(now);
        AuditLog nullTsLog =
                new AuditLog(
                        1L,
                        "admin",
                        com.uav.platform.enums.AuditAction.UPDATE,
                        "MISSION",
                        "2",
                        "ok");
        when(audit.findAll(any(HibernateSpecification.class)))
                .thenReturn(List.of(logEntry, nullTsLog));

        WebhookSubscription sub = new WebhookSubscription();
        sub.setName("ERP Hook");
        WebhookDeliveryLog okLog = new WebhookDeliveryLog();
        okLog.setSubscription(sub);
        okLog.setIsSuccess(true);
        okLog.setAttemptedAt(now.minusMinutes(10));
        WebhookDeliveryLog fail1 = new WebhookDeliveryLog();
        fail1.setSubscription(sub);
        fail1.setIsSuccess(false);
        fail1.setAttemptedAt(now.minusMinutes(5));
        WebhookDeliveryLog fail2 = new WebhookDeliveryLog();
        fail2.setIsSuccess(false);
        fail2.setAttemptedAt(now.minusMinutes(4));
        WebhookDeliveryLog fail3 = new WebhookDeliveryLog();
        fail3.setIsSuccess(false);
        fail3.setAttemptedAt(now.minusMinutes(3));
        when(webhookLogs.findAll(any(HibernateSpecification.class)))
                .thenReturn(List.of(okLog, fail1, fail2, fail3));

        AppUser heavyUser = new AppUser();
        heavyUser.setId(99L);
        heavyUser.setUsername("heavy_customer");
        UserQuota nearLimit = new UserQuota();
        nearLimit.setUser(heavyUser);
        nearLimit.setFlightHoursUsed(9.0);
        nearLimit.setFlightHoursLimit(10.0);
        UserQuota lowUsage = new UserQuota();
        lowUsage.setFlightHoursUsed(1.0);
        lowUsage.setFlightHoursLimit(10.0);
        when(quotas.findAll()).thenReturn(List.of(nearLimit, lowUsage));

        AdminAnalyticsServiceImpl service =
                new AdminAnalyticsServiceImpl(
                        missions,
                        uavs,
                        users,
                        invoices,
                        quotas,
                        schedules,
                        audit,
                        webhookLogs,
                        permissions);

        Authentication auth = new UsernamePasswordAuthenticationToken("admin", "N/A");
        AdminAnalyticsResponse res = service.analytics(14, auth);

        assertEquals(1, res.current().completedMissions());
        assertEquals(2, res.current().failedMissions());
        assertEquals(2.0, res.current().flightHours());
        assertEquals(33.3, res.current().successRate());
        assertEquals(new BigDecimal("1500000"), res.current().revenue());
        assertEquals(1, res.flightHoursByStation().size());
        assertEquals("Station North", res.flightHoursByStation().get(0).name());
        assertEquals(1, res.missionLocations().size());
        assertEquals(6, res.revenueByMonth().size());
        assertEquals(1, res.quotaWarnings().size());
        assertEquals(6, res.alerts().size());
        assertEquals(2, res.webhooks().size());
    }

    @Test
    void analyticsRespectsDeniedPermissions() {
        PermissionService permissions = mock(PermissionService.class);
        when(permissions.has(any(), anyString())).thenReturn(false);

        AdminAnalyticsServiceImpl service =
                new AdminAnalyticsServiceImpl(
                        mock(IMissionDao.class),
                        mock(IUavDao.class),
                        mock(IUserDao.class),
                        mock(IInvoiceDao.class),
                        mock(IUserQuotaDao.class),
                        mock(IMaintenanceScheduleDao.class),
                        mock(IAuditLogDao.class),
                        mock(IWebhookDeliveryLogDao.class),
                        permissions);

        AdminAnalyticsResponse res =
                service.analytics(1, new UsernamePasswordAuthenticationToken("viewer", "N/A"));
        assertEquals(0, res.current().completedMissions());
        assertTrue(res.fleet().isEmpty());
        assertTrue(res.revenueByMonth().isEmpty());
        assertTrue(res.quotaWarnings().isEmpty());
        assertTrue(res.alerts().isEmpty());
    }
}
