package com.uav.platform.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.audit.controller.AuditLogController;
import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.modules.billing.dto.request.PaymentIpnRequest;
import com.uav.platform.modules.billing.entity.Invoice;
import com.uav.platform.modules.billing.entity.PaymentTransaction;
import com.uav.platform.modules.billing.enums.InvoiceStatus;
import com.uav.platform.modules.billing.repository.InvoiceRepository;
import com.uav.platform.modules.billing.repository.PaymentTransactionRepository;
import com.uav.platform.modules.billing.repository.ServicePlanRepository;
import com.uav.platform.modules.billing.service.impl.BillingServiceImpl;
import com.uav.platform.modules.media.repository.MediaAssetRepository;
import com.uav.platform.modules.mission.entity.Mission;
import com.uav.platform.modules.mission.enums.MissionPriority;
import com.uav.platform.modules.mission.enums.MissionType;
import com.uav.platform.modules.mission.repository.MissionRepository;
import com.uav.platform.modules.mission.service.impl.MissionOperations;
import com.uav.platform.modules.permission.service.PermissionService;
import com.uav.platform.modules.reporting.service.impl.ReportServiceImpl;
import com.uav.platform.modules.sar.dto.request.VerifyDetectionRequest;
import com.uav.platform.modules.sar.entity.AiDetection;
import com.uav.platform.modules.sar.entity.SarMission;
import com.uav.platform.modules.sar.enums.SarStatus;
import com.uav.platform.modules.sar.repository.AiDetectionRepository;
import com.uav.platform.modules.sar.repository.AiTaskRepository;
import com.uav.platform.modules.sar.repository.SarMissionRepository;
import com.uav.platform.modules.sar.service.impl.AiServiceImpl;
import com.uav.platform.modules.sar.service.impl.SarMissionOperations;
import com.uav.platform.modules.sar.service.impl.SarServiceImpl;
import com.uav.platform.modules.station.repository.StationRepository;
import com.uav.platform.modules.uav.repository.UavRepository;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.enums.UserStatus;
import com.uav.platform.modules.user.repository.UserRepository;
import com.uav.platform.modules.webhook.entity.WebhookSubscription;
import com.uav.platform.modules.webhook.mapper.WebhookMapper;
import com.uav.platform.modules.webhook.service.impl.WebhookServiceImpl;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@ExtendWith(MockitoExtension.class)
class SecurityAuditHardeningTest {

    @Mock ServicePlanRepository planRepository;
    @Mock InvoiceRepository invoiceRepository;
    @Mock PaymentTransactionRepository paymentRepository;
    @Mock UserRepository userRepository;
    @Mock MissionRepository missionRepository;
    @Mock PermissionService permissionService;
    @Mock SarMissionRepository sarMissionRepository;
    @Mock AiTaskRepository aiTaskRepository;
    @Mock AiDetectionRepository aiDetectionRepository;
    @Mock MediaAssetRepository mediaAssetRepository;
    @Mock UavRepository uavRepository;
    @Mock StationRepository stationRepository;

    @Test
    void sec01_unauthenticatedIpnWithoutSignatureIsRejected() {
        BillingServiceImpl billingService =
                new BillingServiceImpl(
                        planRepository,
                        invoiceRepository,
                        paymentRepository,
                        userRepository,
                        missionRepository,
                        permissionService,
                        null,
                        null,
                        "isolated-test-fixture-key-not-real-provider-2026");
        configureProvider(billingService);
        org.springframework.test.util.ReflectionTestUtils.setField(
                billingService,
                "financialEvents",
                org.mockito.Mockito.mock(
                        com.uav.platform.modules.webhook.service.FinancialOutboxService.class));
        AppUser owner = user(1L, "customer1");
        Invoice invoice = invoice(10L, "INV-2026-0001", owner, new BigDecimal("500.00"));

        PaymentIpnRequest req =
                new PaymentIpnRequest(
                        "INV-2026-0001", 10L, "TXN-1", new BigDecimal("500.00"), "SUCCESS");

        SystemException ex =
                assertThrows(
                        SystemException.class,
                        () -> billingService.processPaymentIpn(req, null, null));

        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatus());
        assertEquals("IPN_SIGNATURE_INVALID", ex.getCode());
        assertEquals(InvoiceStatus.PENDING, invoice.getStatus());
        verify(paymentRepository, never()).save(any());
    }

    @Test
    void sec01_crossTenantAuthenticatedCustomerCannotSettleAnotherUsersInvoice() {
        BillingServiceImpl billingService =
                new BillingServiceImpl(
                        planRepository,
                        invoiceRepository,
                        paymentRepository,
                        userRepository,
                        missionRepository,
                        permissionService,
                        null,
                        null,
                        "isolated-test-fixture-key-not-real-provider-2026");
        configureProvider(billingService);
        org.springframework.test.util.ReflectionTestUtils.setField(
                billingService,
                "financialEvents",
                org.mockito.Mockito.mock(
                        com.uav.platform.modules.webhook.service.FinancialOutboxService.class));
        AppUser owner = user(1L, "customer1");
        AppUser attacker = user(2L, "customer2");
        Authentication attackerAuth = auth("customer2");
        Invoice invoice = invoice(10L, "INV-2026-0001", owner, new BigDecimal("500.00"));

        PaymentIpnRequest req =
                new PaymentIpnRequest(
                        "INV-2026-0001", 10L, "TXN-1", new BigDecimal("500.00"), "SUCCESS");

        SystemException ex =
                assertThrows(
                        SystemException.class,
                        () -> billingService.processPaymentIpn(req, null, attackerAuth));

        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatus());
        assertEquals("IPN_SIGNATURE_INVALID", ex.getCode());
        assertEquals(InvoiceStatus.PENDING, invoice.getStatus());
    }

    @Test
    void sec01_verifiedReplayIsIdempotentAndUnderpaymentIsRejected() {
        BillingServiceImpl billingService =
                new BillingServiceImpl(
                        planRepository,
                        invoiceRepository,
                        paymentRepository,
                        userRepository,
                        missionRepository,
                        permissionService,
                        null,
                        null,
                        "isolated-test-fixture-key-not-real-provider-2026");
        configureProvider(billingService);
        org.springframework.test.util.ReflectionTestUtils.setField(
                billingService,
                "financialEvents",
                org.mockito.Mockito.mock(
                        com.uav.platform.modules.webhook.service.FinancialOutboxService.class));
        AppUser owner = user(1L, "customer1");
        Invoice invoice = invoice(10L, "INV-2026-0001", owner, new BigDecimal("500.00"));
        when(invoiceRepository.findById(10L)).thenReturn(Optional.of(invoice));

        // 1. Underpayment rejected with 400
        PaymentIpnRequest underpaid =
                new PaymentIpnRequest(
                        "INV-2026-0001", 10L, "TXN-LOW", new BigDecimal("1.00"), "SUCCESS");
        SystemException underpayEx =
                assertThrows(
                        SystemException.class,
                        () ->
                                billingService.processPaymentIpn(
                                        underpaid,
                                        billingService.computeIpnSignature(underpaid),
                                        null));
        assertEquals(HttpStatus.BAD_REQUEST, underpayEx.getStatus());
        assertEquals("INVALID_PAYMENT_AMOUNT", underpayEx.getCode());
        // The refused transfer is kept as evidence (MISMATCH) without settling the invoice.
        assertEquals(InvoiceStatus.PENDING, invoice.getStatus());
        verify(paymentRepository)
                .save(argThat((PaymentTransaction t) -> "MISMATCH".equals(t.getStatus())));

        // 2. Full payment succeeds with valid provider HMAC
        PaymentIpnRequest fullPay =
                new PaymentIpnRequest(
                        "INV-2026-0001", 10L, "TXN-OK", new BigDecimal("500.00"), "SUCCESS");
        when(paymentRepository.save(any(PaymentTransaction.class)))
                .thenAnswer(
                        inv -> {
                            PaymentTransaction tx = inv.getArgument(0);
                            tx.setId(99L);
                            return tx;
                        });
        var res =
                billingService.processPaymentIpn(
                        fullPay, billingService.computeIpnSignature(fullPay), null);
        assertEquals("00", res.status());
        assertEquals(InvoiceStatus.PAID, invoice.getStatus());

        // 3. Exact provider replay returns the same transaction without a second write.
        var captured = ArgumentCaptor.forClass(PaymentTransaction.class);
        verify(paymentRepository, org.mockito.Mockito.times(2)).save(captured.capture());
        PaymentTransaction settled = captured.getAllValues().get(1);
        assertEquals("SUCCESS", settled.getStatus());
        when(paymentRepository.findByTransactionCode("TXN-OK")).thenReturn(Optional.of(settled));
        var replay =
                billingService.processPaymentIpn(
                        fullPay, billingService.computeIpnSignature(fullPay), null);
        assertEquals(res, replay);
        verify(paymentRepository, org.mockito.Mockito.times(2)).save(any());
    }

    private void configureProvider(BillingServiceImpl service) {
        org.springframework.test.util.ReflectionTestUtils.setField(
                service, "providerEnabled", true);
        var jdbc = mock(org.springframework.jdbc.core.JdbcTemplate.class);
        org.springframework.test.util.ReflectionTestUtils.setField(service, "billingJdbc", jdbc);
    }

    @Test
    void sec02_webhookMapperMasksSecretKeyInResponses() {
        WebhookSubscription sub =
                new WebhookSubscription(
                        "Emergency Center",
                        "https://hooks.partner.example.com/uav",
                        "vju_sec_live_88392019948",
                        "SAR_CRITICAL_ALERT,PAYMENT_COMPLETED");
        sub.setId(1L);

        var dto =
                org.mapstruct.factory.Mappers.getMapper(WebhookMapper.class)
                        .toSubscriptionResponse(sub);

        assertEquals("********9948", dto.secretKey());
        assertTrue(!dto.secretKey().contains("vju_sec_live"));
    }

    @Test
    void sec03_sarAndAiServicesBlockCrossTenantAccessAndUnauthorizedMutations() {
        SarServiceImpl sarService =
                new SarServiceImpl(
                        sarMissionRepository, missionRepository, null, null, permissionService);
        AiServiceImpl aiService =
                new AiServiceImpl(
                        aiTaskRepository,
                        aiDetectionRepository,
                        missionRepository,
                        mediaAssetRepository,
                        sarMissionRepository,
                        null,
                        null,
                        permissionService);

        AppUser customer1 = user(1L, "customer1");
        Mission mission =
                MissionOperations.draft(
                        customer1,
                        MissionType.OTHER,
                        "SAR Flood",
                        null,
                        LocalDate.now(),
                        LocalDateTime.now(),
                        LocalDateTime.now().plusHours(2),
                        "Yen Bai",
                        null,
                        null,
                        MissionPriority.URGENT,
                        null);
        mission.setId(100L);

        SarMission sar =
                SarMissionOperations.create(
                        mission,
                        "POLYGON((0 0, 1 0, 1 1, 0 0))",
                        21.7,
                        104.8,
                        1000.0,
                        "0901234567",
                        2,
                        "FLOOD");
        sar.setId(50L);

        AiDetection detection =
                new AiDetection(
                        null,
                        mission,
                        "person_distress",
                        0.95,
                        0.1,
                        0.1,
                        0.2,
                        0.2,
                        21.7,
                        104.8,
                        null);
        detection.setId(77L);

        Authentication strangerAuth = auth("customer2");
        when(permissionService.has(strangerAuth, "MISSION_VIEW_ALL")).thenReturn(false);
        when(permissionService.has(strangerAuth, "USER_MANAGE")).thenReturn(false);
        when(sarMissionRepository.findByMissionId(100L)).thenReturn(Optional.of(sar));
        when(aiDetectionRepository.findById(77L)).thenReturn(Optional.of(detection));

        // Cross-tenant read on SAR mission denied
        assertThrows(
                AccessDeniedException.class, () -> sarService.getByMissionId(100L, strangerAuth));

        // Cross-tenant verification on AI detection denied
        assertThrows(
                AccessDeniedException.class,
                () ->
                        aiService.verifyDetection(
                                77L, new VerifyDetectionRequest(true), strangerAuth));

        // Even the mission's own customer cannot mutate operational SAR status without
        // operator/commander authority
        Authentication ownerCustomerAuth = auth("customer1");
        when(permissionService.has(ownerCustomerAuth, "MISSION_VIEW_ALL")).thenReturn(false);
        when(permissionService.has(ownerCustomerAuth, "USER_MANAGE")).thenReturn(false);

        assertThrows(
                AccessDeniedException.class,
                () -> sarService.updateSarStatus(100L, SarStatus.RESCUED, ownerCustomerAuth));
    }

    @Test
    void sec04_ssrfProtectionRejectsLoopbackPrivateLinkLocalAndNonHttpUrls() {
        SystemException loopback =
                assertThrows(
                        SystemException.class,
                        () ->
                                WebhookServiceImpl.validateSafeWebhookUrl(
                                        "http://127.0.0.1:8080/actuator/env"));
        assertEquals("UNSAFE_WEBHOOK_URL", loopback.getCode());

        SystemException metadata =
                assertThrows(
                        SystemException.class,
                        () ->
                                WebhookServiceImpl.validateSafeWebhookUrl(
                                        "http://169.254.169.254/latest/meta-data/"));
        assertEquals("UNSAFE_WEBHOOK_URL", metadata.getCode());

        SystemException privateLan =
                assertThrows(
                        SystemException.class,
                        () ->
                                WebhookServiceImpl.validateSafeWebhookUrl(
                                        "http://192.168.1.10:9000/minio"));
        assertEquals("UNSAFE_WEBHOOK_URL", privateLan.getCode());

        SystemException internalDockerHost =
                assertThrows(
                        SystemException.class,
                        () ->
                                WebhookServiceImpl.validateSafeWebhookUrl(
                                        "http://minio:9000/uav-media"));
        assertEquals("UNSAFE_WEBHOOK_URL", internalDockerHost.getCode());

        SystemException fileScheme =
                assertThrows(
                        SystemException.class,
                        () -> WebhookServiceImpl.validateSafeWebhookUrl("file:///etc/passwd"));
        assertEquals("UNSAFE_WEBHOOK_URL", fileScheme.getCode());
    }

    @Test
    void sec05_reportSummaryScopesMissionsToAuthenticatedCustomerWhenNotCommander() {
        ReportServiceImpl reportService =
                new ReportServiceImpl(
                        missionRepository,
                        uavRepository,
                        stationRepository,
                        sarMissionRepository,
                        aiDetectionRepository,
                        permissionService);
        AppUser customer1 = user(1L, "customer1");
        AppUser customer2 = user(2L, "customer2");

        Mission m1 =
                MissionOperations.draft(
                        customer1,
                        MissionType.OTHER,
                        "M1",
                        null,
                        LocalDate.now(),
                        LocalDateTime.now(),
                        LocalDateTime.now().plusHours(1),
                        "HN",
                        null,
                        null,
                        MissionPriority.NORMAL,
                        null);
        m1.setId(1L);
        Mission m2 =
                MissionOperations.draft(
                        customer2,
                        MissionType.OTHER,
                        "M2",
                        null,
                        LocalDate.now(),
                        LocalDateTime.now(),
                        LocalDateTime.now().plusHours(2),
                        "HCM",
                        null,
                        null,
                        MissionPriority.HIGH,
                        null);
        m2.setId(2L);

        Authentication customer1Auth = auth("customer1");
        when(permissionService.has(customer1Auth, "MISSION_VIEW_ALL")).thenReturn(false);
        when(permissionService.has(customer1Auth, "USER_MANAGE")).thenReturn(false);
        when(missionRepository.findAll()).thenReturn(List.of(m1, m2));
        when(uavRepository.findAll()).thenReturn(List.of());
        when(stationRepository.count()).thenReturn(2L);
        when(sarMissionRepository.findAll()).thenReturn(List.of());
        when(aiDetectionRepository.findAll()).thenReturn(List.of());

        var report = reportService.getOperationsSummary(customer1Auth);

        assertEquals(1L, report.totalMissions());
    }

    @Test
    void sec06_controllersClampPageAndSizeParameters() {
        AuditLogService auditLogService = mock(AuditLogService.class);
        AuditLogController controller = new AuditLogController(auditLogService);

        controller.list(-5, 999999);

        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(auditLogService).findAll(captor.capture());
        assertEquals(0, captor.getValue().getPageNumber());
        assertEquals(100, captor.getValue().getPageSize());
    }

    private AppUser user(Long id, String username) {
        AppUser u = new AppUser(username, username + "@uav.vn", "hash", null, UserStatus.ACTIVE);
        u.setId(id);
        return u;
    }

    private Authentication auth(String username) {
        return UsernamePasswordAuthenticationToken.authenticated(username, "", List.of());
    }

    private Invoice invoice(Long id, String code, AppUser owner, BigDecimal amount) {
        Invoice inv =
                new Invoice(code, owner, null, null, amount, LocalDateTime.now().plusDays(7), null);
        inv.setId(id);
        return inv;
    }
}
