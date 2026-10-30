package com.uav.platform.modules.billing.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.uav.platform.modules.billing.dto.response.PlanStatsResponse;
import com.uav.platform.modules.billing.dto.response.PlanStatsResponse.MonthRow;
import com.uav.platform.modules.billing.dto.response.PlanStatsResponse.PlanRow;
import com.uav.platform.modules.billing.entity.Invoice;
import com.uav.platform.modules.billing.entity.ServicePlan;
import com.uav.platform.modules.billing.entity.UserQuota;
import com.uav.platform.modules.billing.enums.InvoiceStatus;
import com.uav.platform.modules.billing.repository.InvoiceRepository;
import com.uav.platform.modules.billing.repository.ServicePlanRepository;
import com.uav.platform.modules.billing.repository.UserQuotaRepository;
import com.uav.platform.modules.mission.entity.Mission;
import com.uav.platform.modules.mission.enums.MissionPriority;
import com.uav.platform.modules.mission.enums.MissionType;
import com.uav.platform.modules.mission.repository.MissionRepository;
import com.uav.platform.modules.mission.service.impl.MissionOperations;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.enums.UserRole;
import com.uav.platform.modules.user.enums.UserStatus;
import com.uav.platform.modules.user.repository.UserRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/** Aggregation math of the admin plan statistics against H2, with a fixed clock. */
@SpringBootTest(
        properties =
                "spring.datasource.url=jdbc:h2:mem:plan_stats;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE")
class PlanStatisticsIntegrationTest {
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 3, 15, 10, 0);

    @Autowired ServicePlanRepository plans;
    @Autowired UserQuotaRepository quotas;
    @Autowired InvoiceRepository invoices;
    @Autowired UserRepository users;
    @Autowired JdbcTemplate db;
    @Autowired MissionRepository missionRepository;
    @Autowired WebApplicationContext context;

    private PlanStatisticsServiceImpl service;
    private ServicePlan basic;
    private ServicePlan pro;
    private ServicePlan yearly;
    private ServicePlan legacy;

    @BeforeEach
    void setUp() {
        db.update("DELETE FROM payment_transactions");
        db.update("DELETE FROM invoices");
        db.update("DELETE FROM mission_billing_jobs");
        db.update("DELETE FROM user_quotas");
        db.update("DELETE FROM service_plans");
        service = new PlanStatisticsServiceImpl(plans, quotas, invoices);
        basic = plan("BASIC", "0", "MONTHLY", true);
        pro = plan("PRO", "300000", "MONTHLY", true);
        yearly = plan("ENTERPRISE", "1200000", "YEARLY", true);
        legacy = plan("LEGACY", "500000", "MONTHLY", false);
    }

    @Test
    void summaryCountsPayingCustomersMrrUsageAndInvoices() {
        seed();
        PlanStatsResponse stats = service.stats(6, NOW);
        var s = stats.summary();
        assertEquals(6, s.totalCustomers());
        // Paid plan and paid through now: two PRO and the yearly customer.
        assertEquals(3, s.payingCustomers());
        assertEquals(3, s.freeCustomers());
        // 2 x 300 000 monthly + 1 200 000 / 12 yearly.
        assertMoney("700000", s.mrr());
        assertMoney("750000", s.revenueThisMonth());
        assertMoney("1200000", s.revenueLastMonth());
        assertMoney("600000", s.planRevenueThisMonth());
        assertMoney("150000", s.missionRevenueThisMonth());
        // Pending includes the overdue one; the cancelled invoice counts nowhere.
        assertEquals(2, s.pendingInvoices().count());
        assertMoney("380000", s.pendingInvoices().amount());
        assertEquals(1, s.overdueInvoices().count());
        assertMoney("80000", s.overdueInvoices().amount());
        assertEquals(2, s.nearLimitCustomers());
        assertEquals(1, s.expiringSoon());
    }

    @Test
    void everyPlanIsListedIncludingInactiveAndFreeOnes() {
        seed();
        List<PlanRow> rows = service.stats(6, NOW).plans();
        assertEquals(
                List.of("BASIC", "PRO", "LEGACY", "ENTERPRISE"),
                rows.stream().map(PlanRow::code).toList());

        PlanRow free = row(rows, "BASIC");
        assertEquals(1, free.subscribers());
        assertEquals(0, free.payingSubscribers());
        assertMoney("0", free.revenueTotal());

        PlanRow p = row(rows, "PRO");
        assertEquals(3, p.subscribers());
        assertEquals(2, p.payingSubscribers());
        assertEquals(50.0, p.sharePercent());
        // (90 + 40 + 0) / 3 percent.
        assertEquals(43.3, p.avgUsagePercent());
        assertEquals(1, p.nearLimit());
        assertEquals(1, p.expiringSoon());
        assertEquals(1, p.pendingInvoices().count());
        assertMoney("300000", p.pendingInvoices().amount());
        assertEquals(0, p.overdueInvoices().count());
        assertMoney("600000", p.revenueThisMonth());
        assertMoney("900000", p.revenueTotal());

        PlanRow y = row(rows, "ENTERPRISE");
        assertEquals("YEARLY", y.billingCycle());
        assertEquals(1, y.payingSubscribers());
        assertEquals(1, y.nearLimit());
        assertMoney("1200000", y.revenueTotal());
        assertMoney("0", y.revenueThisMonth());

        PlanRow old = row(rows, "LEGACY");
        assertFalse(old.active());
        assertEquals(1, old.subscribers());
        // Its paid period lapsed yesterday.
        assertEquals(0, old.payingSubscribers());
        assertEquals(0, old.expiringSoon());
    }

    @Test
    void monthlySeriesIsOldestFirstAndFillsEmptyMonthsWithZero() {
        seed();
        List<MonthRow> months = service.stats(6, NOW).monthly();
        assertEquals(
                List.of("2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03"),
                months.stream().map(MonthRow::month).toList());

        MonthRow october = months.get(0);
        assertMoney("0", october.total());
        assertMoney("0", october.missionRevenue());
        assertEquals(0, october.newSubscriptions());
        assertEquals(
                List.of("BASIC", "PRO", "LEGACY", "ENTERPRISE"),
                List.copyOf(october.byPlan().keySet()));
        october.byPlan().values().forEach(amount -> assertMoney("0", amount));

        assertMoney("50000", months.get(2).total());
        assertMoney("50000", months.get(2).missionRevenue());

        assertMoney("300000", months.get(3).byPlan().get("PRO"));
        assertEquals(1, months.get(3).newSubscriptions());

        assertMoney("1200000", months.get(4).byPlan().get("ENTERPRISE"));
        assertEquals(1, months.get(4).newSubscriptions());

        MonthRow march = months.get(5);
        assertMoney("750000", march.total());
        assertMoney("600000", march.byPlan().get("PRO"));
        assertMoney("150000", march.missionRevenue());
        // The PRO renewal is not a new subscription; the other PRO customer's first payment is.
        assertEquals(1, march.newSubscriptions());
    }

    @Test
    void monthsAreClampedBetweenOneAndTwentyFour() {
        seed();
        assertEquals(
                List.of("2026-03"),
                service.stats(0, NOW).monthly().stream().map(MonthRow::month).toList());
        List<MonthRow> longest = service.stats(99, NOW).monthly();
        assertEquals(24, longest.size());
        assertEquals("2024-04", longest.get(0).month());
        assertEquals(
                List.of("2026-01", "2026-02", "2026-03"),
                service.stats(3, NOW).monthly().stream().map(MonthRow::month).toList());
    }

    @Test
    void nearLimitListsTheHighestUsageFirst() {
        seed();
        var near = service.stats(6, NOW).nearLimit();
        assertEquals(2, near.size());
        assertEquals("PRO", near.get(0).planCode());
        assertEquals(90.0, near.get(0).percent());
        assertEquals(18.0, near.get(0).usedHours());
        assertEquals(20.0, near.get(0).limitHours());
        assertEquals("ENTERPRISE", near.get(1).planCode());
        assertEquals(80.0, near.get(1).percent());
    }

    @Test
    void anEmptyCatalogOfCustomersYieldsZeros() {
        PlanStatsResponse stats = service.stats(2, NOW);
        assertEquals(0, stats.summary().totalCustomers());
        assertMoney("0", stats.summary().mrr());
        assertEquals(4, stats.plans().size());
        assertEquals(0.0, stats.plans().get(0).sharePercent());
        assertEquals(0.0, stats.plans().get(0).avgUsagePercent());
        assertTrue(stats.nearLimit().isEmpty());
        assertEquals(2, stats.monthly().size());
    }

    @Test
    void yearlyPlansCountOneTwelfthOfTheirPrice() {
        assertMoney("100000", PlanStatisticsServiceImpl.monthlyPrice(yearly));
        assertMoney("300000", PlanStatisticsServiceImpl.monthlyPrice(pro));
        assertMoney("0", PlanStatisticsServiceImpl.monthlyPrice(basic));
    }

    @Test
    void endpointRequiresUserManagePermission() throws Exception {
        var mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        AppUser admin = user(UserRole.ROLE_ADMIN);
        AppUser operator = user(UserRole.ROLE_OPERATOR);
        mvc.perform(
                        get("/api/v1/billing/admin/plans/stats?months=3")
                                .with(auth(admin, "ROLE_ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.summary.totalCustomers").value(0))
                .andExpect(jsonPath("$.monthly.length()").value(3))
                .andExpect(jsonPath("$.plans.length()").value(4));
        mvc.perform(get("/api/v1/billing/admin/plans/stats").with(auth(operator, "ROLE_OPERATOR")))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/billing/admin/plans/stats")).andExpect(status().isUnauthorized());
    }

    /** Six customers and their invoices around {@link #NOW}. */
    @Test
    void missionInvoicesCarryingThePlanCountAsMissionRevenue() {
        AppUser customer = user(UserRole.ROLE_PILOT);
        quota(customer, pro, 0, 20, NOW.plusDays(20));
        paid(customer, pro, "300000", LocalDateTime.of(2026, 3, 2, 9, 0));
        Mission mission =
                MissionOperations.draft(
                        customer,
                        MissionType.UAV_RENTAL,
                        "Billed flight",
                        null,
                        NOW.toLocalDate(),
                        NOW,
                        NOW.plusHours(1),
                        "Site",
                        null,
                        null,
                        MissionPriority.NORMAL,
                        null);
        mission.setCode("MSN-PS-" + UUID.randomUUID().toString().substring(0, 8));
        mission = missionRepository.save(mission);
        Invoice usage =
                new Invoice(
                        "PS-" + UUID.randomUUID().toString().substring(0, 12),
                        customer,
                        mission,
                        pro,
                        new BigDecimal("500000"),
                        NOW.plusDays(7),
                        null);
        usage.setStatus(InvoiceStatus.PAID);
        usage.setPaidAt(LocalDateTime.of(2026, 3, 6, 9, 0));
        invoices.save(usage);

        PlanStatsResponse stats = service.stats(6, NOW);
        assertMoney("300000", stats.summary().planRevenueThisMonth());
        assertMoney("500000", stats.summary().missionRevenueThisMonth());
        assertMoney("300000", row(stats.plans(), "PRO").revenueThisMonth());
        var march = stats.monthly().get(stats.monthly().size() - 1);
        assertMoney("500000", march.missionRevenue());
        assertEquals(1, march.newSubscriptions());
    }

    private void seed() {
        AppUser free = user(UserRole.ROLE_PILOT);
        AppUser busy = user(UserRole.ROLE_PILOT);
        AppUser expiring = user(UserRole.ROLE_PILOT);
        AppUser annual = user(UserRole.ROLE_PILOT);
        AppUser lapsed = user(UserRole.ROLE_PILOT);
        AppUser assigned = user(UserRole.ROLE_PILOT);
        quota(free, basic, 2, 20, null);
        quota(busy, pro, 18, 20, NOW.plusDays(20));
        quota(expiring, pro, 8, 20, NOW.plusDays(3));
        quota(annual, yearly, 80, 100, NOW.plusDays(200));
        quota(lapsed, legacy, 0, 10, NOW.minusDays(1));
        // Admin-assigned paid plan without a paid period: not paying.
        quota(assigned, pro, 0, 20, null);

        paid(busy, pro, "300000", LocalDateTime.of(2026, 1, 10, 9, 0));
        paid(busy, pro, "300000", LocalDateTime.of(2026, 3, 2, 9, 0));
        paid(expiring, pro, "300000", LocalDateTime.of(2026, 3, 5, 9, 0));
        paid(annual, yearly, "1200000", LocalDateTime.of(2026, 2, 20, 9, 0));
        paid(free, null, "150000", LocalDateTime.of(2026, 3, 10, 9, 0));
        paid(free, null, "50000", LocalDateTime.of(2025, 12, 20, 9, 0));
        invoice(assigned, pro, "300000", InvoiceStatus.PENDING, NOW.plusDays(5));
        invoice(free, null, "80000", InvoiceStatus.PENDING, NOW.minusDays(2));
        invoice(expiring, pro, "999", InvoiceStatus.CANCELLED, NOW.minusDays(9));
    }

    private ServicePlan plan(String code, String price, String cycle, boolean active) {
        ServicePlan p = new ServicePlan();
        p.setCode(code);
        p.setName(code);
        p.setPrice(new BigDecimal(price));
        p.setBillingCycle(cycle);
        p.setActive(active);
        return plans.save(p);
    }

    private AppUser user(UserRole role) {
        String s = UUID.randomUUID().toString().substring(0, 8);
        return users.save(
                new AppUser(
                        "ps_" + s,
                        "ps_" + s + "@example.invalid",
                        "synthetic-placeholder",
                        null,
                        null,
                        null,
                        null,
                        role,
                        UserStatus.ACTIVE));
    }

    private void quota(
            AppUser user, ServicePlan plan, double used, double limit, LocalDateTime paidUntil) {
        UserQuota q = new UserQuota();
        q.setUser(user);
        q.setPlan(plan);
        q.setFlightHoursUsed(used);
        q.setFlightHoursLimit(limit);
        q.setCycleStart(NOW.minusDays(10));
        q.setCycleEnd(NOW.plusDays(20));
        q.setPlanPaidUntil(paidUntil);
        quotas.save(q);
    }

    private void paid(AppUser user, ServicePlan plan, String amount, LocalDateTime paidAt) {
        Invoice i = invoice(user, plan, amount, InvoiceStatus.PAID, paidAt.plusDays(7));
        i.setPaidAt(paidAt);
        invoices.save(i);
    }

    private Invoice invoice(
            AppUser user,
            ServicePlan plan,
            String amount,
            InvoiceStatus status,
            LocalDateTime due) {
        Invoice i =
                new Invoice(
                        "PS-" + UUID.randomUUID().toString().substring(0, 12),
                        user,
                        null,
                        plan,
                        new BigDecimal(amount),
                        due,
                        null);
        i.setStatus(status);
        return invoices.save(i);
    }

    private static PlanRow row(List<PlanRow> rows, String code) {
        return rows.stream().filter(r -> r.code().equals(code)).findFirst().orElseThrow();
    }

    private static void assertMoney(String expected, BigDecimal actual) {
        assertNotNull(actual);
        assertEquals(
                0,
                new BigDecimal(expected).compareTo(actual),
                () -> "expected " + expected + " but was " + actual);
    }

    private static org.springframework.test.web.servlet.request.RequestPostProcessor auth(
            AppUser user, String role) {
        return authentication(
                new UsernamePasswordAuthenticationToken(
                        user.getUsername(), null, List.of(new SimpleGrantedAuthority(role))));
    }
}
