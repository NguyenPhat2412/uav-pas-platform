package com.uav.platform.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.uav.platform.dao.IMissionDao;
import com.uav.platform.dao.IServicePlanDao;
import com.uav.platform.dto.record.PaymentAccountSettings;
import com.uav.platform.dto.response.BankTransferInstructionsResponse;
import com.uav.platform.dto.response.BankTransferStatusResponse;
import com.uav.platform.dto.response.InvoiceResponse;
import com.uav.platform.entity.Mission;
import com.uav.platform.entity.ServicePlan;
import com.uav.platform.enums.InvoiceStatus;
import com.uav.platform.error.SystemException;
import com.uav.platform.service.BillingService;
import com.uav.platform.service.PaymentSettingsService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

@ExtendWith(MockitoExtension.class)
class BankTransferServiceImplCoverageTest {

    @Mock private BillingService billing;
    @Mock private IServicePlanDao plans;
    @Mock private IMissionDao missions;
    @Mock private PaymentSettingsService paymentSettings;
    @Mock private Authentication auth;

    private BankTransferServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new BankTransferServiceImpl(billing, plans, missions, paymentSettings);
    }

    private PaymentAccountSettings configuredSettings() {
        return new PaymentAccountSettings(
                "970436", "Vietcombank", "0123456789", "CONG TY UAV PAS", new BigDecimal("0.08"));
    }

    private PaymentAccountSettings unconfiguredSettings() {
        return new PaymentAccountSettings("", "", "", "", new BigDecimal("0.08"));
    }

    @Test
    void configuredAndStatusReflectPaymentSettings() {
        when(paymentSettings.current()).thenReturn(configuredSettings());
        assertTrue(service.configured());
        BankTransferStatusResponse active = service.status();
        assertTrue(active.enabled());
        assertEquals("Vietcombank", active.bankName());

        when(paymentSettings.current()).thenReturn(unconfiguredSettings());
        assertFalse(service.configured());
        BankTransferStatusResponse inactive = service.status();
        assertFalse(inactive.enabled());
        assertNull(inactive.bankName());
    }

    @Test
    void instructionsThrowsWhenPaymentNotConfigured() {
        LocalDateTime now = LocalDateTime.of(2026, 5, 1, 10, 0);
        InvoiceResponse inv =
                new InvoiceResponse(
                        1L,
                        "INV-2026-001",
                        10L,
                        "alice",
                        null,
                        null,
                        null,
                        null,
                        new BigDecimal("1080000"),
                        InvoiceStatus.PENDING,
                        now.plusDays(7),
                        null,
                        null,
                        now);
        when(billing.getInvoice(1L, auth)).thenReturn(inv);
        when(paymentSettings.current()).thenReturn(unconfiguredSettings());

        SystemException ex =
                assertThrows(SystemException.class, () -> service.instructions(1L, auth));
        assertEquals("PAYMENT_UNAVAILABLE", ex.getCode());
    }

    @Test
    void instructionsForPendingMissionInvoiceBuildsQrAndComputesFlightHours() {
        LocalDateTime now = LocalDateTime.of(2026, 5, 1, 8, 0);
        InvoiceResponse inv =
                new InvoiceResponse(
                        2L,
                        "INV-2026-002",
                        10L,
                        "alice",
                        50L,
                        "Survey Bridge",
                        null,
                        null,
                        new BigDecimal("1080000"),
                        InvoiceStatus.PENDING,
                        now.plusDays(5),
                        null,
                        null,
                        now);
        Mission mission = new Mission();
        mission.setStartTime(now);
        mission.setExpectedEndTime(now.plusMinutes(90));

        when(billing.getInvoice(2L, auth)).thenReturn(inv);
        when(paymentSettings.current()).thenReturn(configuredSettings());
        when(missions.findById(50L)).thenReturn(Optional.of(mission));

        BankTransferInstructionsResponse resp = service.instructions(2L, auth);
        assertEquals(2L, resp.invoiceId());
        assertEquals("PENDING", resp.status());
        assertEquals("UAV INV INV2026002", resp.transferContent());
        assertNotNull(resp.qrPayload());
        assertEquals(new BigDecimal("1000000"), resp.subtotal());
        assertEquals(new BigDecimal("80000"), resp.vat());
        assertEquals(new BigDecimal("1080000"), resp.total());
        assertEquals("Survey Bridge", resp.itemName());
        assertEquals(1.5, resp.flightHours());
        assertEquals("MISSION", resp.kind());
    }

    @Test
    void instructionsForPaidPlanInvoiceSkipsQrAndReadsPlanHours() {
        LocalDateTime now = LocalDateTime.of(2026, 5, 1, 8, 0);
        InvoiceResponse inv =
                new InvoiceResponse(
                        3L,
                        "INV-2026-003",
                        10L,
                        "bob",
                        null,
                        null,
                        7L,
                        "Pro Monthly",
                        new BigDecimal("2160000"),
                        InvoiceStatus.PAID,
                        now.plusDays(5),
                        now,
                        null,
                        now);
        ServicePlan plan = new ServicePlan();
        plan.setMaxMonthlyFlightHours(40.0);

        when(billing.getInvoice(3L, auth)).thenReturn(inv);
        when(paymentSettings.current()).thenReturn(configuredSettings());
        when(plans.findById(7L)).thenReturn(Optional.of(plan));

        BankTransferInstructionsResponse resp = service.instructions(3L, auth);
        assertNull(resp.qrPayload());
        assertEquals("Pro Monthly", resp.itemName());
        assertEquals(40.0, resp.flightHours());
        assertEquals("PLAN", resp.kind());
    }

    @Test
    void instructionsForOtherInvoiceAndMissionMissingTimesReturnNullFlightHours() {
        LocalDateTime now = LocalDateTime.of(2026, 5, 1, 8, 0);
        InvoiceResponse other =
                new InvoiceResponse(
                        4L,
                        "INV-2026-004",
                        10L,
                        "carol",
                        null,
                        null,
                        null,
                        null,
                        new BigDecimal("540000"),
                        InvoiceStatus.CANCELLED,
                        now.plusDays(3),
                        null,
                        null,
                        now);
        when(billing.getInvoice(4L, auth)).thenReturn(other);
        when(paymentSettings.current()).thenReturn(configuredSettings());

        BankTransferInstructionsResponse otherResp = service.instructions(4L, auth);
        assertEquals("OTHER", otherResp.kind());
        assertNull(otherResp.flightHours());
        assertNull(otherResp.qrPayload());

        InvoiceResponse missionNoTimes =
                new InvoiceResponse(
                        5L,
                        "INV-2026-005",
                        10L,
                        "carol",
                        60L,
                        "No Times",
                        null,
                        null,
                        new BigDecimal("540000"),
                        InvoiceStatus.PENDING,
                        now.plusDays(3),
                        null,
                        null,
                        now);
        Mission m = new Mission();
        m.setStartTime(now);
        when(billing.getInvoice(5L, auth)).thenReturn(missionNoTimes);
        when(missions.findById(60L)).thenReturn(Optional.of(m));

        assertNull(service.instructions(5L, auth).flightHours());
    }
}
