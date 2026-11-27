package com.uav.platform.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dao.IMissionDao;
import com.uav.platform.dao.IServicePlanDao;
import com.uav.platform.dao.IUserDao;
import com.uav.platform.dao.IUserQuotaDao;
import com.uav.platform.dto.request.UpdateQuotaRequest;
import com.uav.platform.dto.response.UserQuotaResponse;
import com.uav.platform.entity.AppUser;
import com.uav.platform.entity.Mission;
import com.uav.platform.entity.ServicePlan;
import com.uav.platform.entity.UserQuota;
import com.uav.platform.error.SystemException;
import com.uav.platform.mapper.BillingMapper;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.SimpleTransactionStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@ExtendWith(MockitoExtension.class)
class QuotaServiceImplCoverageTest {

    @Mock private IUserQuotaDao quotaRepository;
    @Mock private IServicePlanDao planRepository;
    @Mock private IUserDao userRepository;
    @Mock private BillingMapper billingMapper;
    @Mock private IMissionDao missionRepository;
    @Mock private PlatformTransactionManager transactionManager;
    @Mock private Authentication auth;

    private QuotaServiceImpl service;

    @BeforeEach
    void setUp() {
        service =
                new QuotaServiceImpl(
                        quotaRepository,
                        planRepository,
                        userRepository,
                        billingMapper,
                        missionRepository,
                        transactionManager);
    }

    private ServicePlan plan(
            Long id, String code, String cycle, BigDecimal price, double hours, boolean active) {
        ServicePlan p = new ServicePlan();
        p.setId(id);
        p.setCode(code);
        p.setName(code + " Plan");
        p.setBillingCycle(cycle);
        p.setPrice(price);
        p.setMaxMonthlyFlightHours(hours);
        p.setMaxConcurrentUavs(2);
        p.setActive(active);
        return p;
    }

    private AppUser user(Long id, String username) {
        AppUser u = new AppUser();
        u.setId(id);
        u.setUsername(username);
        return u;
    }

    private UserQuota quota(AppUser u, ServicePlan p, double used, double limit) {
        UserQuota q = new UserQuota();
        q.setUser(u);
        q.setPlan(p);
        q.setFlightHoursUsed(used);
        q.setFlightHoursLimit(limit);
        q.setConcurrentUavsLimit(p.getMaxConcurrentUavs());
        q.setCycleStart(LocalDateTime.now().minusDays(5));
        q.setCycleEnd(LocalDateTime.now().plusDays(25));
        return q;
    }

    @Test
    void getQuotaGetByUserIdListQuotasAndMissingDefaultPlan() {
        AppUser u = user(1L, "alice");
        ServicePlan basic = plan(1L, "BASIC", "MONTHLY", BigDecimal.ZERO, 20.0, true);
        UserQuota q = quota(u, basic, 2.0, 20.0);
        UserQuotaResponse resp = mock(UserQuotaResponse.class);

        when(auth.getName()).thenReturn("alice");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(u));
        when(userRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(u));
        when(quotaRepository.findByUserId(1L)).thenReturn(Optional.of(q));
        when(billingMapper.toQuotaResponse(q)).thenReturn(resp);

        assertSame(resp, service.getQuota(auth));
        assertSame(resp, service.getQuotaByUserId(1L));

        when(userRepository.findByUsername("ghost")).thenReturn(Optional.empty());
        when(auth.getName()).thenReturn("ghost");
        assertThrows(SystemException.class, () -> service.getQuota(auth));

        // Missing default plan throws conflict when creating quota
        when(quotaRepository.findByUserId(1L)).thenReturn(Optional.empty());
        when(planRepository.findByCode("BASIC")).thenReturn(Optional.empty());
        assertThrows(SystemException.class, () -> service.getQuotaByUserId(1L));

        // listQuotas delegates to findAll
        when(quotaRepository.findAll(PageRequest.of(0, 10))).thenReturn(new PageImpl<>(List.of(q)));
        PageResponse<UserQuotaResponse> page = service.listQuotas(PageRequest.of(0, 10));
        assertEquals(1, page.content().size());
    }

    @Test
    void updateQuotaCoversValidationCustomLimitPlanSwitchAndSamePlan() {
        AppUser u = user(2L, "bob");
        ServicePlan basic = plan(1L, "BASIC", "MONTHLY", BigDecimal.ZERO, 20.0, true);
        ServicePlan pro = plan(2L, "PRO", "MONTHLY", new BigDecimal("500000"), 100.0, true);
        ServicePlan retired = plan(3L, "OLD", "MONTHLY", BigDecimal.TEN, 50.0, false);

        UserQuota q = quota(u, basic, 5.0, 20.0);
        LocalDateTime paidUntil = LocalDateTime.now().plusDays(15);
        q.setPlanPaidUntil(paidUntil);
        UserQuotaResponse resp = mock(UserQuotaResponse.class);

        when(userRepository.findByIdForUpdate(2L)).thenReturn(Optional.of(u));
        when(quotaRepository.findByUserId(2L)).thenReturn(Optional.of(q));
        when(planRepository.findByCode("MISSING")).thenReturn(Optional.empty());
        assertThrows(
                SystemException.class,
                () -> service.updateQuota(2L, new UpdateQuotaRequest("MISSING", null)));

        when(planRepository.findByCode("OLD")).thenReturn(Optional.of(retired));
        assertThrows(
                SystemException.class,
                () -> service.updateQuota(2L, new UpdateQuotaRequest("OLD", 50.0)));

        // Switching plan clears planPaidUntil and applies custom limit
        when(planRepository.findByCode("PRO")).thenReturn(Optional.of(pro));
        when(quotaRepository.save(q)).thenReturn(q);
        when(billingMapper.toQuotaResponse(q)).thenReturn(resp);
        assertSame(resp, service.updateQuota(2L, new UpdateQuotaRequest("PRO", 150.0)));
        assertNull(q.getPlanPaidUntil());
        assertEquals(150.0, q.getFlightHoursLimit());

        // Re-saving same plan preserves planPaidUntil and uses plan default limit when request
        // limit is null
        q.setPlanPaidUntil(paidUntil);
        assertSame(resp, service.updateQuota(2L, new UpdateQuotaRequest("PRO", null)));
        assertEquals(paidUntil, q.getPlanPaidUntil());
        assertEquals(100.0, q.getFlightHoursLimit());
    }

    @Test
    void applyPaidPlanAndRefreshHandleFreeRenewalNullDatesAndRollover() {
        AppUser u = user(3L, "carol");
        ServicePlan basic = plan(1L, "BASIC", "MONTHLY", BigDecimal.ZERO, 20.0, true);
        ServicePlan yearlyPro = plan(2L, "PRO_Y", "YEARLY", new BigDecimal("5000000"), 200.0, true);
        UserQuota q = quota(u, basic, 10.0, 20.0);

        when(userRepository.findByIdForUpdate(3L)).thenReturn(Optional.of(u));
        when(quotaRepository.findByUserId(3L)).thenReturn(Optional.of(q));

        // Applying free plan sets planPaidUntil = null
        service.applyPaidPlan(3L, basic);
        assertNull(q.getPlanPaidUntil());

        // Applying paid yearly plan sets planPaidUntil = now + 1 year
        service.applyPaidPlan(3L, yearlyPro);
        assertNotNull(q.getPlanPaidUntil());
        LocalDateTime firstPaidUntil = q.getPlanPaidUntil();

        // Renewal extends from existing planPaidUntil
        service.applyPaidPlan(3L, yearlyPro);
        assertTrue(q.getPlanPaidUntil().isAfter(firstPaidUntil.plusMonths(11)));

        // refresh initializes null cycleStart/cycleEnd and advances expired cycles
        UserQuota uninit = new UserQuota();
        uninit.setPlan(yearlyPro);
        uninit.setFlightHoursUsed(12.0);
        uninit.setPlanPaidUntil(LocalDateTime.of(2026, 1, 1, 0, 0));
        when(planRepository.findByCode("BASIC")).thenReturn(Optional.of(basic));
        LocalDateTime now = LocalDateTime.of(2026, 3, 15, 12, 0);
        assertTrue(service.refresh(uninit, now));
        assertEquals(basic, uninit.getPlan());
        assertNull(uninit.getPlanPaidUntil());
        assertEquals(now, uninit.getCycleStart());
        assertEquals(now.plusMonths(1), uninit.getCycleEnd());

        // Expired cycle resets used hours
        uninit.setFlightHoursUsed(9.5);
        assertTrue(service.refresh(uninit, now.plusMonths(2)));
        assertEquals(0.0, uninit.getFlightHoursUsed());
    }

    @Test
    void rollOverDueQuotasCoversDisabledNullDueAndPerUserErrorIsolation() {
        ReflectionTestUtils.setField(service, "rolloverEnabled", false);
        service.rollOverDueQuotas();
        verifyNoInteractions(transactionManager);

        ReflectionTestUtils.setField(service, "rolloverEnabled", true);
        TransactionStatus status = new SimpleTransactionStatus();
        when(transactionManager.getTransaction(any())).thenReturn(status);

        // Null due list returns early
        when(quotaRepository.dueForRollover(any(), any())).thenReturn(null);
        service.rollOverDueQuotas();

        // Two due users: one succeeds, one fails with RuntimeException
        AppUser u1 = user(10L, "u1");
        ServicePlan basic = plan(1L, "BASIC", "MONTHLY", BigDecimal.ZERO, 20.0, true);
        UserQuota q1 = quota(u1, basic, 0.0, 20.0);
        when(quotaRepository.dueForRollover(any(), any())).thenReturn(List.of(10L, 11L));
        when(userRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(u1));
        when(quotaRepository.findByUserId(10L)).thenReturn(Optional.of(q1));
        when(userRepository.findByIdForUpdate(11L)).thenThrow(new IllegalStateException("db lock"));

        assertDoesNotThrow(() -> service.rollOverDueQuotas());
    }

    @Test
    void checkCanCreateScheduleAndRecordUsageValidateHoursAndLimits() {
        AppUser u = user(4L, "dave");
        ServicePlan basic = plan(1L, "BASIC", "MONTHLY", BigDecimal.ZERO, 10.0, true);
        UserQuota q = quota(u, basic, 4.0, 10.0);

        assertThrows(SystemException.class, () -> service.checkCanCreateMission(4L, -1.0));
        assertThrows(SystemException.class, () -> service.checkCanSchedule(4L, Double.NaN, null));
        assertThrows(SystemException.class, () -> service.recordMissionUsage(4L, -0.5));
        assertThrows(
                SystemException.class,
                () -> service.recordMissionUsage(4L, Double.POSITIVE_INFINITY));

        when(userRepository.findByIdForUpdate(4L)).thenReturn(Optional.of(u));
        when(quotaRepository.findByUserId(4L)).thenReturn(Optional.of(q));

        Mission open1 = new Mission();
        open1.setId(100L);
        open1.setStartTime(LocalDateTime.of(2026, 5, 1, 8, 0));
        open1.setExpectedEndTime(LocalDateTime.of(2026, 5, 1, 11, 0)); // 3h
        Mission open2 = new Mission();
        open2.setId(101L);
        open2.setStartTime(LocalDateTime.of(2026, 5, 2, 8, 0));
        open2.setExpectedEndTime(LocalDateTime.of(2026, 5, 2, 10, 0)); // 2h

        when(missionRepository.findByCustomerIdAndStatusNotIn(eq(4L), any()))
                .thenReturn(List.of(open1, open2));

        // 4 used + 5 reserved + 2 planned > 10 -> conflict
        SystemException ex =
                assertThrows(SystemException.class, () -> service.checkCanCreateMission(4L, 2.0));
        assertEquals("QUOTA_FLIGHT_HOURS_EXCEEDED", ex.getCode());

        // Excluding open1 (3h) leaves 4 + 2 + 2 = 8 <= 10 -> allowed
        assertDoesNotThrow(() -> service.checkCanSchedule(4L, 2.0, 100L));

        // Null limit bypasses check
        q.setFlightHoursLimit(null);
        assertDoesNotThrow(() -> service.checkCanSchedule(4L, 500.0, null));

        // recordMissionUsage increments used hours
        service.recordMissionUsage(4L, 2.5);
        assertEquals(6.5, q.getFlightHoursUsed());
    }
}
