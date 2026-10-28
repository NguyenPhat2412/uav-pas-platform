package com.uav.platform.modules.billing.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.billing.entity.ServicePlan;
import com.uav.platform.modules.billing.entity.UserQuota;
import com.uav.platform.modules.billing.mapper.BillingMapper;
import com.uav.platform.modules.billing.repository.ServicePlanRepository;
import com.uav.platform.modules.billing.repository.UserQuotaRepository;
import com.uav.platform.modules.mission.entity.Mission;
import com.uav.platform.modules.mission.enums.MissionPriority;
import com.uav.platform.modules.mission.enums.MissionType;
import com.uav.platform.modules.mission.repository.MissionRepository;
import com.uav.platform.modules.mission.service.impl.MissionOperations;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.enums.UserStatus;
import com.uav.platform.modules.user.repository.UserRepository;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

class QuotaServiceImplTest {
    final UserQuotaRepository quotas = mock(UserQuotaRepository.class);
    final ServicePlanRepository plans = mock(ServicePlanRepository.class);
    final UserRepository users = mock(UserRepository.class);
    final MissionRepository missions = mock(MissionRepository.class);
    final QuotaServiceImpl service =
            new QuotaServiceImpl(
                    quotas,
                    plans,
                    users,
                    org.mapstruct.factory.Mappers.getMapper(BillingMapper.class),
                    missions,
                    null);
    final AppUser customer = new AppUser("customer", "c@quota.vn", "hash", null, UserStatus.ACTIVE);
    final ServicePlan basic = plan(1L, "BASIC", "0", "MONTHLY", 10.0);
    final ServicePlan pro = plan(2L, "PRO", "990000", "MONTHLY", 50.0);

    {
        customer.setId(5L);
        when(users.findByIdForUpdate(5L)).thenReturn(Optional.of(customer));
        when(plans.findByCode("BASIC")).thenReturn(Optional.of(basic));
        when(quotas.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    static ServicePlan plan(Long id, String code, String price, String cycle, double hours) {
        ServicePlan p = new ServicePlan();
        p.setId(id);
        p.setCode(code);
        p.setName(code);
        p.setPrice(new BigDecimal(price));
        p.setBillingCycle(cycle);
        p.setMaxMonthlyFlightHours(hours);
        p.setMaxConcurrentUavs(1);
        return p;
    }

    UserQuota quota(ServicePlan plan, double used, LocalDateTime start, LocalDateTime end) {
        UserQuota q = new UserQuota();
        q.setUser(customer);
        q.setPlan(plan);
        q.setFlightHoursUsed(used);
        q.setFlightHoursLimit(plan.getMaxMonthlyFlightHours());
        q.setConcurrentUavsLimit(1);
        q.setCycleStart(start);
        q.setCycleEnd(end);
        when(quotas.findByUserId(5L)).thenReturn(Optional.of(q));
        return q;
    }

    Mission open(LocalDateTime start, double hours) {
        Mission m =
                MissionOperations.draft(
                        customer,
                        MissionType.OTHER,
                        "Open",
                        null,
                        start.toLocalDate(),
                        start,
                        start.plusMinutes((long) (hours * 60)),
                        "Site",
                        null,
                        null,
                        MissionPriority.NORMAL,
                        null);
        m.setId((long) (Math.random() * 1_000_000) + 100);
        return m;
    }

    @Test
    void plannedHoursOfOpenMissionsCountAgainstTheQuota() {
        LocalDateTime now = LocalDateTime.now();
        quota(basic, 2.0, now.minusDays(1), now.plusDays(20));
        // 2 h used + 4 h + 3 h already booked: a 2 h mission still fits the 10 h plan, 2 h more do
        // not.
        when(missions.findByCustomerIdAndStatusNotIn(eq(5L), any()))
                .thenReturn(List.of(open(now.plusDays(1), 4), open(now.plusDays(2), 3)));
        assertDoesNotThrow(() -> service.checkCanSchedule(5L, 1.0, null));
        SystemException over =
                assertThrows(SystemException.class, () -> service.checkCanSchedule(5L, 1.5, null));
        assertEquals(HttpStatus.CONFLICT, over.getStatus());
        assertEquals("QUOTA_FLIGHT_HOURS_EXCEEDED", over.getCode());
        verify(users, atLeastOnce()).findByIdForUpdate(5L);
    }

    @Test
    void editingAMissionDoesNotCountItsOwnOldHoursTwice() {
        LocalDateTime now = LocalDateTime.now();
        quota(basic, 0.0, now.minusDays(1), now.plusDays(20));
        Mission edited = open(now.plusDays(1), 8);
        when(missions.findByCustomerIdAndStatusNotIn(eq(5L), any())).thenReturn(List.of(edited));
        assertThrows(SystemException.class, () -> service.checkCanSchedule(5L, 9.0, null));
        assertDoesNotThrow(() -> service.checkCanSchedule(5L, 9.0, edited.getId()));
    }

    @Test
    void endedCycleResetsUsedHoursAndAdvancesByPlanCycle() {
        LocalDateTime now = LocalDateTime.of(2026, 10, 28, 10, 0);
        UserQuota monthly =
                quota(
                        basic,
                        9.5,
                        LocalDateTime.of(2026, 8, 1, 0, 0),
                        LocalDateTime.of(2026, 9, 1, 0, 0));
        assertTrue(service.refresh(monthly, now));
        assertEquals(0.0, monthly.getFlightHoursUsed());
        assertEquals(LocalDateTime.of(2026, 10, 1, 0, 0), monthly.getCycleStart());
        assertEquals(LocalDateTime.of(2026, 11, 1, 0, 0), monthly.getCycleEnd());
        assertFalse(service.refresh(monthly, now), "idempotent");

        ServicePlan yearlyPlan = plan(3L, "GOV", "0", "YEARLY", 500.0);
        UserQuota yearly =
                quota(
                        yearlyPlan,
                        120.0,
                        LocalDateTime.of(2025, 10, 1, 0, 0),
                        LocalDateTime.of(2026, 10, 1, 0, 0));
        assertTrue(service.refresh(yearly, now));
        assertEquals(0.0, yearly.getFlightHoursUsed());
        assertEquals(LocalDateTime.of(2027, 10, 1, 0, 0), yearly.getCycleEnd());
    }

    @Test
    void runningCycleIsLeftAlone() {
        LocalDateTime now = LocalDateTime.of(2026, 10, 28, 10, 0);
        UserQuota q = quota(basic, 4.0, now.minusDays(3), now.plusDays(3));
        assertFalse(service.refresh(q, now));
        assertEquals(4.0, q.getFlightHoursUsed());
    }

    @Test
    void lapsedPaidPlanFallsBackToFreePlan() {
        LocalDateTime now = LocalDateTime.of(2026, 10, 28, 10, 0);
        UserQuota q = quota(pro, 30.0, now.minusDays(10), now.plusDays(20));
        q.setPlanPaidUntil(now.minusMinutes(1));
        assertTrue(service.refresh(q, now));
        assertEquals("BASIC", q.getPlan().getCode());
        assertEquals(10.0, q.getFlightHoursLimit());
        assertNull(q.getPlanPaidUntil());
        assertFalse(service.refresh(q, now), "idempotent");
    }

    @Test
    void paidInvoiceAppliesItsPlanEvenIfRetiredAndRenewalExtendsThePeriod() {
        LocalDateTime now = LocalDateTime.now();
        UserQuota q = quota(basic, 1.0, now.minusDays(1), now.plusDays(29));
        pro.setActive(false);
        service.applyPaidPlan(5L, pro);
        assertEquals("PRO", q.getPlan().getCode());
        assertEquals(50.0, q.getFlightHoursLimit());
        assertEquals(1.0, q.getFlightHoursUsed(), "used hours are kept");
        LocalDateTime firstPeriod = q.getPlanPaidUntil();
        assertNotNull(firstPeriod);
        assertTrue(firstPeriod.isAfter(now.plusDays(27)));

        service.applyPaidPlan(5L, pro);
        assertEquals(firstPeriod.plusMonths(1), q.getPlanPaidUntil(), "renewal stacks");
    }

    @Test
    void lazyRefreshRunsBeforeTheQuotaCheck() {
        LocalDateTime now = LocalDateTime.now();
        UserQuota q = quota(basic, 10.0, now.minusMonths(1).minusDays(2), now.minusDays(2));
        when(missions.findByCustomerIdAndStatusNotIn(eq(5L), any())).thenReturn(List.of());
        assertDoesNotThrow(() -> service.checkCanSchedule(5L, 5.0, null));
        assertEquals(0.0, q.getFlightHoursUsed());
    }

    @Test
    void rolloverJobRefreshesEveryDueQuota() {
        var manager = mock(org.springframework.transaction.PlatformTransactionManager.class);
        var job =
                new QuotaServiceImpl(
                        quotas,
                        plans,
                        users,
                        org.mapstruct.factory.Mappers.getMapper(BillingMapper.class),
                        missions,
                        manager);
        LocalDateTime now = LocalDateTime.now();
        UserQuota q = quota(basic, 7.0, now.minusMonths(2), now.minusMonths(1));
        when(quotas.dueForRollover(any(), any())).thenReturn(List.of(5L));
        job.rollOverDueQuotas();
        assertEquals(0.0, q.getFlightHoursUsed());
        assertTrue(q.getCycleEnd().isAfter(now));
        verify(quotas).save(q);
    }
}
