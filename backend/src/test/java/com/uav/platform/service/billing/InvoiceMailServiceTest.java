package com.uav.platform.service.billing;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.uav.platform.controller.billing.invoice.BillingController;
import com.uav.platform.dao.billing.IInvoiceDao;
import com.uav.platform.dao.billing.IPaymentTransactionDao;
import com.uav.platform.dao.billing.IServicePlanDao;
import com.uav.platform.dao.mission.IMissionDao;
import com.uav.platform.dao.notification.INotificationDao;
import com.uav.platform.dao.user.ICustomerBillingProfileDao;
import com.uav.platform.dao.user.IUserDao;
import com.uav.platform.dao.webhook.IFinancialOutboxDao;
import com.uav.platform.dto.record.billing.reconciliation.PaymentAccountSettings;
import com.uav.platform.dto.request.notification.inbox.CreateNotificationRequest;
import com.uav.platform.entity.billing.Invoice;
import com.uav.platform.entity.billing.PaymentTransaction;
import com.uav.platform.entity.billing.ServicePlan;
import com.uav.platform.entity.mission.Mission;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.entity.user.CustomerBillingProfile;
import com.uav.platform.entity.webhook.FinancialOutboxEvent;
import com.uav.platform.enums.billing.InvoiceStatus;
import com.uav.platform.enums.mission.MissionPriority;
import com.uav.platform.enums.mission.MissionType;
import com.uav.platform.enums.notification.NotificationType;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.error.GlobalExceptionHandler;
import com.uav.platform.error.SystemException;
import com.uav.platform.service.auth.verification.AuthMailService;
import com.uav.platform.service.auth.verification.EmailDomainPolicyService;
import com.uav.platform.service.billing.invoice.InvoiceMailService;
import com.uav.platform.service.billing.quota.QuotaService;
import com.uav.platform.service.billing.reconciliation.PaymentSettingsService;
import com.uav.platform.service.impl.auth.verification.EmailDomainPolicyServiceImpl;
import com.uav.platform.service.impl.billing.invoice.BillingServiceImpl;
import com.uav.platform.service.impl.billing.invoice.InvoiceMailServiceImpl;
import com.uav.platform.service.impl.billing.plan.ServicePlanOperations;
import com.uav.platform.service.impl.mission.lifecycle.MissionOperations;
import com.uav.platform.service.impl.notification.delivery.NotificationDeliveryOperations;
import com.uav.platform.service.impl.notification.inbox.NotificationServiceImpl;
import com.uav.platform.service.impl.webhook.FinancialOutboxServiceImpl;
import com.uav.platform.service.notification.inbox.NotificationService;
import com.uav.platform.service.permission.PermissionService;
import com.uav.platform.service.webhook.WebhookEventQueue;

import jakarta.mail.BodyPart;
import jakarta.mail.Multipart;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Properties;

class InvoiceMailServiceTest {

    private IInvoiceDao invoiceRepository;
    private IPaymentTransactionDao paymentRepository;
    private ICustomerBillingProfileDao billingProfileRepository;
    private PaymentSettingsService paymentSettingsService;
    private JavaMailSender mailSender;
    private AuthMailService authMailService;
    private InvoiceMailServiceImpl invoiceMailService;
    private BillingServiceImpl billingService;
    private IUserDao userRepository;
    private PermissionService permissions;

    private final Map<Long, Invoice> invoiceStore = new LinkedHashMap<>();
    private AppUser appleUser;
    private AppUser strangerUser;
    private AppUser adminUser;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        invoiceRepository = mock(IInvoiceDao.class);
        paymentRepository = mock(IPaymentTransactionDao.class);
        billingProfileRepository = mock(ICustomerBillingProfileDao.class);
        paymentSettingsService = mock(PaymentSettingsService.class);
        userRepository = mock(IUserDao.class);
        permissions = mock(PermissionService.class);
        mailSender = mock(JavaMailSender.class);

        when(mailSender.createMimeMessage())
                .thenAnswer(inv -> new MimeMessage(Session.getInstance(new Properties())));

        authMailService = new AuthMailService(mailSender, true, "billing@uav.all1.vn", false);

        ObjectProvider<AuthMailService> authMailProvider = mock(ObjectProvider.class);
        when(authMailProvider.getIfAvailable()).thenReturn(authMailService);

        ObjectProvider<JavaMailSender> mailSenderProvider = mock(ObjectProvider.class);
        when(mailSenderProvider.getIfAvailable()).thenReturn(mailSender);

        EmailDomainPolicyService domainPolicy =
                new EmailDomainPolicyServiceImpl(
                        EmailDomainPolicyServiceImpl.DEFAULT_ALLOWED_DOMAINS, "");
        ObjectProvider<EmailDomainPolicyService> domainPolicyProvider = mock(ObjectProvider.class);
        when(domainPolicyProvider.getIfAvailable()).thenReturn(domainPolicy);

        when(paymentSettingsService.current())
                .thenReturn(
                        new PaymentAccountSettings(
                                "970422",
                                "MB Bank",
                                "0888999777",
                                "CONG TY UAV PAS VIET NAM",
                                new BigDecimal("0.10")));

        invoiceMailService =
                new InvoiceMailServiceImpl(
                        invoiceRepository,
                        paymentRepository,
                        billingProfileRepository,
                        paymentSettingsService,
                        null,
                        authMailProvider,
                        mailSenderProvider,
                        domainPolicyProvider,
                        null,
                        "billing@uav.all1.vn",
                        true);

        billingService =
                new BillingServiceImpl(
                        mock(IServicePlanDao.class),
                        invoiceRepository,
                        paymentRepository,
                        userRepository,
                        mock(IMissionDao.class),
                        permissions);
        ReflectionTestUtils.setField(
                billingService, "billingProfileRepository", billingProfileRepository);
        ReflectionTestUtils.setField(
                billingService, "paymentSettingsService", paymentSettingsService);
        billingService.setInvoiceMailService(invoiceMailService);

        appleUser =
                new AppUser(
                        "apple_customer",
                        "xyz99@privaterelay.appleid.com",
                        "hash",
                        "0909888777",
                        "Lê Minh Quân",
                        null,
                        UserStatus.ACTIVE);
        appleUser.setId(51L);

        strangerUser =
                new AppUser(
                        "stranger",
                        "stranger@gmail.com",
                        "hash",
                        null,
                        "Stranger",
                        null,
                        UserStatus.ACTIVE);
        strangerUser.setId(52L);

        adminUser =
                new AppUser(
                        "admin",
                        "admin@uav.all1.vn",
                        "hash",
                        null,
                        "Admin Billing",
                        null,
                        UserStatus.ACTIVE);
        adminUser.setId(1L);

        when(userRepository.findByUsername("apple_customer")).thenReturn(Optional.of(appleUser));
        when(userRepository.findByUsername("stranger")).thenReturn(Optional.of(strangerUser));
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(adminUser));
        when(permissions.has(
                        argThat(a -> a != null && "admin".equals(a.getName())), eq("USER_MANAGE")))
                .thenReturn(true);

        when(invoiceRepository.findById(anyLong()))
                .thenAnswer(inv -> Optional.ofNullable(invoiceStore.get(inv.getArgument(0))));
        when(invoiceRepository.save(any(Invoice.class)))
                .thenAnswer(
                        inv -> {
                            Invoice saved = inv.getArgument(0);
                            invoiceStore.put(saved.getId(), saved);
                            return saved;
                        });
    }

    @Test
    void pendingInvoiceEmailPrioritizesBillingEmailIncludesVietQrInstructionsAndPdfAttachment()
            throws Exception {
        CustomerBillingProfile profile = new CustomerBillingProfile(appleUser.getId());
        profile.setBillingEmail("ketoan@skytech.com.vn");
        profile.setOrganizationName("Công ty Cổ phần SkyTech Việt Nam");
        profile.setTaxCode("0101234567-001");
        profile.setBillingAddress("Số 10 Phạm Văn Bạch, Cầu Giấy, Hà Nội");
        when(billingProfileRepository.findById(appleUser.getId())).thenReturn(Optional.of(profile));

        Mission mission =
                MissionOperations.draft(
                        appleUser,
                        MissionType.DATA_COLLECTION,
                        "Khảo sát LiDAR Khu Công Nghiệp",
                        null,
                        LocalDate.of(2026, 11, 18),
                        LocalDateTime.of(2026, 11, 18, 8, 0),
                        LocalDateTime.of(2026, 11, 18, 11, 0),
                        "Bắc Ninh",
                        null,
                        null,
                        MissionPriority.HIGH,
                        null);
        mission.setId(70L);
        mission.setCode("MSN-2026-070");

        Invoice pending =
                new Invoice(
                        "INV-20261118-LIDAR1",
                        appleUser,
                        mission,
                        null,
                        new BigDecimal("11000000"),
                        LocalDateTime.of(2026, 11, 25, 17, 0),
                        "Nghiệm thu đợt 1");
        pending.setId(801L);
        pending.setCreatedAt(LocalDateTime.of(2026, 11, 18, 9, 0));
        invoiceStore.put(801L, pending);

        boolean dispatched = invoiceMailService.sendForOutboxEvent(801L, "INVOICE_ISSUED");
        assertTrue(dispatched);
        assertEquals("ketoan@skytech.com.vn", pending.getLastEmailedTo());
        assertNotNull(pending.getLastEmailedAt());

        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender, times(1)).send(captor.capture());
        MimeMessage sent = captor.getValue();
        sent.saveChanges();

        assertEquals("ketoan@skytech.com.vn", sent.getAllRecipients()[0].toString());
        assertEquals("[UAV PAS] Hóa đơn dịch vụ bay — INV-20261118-LIDAR1", sent.getSubject());

        ExtractedEmail extracted = extractMultipart(sent);
        assertTrue(extracted.html().contains("HÓA ĐƠN DỊCH VỤ BAY"));
        assertTrue(extracted.html().contains("Công ty Cổ phần SkyTech Việt Nam"));
        assertTrue(extracted.html().contains("0101234567-001"));
        assertTrue(extracted.html().contains("Flight Mission: Khảo sát LiDAR Khu Công Nghiệp"));
        assertTrue(extracted.html().contains("10,000,000 VNĐ"));
        assertTrue(extracted.html().contains("1,000,000 VNĐ"));
        assertTrue(extracted.html().contains("11,000,000 VNĐ"));
        assertTrue(extracted.html().contains("MB Bank (BIN 970422)"));
        assertTrue(extracted.html().contains("0888999777"));
        assertTrue(extracted.html().contains("UAV INV INV20261118LIDAR1"));
        assertTrue(extracted.html().contains("invoice-INV-20261118-LIDAR1.pdf"));

        assertEquals("invoice-INV-20261118-LIDAR1.pdf", extracted.attachmentFilename());
        String pdfHeader =
                new String(
                        extracted.attachmentBytes(),
                        0,
                        Math.min(16, extracted.attachmentBytes().length),
                        StandardCharsets.ISO_8859_1);
        assertTrue(pdfHeader.startsWith("%PDF-1.4"));
    }

    @Test
    void paidInvoiceEmailFallsBackToUserEmailAndRendersSettlementReceiptAndManualEndpointWorks()
            throws Exception {
        when(billingProfileRepository.findById(appleUser.getId())).thenReturn(Optional.empty());

        ServicePlan plan =
                ServicePlanOperations.create(
                        "ENTERPRISE",
                        "Gói Doanh Nghiệp Cao Cấp",
                        new BigDecimal("22000000"),
                        "MONTHLY",
                        120.0,
                        10,
                        true,
                        null);
        plan.setId(9L);

        Invoice paid =
                new Invoice(
                        "INV-20261118-PLAN99",
                        appleUser,
                        null,
                        plan,
                        new BigDecimal("22000000"),
                        LocalDateTime.of(2026, 11, 25, 17, 0),
                        "PLAN_SUBSCRIPTION:ENTERPRISE");
        paid.setId(802L);
        paid.setStatus(InvoiceStatus.PAID);
        paid.setCreatedAt(LocalDateTime.of(2026, 11, 18, 10, 0));
        paid.setPaidAt(LocalDateTime.of(2026, 11, 18, 10, 15));
        invoiceStore.put(802L, paid);

        PaymentTransaction txn = new PaymentTransaction();
        txn.setInvoice(paid);
        txn.setUser(appleUser);
        txn.setTransactionCode("SEPAY-889900");
        txn.setGatewayName("VIETQR_SEPAY_AUTO");
        txn.setStatus("SUCCESS");
        txn.setAmount(new BigDecimal("22000000"));
        txn.setCompletedAt(LocalDateTime.of(2026, 11, 18, 10, 15));
        when(paymentRepository.findFirstByInvoiceIdAndStatusOrderByCompletedAtDescIdDesc(
                        802L, "SUCCESS"))
                .thenReturn(Optional.of(txn));

        // 1. Automatic outbox falls back to Apple relay email when billingEmail is absent
        assertTrue(invoiceMailService.sendForOutboxEvent(802L, "PAYMENT_COMPLETED"));
        assertEquals("xyz99@privaterelay.appleid.com", paid.getLastEmailedTo());

        // 2. Manual REST endpoint POST /api/v1/billing/invoices/{id}/send-email with custom
        // recipient override
        Authentication ownerAuth =
                UsernamePasswordAuthenticationToken.authenticated("apple_customer", "", List.of());
        Authentication strangerAuth =
                UsernamePasswordAuthenticationToken.authenticated("stranger", "", List.of());

        MockMvc mvc =
                MockMvcBuilders.standaloneSetup(
                                new BillingController(billingService, mock(QuotaService.class)))
                        .setControllerAdvice(new GlobalExceptionHandler())
                        .build();

        // Stranger denied with 404
        mvc.perform(
                        post("/api/v1/billing/invoices/802/send-email")
                                .principal(strangerAuth)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{}"))
                .andExpect(status().isNotFound());

        // Owner sends to explicit accounting inbox
        mvc.perform(
                        post("/api/v1/billing/invoices/802/send-email")
                                .principal(ownerAuth)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"recipientEmail\":\"finance@enterprise.com.vn\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.invoiceId").value(802))
                .andExpect(jsonPath("$.invoiceCode").value("INV-20261118-PLAN99"))
                .andExpect(jsonPath("$.recipientEmail").value("finance@enterprise.com.vn"))
                .andExpect(jsonPath("$.pdfAttached").value(true));

        assertEquals("finance@enterprise.com.vn", paid.getLastEmailedTo());

        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender, times(2)).send(captor.capture());
        MimeMessage receiptMsg = captor.getAllValues().get(1);
        receiptMsg.saveChanges();

        assertEquals(
                "[UAV PAS] Biên lai xác nhận thanh toán — INV-20261118-PLAN99",
                receiptMsg.getSubject());
        ExtractedEmail extracted = extractMultipart(receiptMsg);
        assertTrue(extracted.html().contains("BIÊN LAI XÁC NHẬN THANH TOÁN"));
        assertTrue(extracted.html().contains("VIETQR_SEPAY_AUTO"));
        assertTrue(extracted.html().contains("SEPAY-889900"));
        assertTrue(extracted.html().contains("20,000,000 VNĐ"));
        assertTrue(extracted.html().contains("2,000,000 VNĐ"));
        assertTrue(extracted.html().contains("22,000,000 VNĐ"));
    }

    @Test
    void manualSendThrowsConflictWhenMailDisabledAndOutboxRegistersAfterCommitOnIssueAndPay() {
        AuthMailService disabledAuthMail =
                new AuthMailService(mailSender, false, "billing@uav.all1.vn", false);
        @SuppressWarnings("unchecked")
        ObjectProvider<AuthMailService> disabledProvider = mock(ObjectProvider.class);
        when(disabledProvider.getIfAvailable()).thenReturn(disabledAuthMail);

        InvoiceMailServiceImpl disabledInvoiceMail =
                new InvoiceMailServiceImpl(
                        invoiceRepository,
                        paymentRepository,
                        billingProfileRepository,
                        paymentSettingsService,
                        null,
                        disabledProvider,
                        null,
                        null,
                        null,
                        "billing@uav.all1.vn",
                        false);
        billingService.setInvoiceMailService(disabledInvoiceMail);

        Invoice inv =
                new Invoice(
                        "INV-OFF-1",
                        appleUser,
                        null,
                        null,
                        new BigDecimal("1000000"),
                        LocalDateTime.now().plusDays(7),
                        null);
        inv.setId(901L);
        invoiceStore.put(901L, inv);

        Authentication ownerAuth =
                UsernamePasswordAuthenticationToken.authenticated("apple_customer", "", List.of());
        SystemException ex =
                assertThrows(
                        SystemException.class,
                        () -> billingService.sendInvoiceEmail(901L, null, ownerAuth));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertEquals("INVOICE_MAIL_DISABLED", ex.getCode());

        // Verify FinancialOutboxServiceImpl afterCommit on BOTH recordInvoiceIssued &
        // recordPaymentCompleted and resilience against SMTP failure
        IFinancialOutboxDao outboxRepo = mock(IFinancialOutboxDao.class);
        NotificationService notifService = mock(NotificationService.class);
        WebhookEventQueue webhookQueue = mock(WebhookEventQueue.class);
        PlatformTransactionManager txManager = mock(PlatformTransactionManager.class);
        when(txManager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());

        Map<String, FinancialOutboxEvent> eventMap = new LinkedHashMap<>();
        when(outboxRepo.existsById(anyString()))
                .thenAnswer(c -> eventMap.containsKey(c.getArgument(0)));
        when(outboxRepo.save(any(FinancialOutboxEvent.class)))
                .thenAnswer(
                        c -> {
                            FinancialOutboxEvent e = c.getArgument(0);
                            eventMap.put(e.getId(), e);
                            return e;
                        });
        when(outboxRepo.findByIdForUpdate(anyString()))
                .thenAnswer(c -> Optional.ofNullable(eventMap.get(c.getArgument(0))));

        InvoiceMailService failingMail = mock(InvoiceMailService.class);
        when(failingMail.sendForOutboxEvent(anyLong(), anyString()))
                .thenThrow(new MailSendException("SMTP down"));

        FinancialOutboxServiceImpl outbox =
                new FinancialOutboxServiceImpl(outboxRepo, notifService, webhookQueue, txManager);
        ReflectionTestUtils.setField(outbox, "workerEnabled", true);
        outbox.setInvoiceMailService(failingMail);

        TransactionSynchronizationManager.initSynchronization();
        try {
            outbox.recordInvoiceIssued(inv);
            outbox.recordPaymentCompleted(inv);
            List<TransactionSynchronization> syncs =
                    List.copyOf(TransactionSynchronizationManager.getSynchronizations());
            assertEquals(2, syncs.size());
            for (TransactionSynchronization sync : syncs) {
                sync.afterCommit();
            }
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }

        assertEquals("LOCAL_COMPLETED", eventMap.get("INVOICE_ISSUED:901").getStatus());
        assertEquals("LOCAL_COMPLETED", eventMap.get("PAYMENT_COMPLETED:901").getStatus());
        verify(notifService, times(2)).sendNotification(any(CreateNotificationRequest.class));
        verify(failingMail).sendForOutboxEvent(901L, "INVOICE_ISSUED");
        verify(failingMail).sendForOutboxEvent(901L, "PAYMENT_COMPLETED");
    }

    @Test
    @SuppressWarnings("unchecked")
    void notificationDeliverySkipsGenericOperationalEmailForInvoiceWhenInvoiceMailServicePresent() {
        ObjectProvider<AuthMailService> authMailProvider = mock(ObjectProvider.class);
        when(authMailProvider.getIfAvailable()).thenReturn(authMailService);
        ObjectProvider<JavaMailSender> senderProvider = mock(ObjectProvider.class);
        when(senderProvider.getIfAvailable()).thenReturn(mailSender);
        ObjectProvider<InvoiceMailService> invoiceMailProvider = mock(ObjectProvider.class);
        when(invoiceMailProvider.getIfAvailable()).thenReturn(invoiceMailService);

        NotificationDeliveryOperations delivery =
                new NotificationDeliveryOperations(
                        null,
                        authMailProvider,
                        senderProvider,
                        false,
                        "",
                        "",
                        "billing@uav.all1.vn");
        delivery.useSynchronousExecutor();
        delivery.setInvoiceMailServiceProvider(invoiceMailProvider);

        INotificationDao notifRepo = mock(INotificationDao.class);
        when(notifRepo.save(any()))
                .thenAnswer(
                        c -> {
                            com.uav.platform.entity.notification.Notification n = c.getArgument(0);
                            n.setId(1L);
                            return n;
                        });
        when(userRepository.findById(51L)).thenReturn(Optional.of(appleUser));

        NotificationServiceImpl notifService =
                new NotificationServiceImpl(
                        notifRepo,
                        userRepository,
                        Mappers.getMapper(
                                com.uav.platform.mapper.notification.inbox.NotificationMapper
                                        .class));
        notifService.setDeliveryOperations(delivery);

        // INVOICE notification -> generic 1-line email skipped
        notifService.sendNotification(
                new CreateNotificationRequest(
                        51L,
                        "Hóa đơn đã được phát hành",
                        "Hóa đơn: INV-1",
                        NotificationType.PAYMENT,
                        "INVOICE",
                        801L));
        verify(mailSender, never()).send(any(MimeMessage.class));

        // PERMIT notification -> operational email still sent
        notifService.sendNotification(
                new CreateNotificationRequest(
                        51L,
                        "Phép bay đã được phê duyệt",
                        "MSN-01",
                        NotificationType.MISSION_STATUS_CHANGED,
                        "PERMIT",
                        70L));
        verify(mailSender, times(1)).send(any(MimeMessage.class));
        delivery.shutdown();
    }

    private record ExtractedEmail(String html, String attachmentFilename, byte[] attachmentBytes) {}

    private static ExtractedEmail extractMultipart(MimeMessage message) throws Exception {
        String html = null;
        String filename = null;
        byte[] pdfBytes = null;

        Multipart root = (Multipart) message.getContent();
        for (int i = 0; i < root.getCount(); i++) {
            BodyPart part = root.getBodyPart(i);
            Object content = part.getContent();
            if (part.getFileName() != null) {
                filename = part.getFileName();
                ByteArrayOutputStream bos = new ByteArrayOutputStream();
                part.getDataHandler().writeTo(bos);
                pdfBytes = bos.toByteArray();
            } else if (content instanceof String s) {
                html = s;
            } else if (content instanceof Multipart nested) {
                for (int j = 0; j < nested.getCount(); j++) {
                    BodyPart sub = nested.getBodyPart(j);
                    if (sub.getContent() instanceof String s) {
                        html = s;
                    }
                }
            }
        }
        return new ExtractedEmail(html, filename, pdfBytes);
    }
}
