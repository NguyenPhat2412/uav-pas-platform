package com.uav.platform.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.uav.platform.dao.IInvoiceDao;
import com.uav.platform.dao.IMissionDao;
import com.uav.platform.dao.IMissionEventDao;
import com.uav.platform.dao.IMissionMediaDao;
import com.uav.platform.dao.IUserDao;
import com.uav.platform.dao.IUserQuotaDao;
import com.uav.platform.dao.base.HibernateSpecification;
import com.uav.platform.dto.response.CustomerAnalyticsResponse;
import com.uav.platform.entity.AppUser;
import com.uav.platform.entity.Invoice;
import com.uav.platform.entity.Mission;
import com.uav.platform.entity.MissionEvent;
import com.uav.platform.entity.ServiceOffering;
import com.uav.platform.entity.ServicePlan;
import com.uav.platform.entity.UserQuota;
import com.uav.platform.enums.InvoiceStatus;
import com.uav.platform.enums.MissionEventType;
import com.uav.platform.enums.MissionStatus;
import com.uav.platform.error.SystemException;

import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

class CustomerAnalyticsServiceTest {

    @Test
    @SuppressWarnings("unchecked")
    void analyticsComputesCustomerKpisQuotaPipelineOutcomesTurnaroundAndUpcoming() {
        IUserDao users = mock(IUserDao.class);
        IMissionDao missions = mock(IMissionDao.class);
        IMissionEventDao events = mock(IMissionEventDao.class);
        IMissionMediaDao media = mock(IMissionMediaDao.class);
        IInvoiceDao invoices = mock(IInvoiceDao.class);
        IUserQuotaDao quotas = mock(IUserQuotaDao.class);

        AppUser customer = new AppUser();
        customer.setId(7L);
        customer.setUsername("cust1");
        when(users.findByUsername("cust1")).thenReturn(Optional.of(customer));

        LocalDateTime now = LocalDateTime.now();
        ServiceOffering svc = new ServiceOffering("SPRAY", "Agricultural Spraying", "Spray", 60);

        Mission completed = new Mission();
        completed.setId(101L);
        completed.setCode("MSN-101");
        completed.setTitle("Field Spray");
        completed.setStatus(MissionStatus.COMPLETED);
        completed.setService(svc);
        completed.setStartTime(now.minusHours(3));
        completed.setCompletedAt(now.minusHours(1));
        completed.setLatitude(new BigDecimal("21.0"));
        completed.setLongitude(new BigDecimal("105.8"));

        Mission failed = new Mission();
        failed.setId(102L);
        failed.setCode("MSN-102");
        failed.setStatus(MissionStatus.FAILED);
        failed.setFailureReason("High wind");
        failed.setUpdatedAt(now.minusDays(1));
        failed.setService(svc);

        Mission upcoming = new Mission();
        upcoming.setId(103L);
        upcoming.setCode("MSN-103");
        upcoming.setTitle("Survey Tomorrow");
        upcoming.setStatus(MissionStatus.READY);
        upcoming.setStartTime(now.plusDays(1));
        upcoming.setLocationName("Bac Ninh");

        Mission draft = new Mission();
        draft.setId(104L);
        draft.setStatus(MissionStatus.DRAFT);

        when(missions.findAll(any(HibernateSpecification.class)))
                .thenReturn(List.of(completed, failed, upcoming, draft));

        MissionEvent e1 =
                new MissionEvent(
                        completed,
                        MissionEventType.SUBMITTED,
                        customer,
                        MissionStatus.DRAFT,
                        MissionStatus.PENDING_CONFIRMATION,
                        null,
                        null);
        e1.setCreatedAt(now.minusHours(5));
        MissionEvent e2 =
                new MissionEvent(
                        completed,
                        MissionEventType.STATUS_CHANGED,
                        customer,
                        MissionStatus.PENDING_CONFIRMATION,
                        MissionStatus.CONFIRMED,
                        null,
                        null);
        e2.setCreatedAt(now.minusHours(4));
        MissionEvent e3 =
                new MissionEvent(
                        completed,
                        MissionEventType.COMPLETED,
                        customer,
                        MissionStatus.IN_PROGRESS,
                        MissionStatus.COMPLETED,
                        null,
                        null);
        e3.setCreatedAt(now.minusHours(1));
        when(events.findAll(any(HibernateSpecification.class))).thenReturn(List.of(e1, e2, e3));

        Invoice paid =
                new Invoice(
                        "INV-P",
                        customer,
                        completed,
                        null,
                        new BigDecimal("800000"),
                        now.plusDays(1),
                        null);
        paid.setStatus(InvoiceStatus.PAID);
        paid.setPaidAt(now.minusDays(1));

        Invoice pending =
                new Invoice(
                        "INV-U",
                        customer,
                        upcoming,
                        null,
                        new BigDecimal("350000"),
                        now.plusDays(5),
                        null);
        pending.setStatus(InvoiceStatus.PENDING);
        pending.setCreatedAt(now.minusHours(2));
        when(invoices.findByUserId(7L)).thenReturn(List.of(paid, pending));

        ServicePlan plan = new ServicePlan();
        plan.setName("Pro Fleet");
        UserQuota quota = new UserQuota();
        quota.setPlan(plan);
        quota.setFlightHoursUsed(5.0);
        quota.setFlightHoursLimit(20.0);
        quota.setCycleStart(now.minusDays(10));
        quota.setCycleEnd(now.plusDays(20));
        when(quotas.findByUserId(7L)).thenReturn(Optional.of(quota));
        when(media.count(any(HibernateSpecification.class))).thenReturn(12L);

        CustomerAnalyticsServiceImpl service =
                new CustomerAnalyticsServiceImpl(users, missions, events, media, invoices, quotas);

        CustomerAnalyticsResponse res =
                service.analytics(new UsernamePasswordAuthenticationToken("cust1", "N/A"));

        assertEquals(1, res.thisMonth().completedMissions());
        assertEquals(2.0, res.thisMonth().flightHours());
        assertEquals(new BigDecimal("800000"), res.thisMonth().spend());
        assertEquals(12L, res.mediaFiles());
        assertNotNull(res.quota());
        assertEquals("Pro Fleet", res.quota().planName());
        assertNotNull(res.quota().projectedDaysToLimit());
        assertEquals(1, res.pendingInvoices().count());
        assertEquals(1, res.topServices().size());
        assertEquals(1, res.upcoming().size());
        assertEquals(50.0, res.outcomes().successRate());
        assertEquals(1.0, res.turnaround().submitToConfirm());
        assertEquals(4.0, res.turnaround().submitToComplete());

        // Exhausted quota branch
        UserQuota exhausted = new UserQuota();
        exhausted.setFlightHoursUsed(10.0);
        exhausted.setFlightHoursLimit(10.0);
        assertEquals(
                0.0,
                CustomerAnalyticsServiceImpl.quota(exhausted, LocalDate.now())
                        .projectedDaysToLimit());

        // Missing user throws notFound
        when(users.findByUsername("missing")).thenReturn(Optional.empty());
        assertThrows(
                SystemException.class,
                () -> service.analytics(new UsernamePasswordAuthenticationToken("missing", "N/A")));
    }
}
