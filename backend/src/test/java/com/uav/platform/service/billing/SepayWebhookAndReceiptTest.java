package com.uav.platform.service.billing;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.uav.platform.controller.billing.BillingController;
import com.uav.platform.controller.billing.PaymentIpnController;
import com.uav.platform.dto.record.billing.PaymentAccountSettings;
import com.uav.platform.dto.request.billing.SepayWebhookRequest;
import com.uav.platform.dto.response.billing.SepayWebhookResponse;
import com.uav.platform.entity.billing.Invoice;
import com.uav.platform.entity.billing.PaymentTransaction;
import com.uav.platform.entity.billing.ServicePlan;
import com.uav.platform.entity.mission.Mission;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.entity.user.CustomerBillingProfile;
import com.uav.platform.enums.billing.InvoiceStatus;
import com.uav.platform.enums.mission.MissionPriority;
import com.uav.platform.enums.mission.MissionType;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.error.GlobalExceptionHandler;
import com.uav.platform.error.SystemException;
import com.uav.platform.repository.billing.InvoiceRepository;
import com.uav.platform.repository.billing.PaymentTransactionRepository;
import com.uav.platform.repository.billing.ServicePlanRepository;
import com.uav.platform.repository.mission.MissionRepository;
import com.uav.platform.repository.user.CustomerBillingProfileRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.impl.billing.BillingServiceImpl;
import com.uav.platform.service.impl.billing.ServicePlanOperations;
import com.uav.platform.service.impl.mission.MissionOperations;
import com.uav.platform.service.permission.PermissionService;
import com.uav.platform.service.webhook.FinancialOutboxService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

class SepayWebhookAndReceiptTest {

    private static final String TEST_SECRET = "sepay-test-webhook-secret-key-2026-uav-pas";

    private ServicePlanRepository planRepository;
    private InvoiceRepository invoiceRepository;
    private PaymentTransactionRepository paymentRepository;
    private UserRepository userRepository;
    private MissionRepository missionRepository;
    private PermissionService permissions;
    private QuotaService quotaService;
    private FinancialOutboxService financialEvents;
    private PaymentSettingsService paymentSettingsService;
    private CustomerBillingProfileRepository billingProfileRepository;
    private BillingServiceImpl billingService;

    private final Map<String, Invoice> invoicesByNormalizedCode = new LinkedHashMap<>();
    private final Map<Long, Invoice> invoicesById = new LinkedHashMap<>();
    private final Map<String, PaymentTransaction> txnsByCode = new LinkedHashMap<>();

    private AppUser customer;
    private AppUser stranger;
    private AppUser manager;

    @BeforeEach
    void setUp() {
        planRepository = mock(ServicePlanRepository.class);
        invoiceRepository = mock(InvoiceRepository.class);
        paymentRepository = mock(PaymentTransactionRepository.class);
        userRepository = mock(UserRepository.class);
        missionRepository = mock(MissionRepository.class);
        permissions = mock(PermissionService.class);
        quotaService = mock(QuotaService.class);
        financialEvents = mock(FinancialOutboxService.class);
        paymentSettingsService = mock(PaymentSettingsService.class);
        billingProfileRepository = mock(CustomerBillingProfileRepository.class);

        billingService =
                new BillingServiceImpl(
                        planRepository,
                        invoiceRepository,
                        paymentRepository,
                        userRepository,
                        missionRepository,
                        permissions,
                        null,
                        null,
                        TEST_SECRET);

        ReflectionTestUtils.setField(billingService, "providerEnabled", true);
        ReflectionTestUtils.setField(billingService, "billingJdbc", mock(JdbcTemplate.class));
        ReflectionTestUtils.setField(billingService, "quotaService", quotaService);
        ReflectionTestUtils.setField(billingService, "financialEvents", financialEvents);
        ReflectionTestUtils.setField(
                billingService, "paymentSettingsService", paymentSettingsService);
        ReflectionTestUtils.setField(
                billingService, "billingProfileRepository", billingProfileRepository);

        when(paymentSettingsService.current())
                .thenReturn(
                        new PaymentAccountSettings(
                                "970422",
                                "MB Bank",
                                "0123456789",
                                "CONG TY UAV PAS VIET NAM",
                                new BigDecimal("0.10")));

        customer =
                new AppUser(
                        "nguyenvana",
                        "vana@uav.vn",
                        "hash",
                        "0901234567",
                        "Nguyễn Văn Đạt (Khách hàng)",
                        null,
                        UserStatus.ACTIVE);
        customer.setId(10L);

        stranger =
                new AppUser(
                        "stranger",
                        "stranger@uav.vn",
                        "hash",
                        null,
                        "Other Customer",
                        null,
                        UserStatus.ACTIVE);
        stranger.setId(20L);

        manager =
                new AppUser(
                        "admin",
                        "admin@uav.vn",
                        "hash",
                        null,
                        "Billing Manager",
                        null,
                        UserStatus.ACTIVE);
        manager.setId(99L);

        lenient()
                .when(userRepository.findByUsername("nguyenvana"))
                .thenReturn(Optional.of(customer));
        lenient().when(userRepository.findByUsername("stranger")).thenReturn(Optional.of(stranger));
        lenient().when(userRepository.findByUsername("admin")).thenReturn(Optional.of(manager));
        lenient()
                .when(
                        permissions.has(
                                argThat(a -> a != null && "admin".equals(a.getName())),
                                eq("USER_MANAGE")))
                .thenReturn(true);

        lenient()
                .when(invoiceRepository.findById(anyLong()))
                .thenAnswer(inv -> Optional.ofNullable(invoicesById.get(inv.getArgument(0))));
        lenient()
                .when(invoiceRepository.findByCode(anyString()))
                .thenAnswer(
                        inv -> {
                            String code = inv.getArgument(0);
                            return invoicesById.values().stream()
                                    .filter(i -> i.getCode().equalsIgnoreCase(code))
                                    .findFirst();
                        });
        lenient()
                .when(invoiceRepository.findByNormalizedCode(anyString()))
                .thenAnswer(
                        inv ->
                                Optional.ofNullable(
                                        invoicesByNormalizedCode.get(
                                                inv.<String>getArgument(0)
                                                        .toUpperCase(Locale.ROOT))));
        lenient()
                .when(invoiceRepository.save(any(Invoice.class)))
                .thenAnswer(inv -> registerInvoice(inv.getArgument(0)));

        lenient()
                .when(paymentRepository.findByTransactionCode(anyString()))
                .thenAnswer(inv -> Optional.ofNullable(txnsByCode.get(inv.getArgument(0))));
        lenient()
                .when(
                        paymentRepository.findFirstByInvoiceIdAndStatusOrderByCompletedAtDescIdDesc(
                                anyLong(), anyString()))
                .thenAnswer(
                        inv -> {
                            Long invoiceId = inv.getArgument(0);
                            String status = inv.getArgument(1);
                            return txnsByCode.values().stream()
                                    .filter(
                                            t ->
                                                    t.getInvoice() != null
                                                            && invoiceId.equals(
                                                                    t.getInvoice().getId())
                                                            && status.equals(t.getStatus()))
                                    .findFirst();
                        });
        lenient()
                .when(paymentRepository.save(any(PaymentTransaction.class)))
                .thenAnswer(
                        inv -> {
                            PaymentTransaction t = inv.getArgument(0);
                            txnsByCode.put(t.getTransactionCode(), t);
                            return t;
                        });
        lenient()
                .when(missionRepository.save(any(Mission.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    private Invoice registerInvoice(Invoice invoice) {
        invoicesById.put(invoice.getId(), invoice);
        invoicesByNormalizedCode.put(
                invoice.getCode().replace("-", "").toUpperCase(Locale.ROOT), invoice);
        return invoice;
    }

    @Test
    void sepayWebhookSettlesPlanAndMissionInvoicesAndUpdatesMissionBillingStatus() {
        ServicePlan proPlan =
                ServicePlanOperations.create(
                        "PRO",
                        "Gói Doanh Nghiệp Pro",
                        new BigDecimal("11000000"),
                        "MONTHLY",
                        80.0,
                        4,
                        true,
                        null);
        proPlan.setId(5L);

        Invoice planInvoice =
                new Invoice(
                        "INV-20261105-ABC123",
                        customer,
                        null,
                        proPlan,
                        new BigDecimal("11000000"),
                        LocalDateTime.of(2026, 11, 12, 12, 0),
                        "PLAN_SUBSCRIPTION:PRO");
        planInvoice.setId(101L);
        planInvoice.setCreatedAt(LocalDateTime.of(2026, 11, 5, 9, 30));
        registerInvoice(planInvoice);

        SepayWebhookRequest planWebhook =
                new SepayWebhookRequest(
                        987654L,
                        "MBBank",
                        "2026-11-05 14:20:00",
                        "0123456789",
                        null,
                        "MBVCB.12345.UAV INV INV20261105ABC123 CT tu NGUYEN VAN A",
                        "in",
                        new BigDecimal("11000000"),
                        new BigDecimal("50000000"),
                        null,
                        "FT26309ABC123",
                        "BankAPINotify MBVCB.12345");

        SepayWebhookResponse planResult =
                billingService.processSepayWebhook(planWebhook, "Apikey " + TEST_SECRET, null);

        assertTrue(planResult.success());
        assertEquals("PAID", planResult.status());
        assertEquals("INV-20261105-ABC123", planResult.invoiceCode());
        assertEquals("SEPAY-987654", planResult.transactionCode());
        assertEquals(InvoiceStatus.PAID, planInvoice.getStatus());
        assertNotNull(planInvoice.getPaidAt());
        verify(quotaService).applyPaidPlan(customer.getId(), proPlan);

        PaymentTransaction savedPlanTxn = txnsByCode.get("SEPAY-987654");
        assertNotNull(savedPlanTxn);
        assertEquals("VIETQR_SEPAY_AUTO", savedPlanTxn.getGatewayName());
        assertEquals("SUCCESS", savedPlanTxn.getStatus());
        assertEquals("0123456789", savedPlanTxn.getBankAccountNumber());

        // Now verify mission invoice settlement updates Mission.billingStatus = "PAID"
        Mission mission =
                MissionOperations.draft(
                        customer,
                        MissionType.DATA_COLLECTION,
                        "Khảo sát địa hình Quảng Ninh",
                        null,
                        LocalDate.of(2026, 11, 5),
                        LocalDateTime.of(2026, 11, 5, 8, 0),
                        LocalDateTime.of(2026, 11, 5, 10, 0),
                        "Hạ Long",
                        null,
                        null,
                        MissionPriority.HIGH,
                        null);
        mission.setId(42L);
        mission.setCode("MSN-2026-042");
        mission.setBillingStatus("ISSUED");

        Invoice missionInvoice =
                new Invoice(
                        "INV-MISSION-42",
                        customer,
                        mission,
                        null,
                        new BigDecimal("5500000"),
                        LocalDateTime.of(2026, 11, 12, 12, 0),
                        "Hóa đơn nhiệm vụ bay MSN-2026-042");
        missionInvoice.setId(102L);
        missionInvoice.setCreatedAt(LocalDateTime.of(2026, 11, 5, 10, 15));
        registerInvoice(missionInvoice);

        SepayWebhookRequest missionWebhook =
                new SepayWebhookRequest(
                        987655L,
                        "MBBank",
                        "2026-11-05 14:25:00",
                        "0123456789",
                        null,
                        "IBFT UAV INV INVMISSION42 thanh toan bay khao sat",
                        "in",
                        new BigDecimal("5500000"),
                        new BigDecimal("55500000"),
                        null,
                        "FT26309MSN42",
                        null);

        SepayWebhookResponse missionResult =
                billingService.processSepayWebhook(missionWebhook, null, TEST_SECRET);

        assertTrue(missionResult.success());
        assertEquals("PAID", missionResult.status());
        assertEquals("INV-MISSION-42", missionResult.invoiceCode());
        assertEquals(InvoiceStatus.PAID, missionInvoice.getStatus());
        assertEquals("PAID", mission.getBillingStatus());
        verify(missionRepository).save(mission);
    }

    @Test
    void duplicateSepayWebhookDeliveryIsIdempotentWithoutDoubleCharging() {
        Invoice invoice =
                new Invoice(
                        "INV-20261105-DUP999",
                        customer,
                        null,
                        null,
                        new BigDecimal("2200000"),
                        LocalDateTime.now().plusDays(7),
                        null);
        invoice.setId(201L);
        registerInvoice(invoice);

        SepayWebhookRequest webhook =
                new SepayWebhookRequest(
                        777001L,
                        "VCB",
                        "2026-11-05 15:00:00",
                        "0123456789",
                        null,
                        "UAV INV INV20261105DUP999",
                        "in",
                        new BigDecimal("2200000"),
                        null,
                        null,
                        "VCB777001",
                        null);

        SepayWebhookResponse first =
                billingService.processSepayWebhook(webhook, "Apikey " + TEST_SECRET, null);
        SepayWebhookResponse second =
                billingService.processSepayWebhook(webhook, "Apikey " + TEST_SECRET, null);

        assertEquals("PAID", first.status());
        assertTrue(second.success());
        assertEquals("DUPLICATE_IGNORED", second.status());
        assertEquals("INV-20261105-DUP999", second.invoiceCode());
        assertEquals("SEPAY-777001", second.transactionCode());
        verify(invoiceRepository, times(1)).save(invoice);
        verify(financialEvents, times(1)).recordPaymentCompleted(invoice);
    }

    @Test
    void invalidSecretThrows401AndDisabledGatewayThrows503() {
        SepayWebhookRequest webhook =
                new SepayWebhookRequest(
                        111L,
                        "MBBank",
                        "2026-11-05 15:00:00",
                        "0123456789",
                        null,
                        "UAV INV INV20261105ABC123",
                        "in",
                        new BigDecimal("1000000"),
                        null,
                        null,
                        "REF111",
                        null);

        SystemException badSecret =
                assertThrows(
                        SystemException.class,
                        () ->
                                billingService.processSepayWebhook(
                                        webhook, "Apikey wrong-secret-value-here", null));
        assertEquals(HttpStatus.UNAUTHORIZED, badSecret.getStatus());
        assertEquals("WEBHOOK_SECRET_INVALID", badSecret.getCode());

        SystemException missingSecret =
                assertThrows(
                        SystemException.class,
                        () -> billingService.processSepayWebhook(webhook, null, null));
        assertEquals(HttpStatus.UNAUTHORIZED, missingSecret.getStatus());
        assertEquals("WEBHOOK_SECRET_INVALID", missingSecret.getCode());

        ReflectionTestUtils.setField(billingService, "providerEnabled", false);
        SystemException disabled =
                assertThrows(
                        SystemException.class,
                        () ->
                                billingService.processSepayWebhook(
                                        webhook, "Apikey " + TEST_SECRET, null));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, disabled.getStatus());
        assertEquals("PAYMENT_UNAVAILABLE", disabled.getCode());
    }

    @Test
    void outgoingTransferAccountMismatchUnmatchedMemoAndWrongAmountBehaveSafely() {
        Invoice invoice =
                new Invoice(
                        "INV-20261105-AMT500",
                        customer,
                        null,
                        null,
                        new BigDecimal("5000000"),
                        LocalDateTime.now().plusDays(7),
                        null);
        invoice.setId(301L);
        registerInvoice(invoice);

        // 1. Outgoing debit transfer -> IGNORED_OUTGOING
        SepayWebhookRequest outgoing =
                new SepayWebhookRequest(
                        3001L,
                        "MBBank",
                        "2026-11-05 16:00:00",
                        "0123456789",
                        null,
                        "UAV INV INV20261105AMT500",
                        "out",
                        new BigDecimal("5000000"),
                        null,
                        null,
                        "OUT3001",
                        null);
        SepayWebhookResponse outRes =
                billingService.processSepayWebhook(outgoing, "Apikey " + TEST_SECRET, null);
        assertTrue(outRes.success());
        assertEquals("IGNORED_OUTGOING", outRes.status());
        assertEquals(InvoiceStatus.PENDING, invoice.getStatus());

        // 2. Different bank account -> IGNORED_ACCOUNT
        SepayWebhookRequest wrongAccount =
                new SepayWebhookRequest(
                        3002L,
                        "MBBank",
                        "2026-11-05 16:01:00",
                        "9999999999",
                        null,
                        "UAV INV INV20261105AMT500",
                        "in",
                        new BigDecimal("5000000"),
                        null,
                        null,
                        "ACC3002",
                        null);
        SepayWebhookResponse acctRes =
                billingService.processSepayWebhook(wrongAccount, "Apikey " + TEST_SECRET, null);
        assertTrue(acctRes.success());
        assertEquals("IGNORED_ACCOUNT", acctRes.status());

        // 3. Unrelated transfer memo -> UNMATCHED_MEMO
        SepayWebhookRequest unrelated =
                new SepayWebhookRequest(
                        3003L,
                        "MBBank",
                        "2026-11-05 16:02:00",
                        "0123456789",
                        null,
                        "Thanh toan tien dien thang 11",
                        "in",
                        new BigDecimal("5000000"),
                        null,
                        null,
                        "MEMO3003",
                        null);
        SepayWebhookResponse memoRes =
                billingService.processSepayWebhook(unrelated, "Apikey " + TEST_SECRET, null);
        assertTrue(memoRes.success());
        assertEquals("UNMATCHED_MEMO", memoRes.status());

        // 4. Wrong transfer amount -> records MISMATCH evidence and leaves invoice PENDING
        SepayWebhookRequest wrongAmount =
                new SepayWebhookRequest(
                        3004L,
                        "MBBank",
                        "2026-11-05 16:05:00",
                        "0123456789",
                        null,
                        "UAV INV INV20261105AMT500",
                        "in",
                        new BigDecimal("4500000"),
                        null,
                        null,
                        "WRONG3004",
                        null);
        SepayWebhookResponse mismatchRes =
                billingService.processSepayWebhook(wrongAmount, "Apikey " + TEST_SECRET, null);
        assertTrue(mismatchRes.success());
        assertEquals("AMOUNT_MISMATCH", mismatchRes.status());
        assertEquals("INV-20261105-AMT500", mismatchRes.invoiceCode());
        assertEquals(InvoiceStatus.PENDING, invoice.getStatus());

        PaymentTransaction mismatchTxn = txnsByCode.get("SEPAY-3004");
        assertNotNull(mismatchTxn);
        assertEquals("MISMATCH", mismatchTxn.getStatus());
        assertEquals("VIETQR_SEPAY_AUTO", mismatchTxn.getGatewayName());
        assertEquals(0, new BigDecimal("4500000").compareTo(mismatchTxn.getAmount()));
    }

    @Test
    void receiptPdfEndpointAndRendererReturnValidIso32000PdfAndEnforceOwnership() throws Exception {
        CustomerBillingProfile profile = new CustomerBillingProfile(customer.getId());
        profile.setOrganizationName("Công ty TNHH Giải pháp Bay Đô Thị Việt Nam");
        profile.setTaxCode("0109876543");
        profile.setBillingAddress("Tầng 12, Tòa nhà Đổi Mới, Quận Cầu Giấy, Hà Nội");
        when(billingProfileRepository.findById(customer.getId())).thenReturn(Optional.of(profile));

        Mission mission =
                MissionOperations.draft(
                        customer,
                        MissionType.AREA_INSPECTION,
                        "Kiểm định đường dây 500kV (Đông Anh)",
                        null,
                        LocalDate.of(2026, 11, 5),
                        LocalDateTime.of(2026, 11, 5, 7, 0),
                        LocalDateTime.of(2026, 11, 5, 9, 0),
                        "Đông Anh",
                        null,
                        null,
                        MissionPriority.NORMAL,
                        null);
        mission.setId(88L);
        mission.setCode("MSN-2026-088");

        Invoice paidInvoice =
                new Invoice(
                        "INV-20261105-PDF888",
                        customer,
                        mission,
                        null,
                        new BigDecimal("11000000"),
                        LocalDateTime.of(2026, 11, 12, 17, 0),
                        "Hóa đơn kiểm định lưới điện (đã nghiệm thu)");
        paidInvoice.setId(401L);
        paidInvoice.setCreatedAt(LocalDateTime.of(2026, 11, 5, 10, 0));
        registerInvoice(paidInvoice);

        // Settle via SePay webhook first
        billingService.processSepayWebhook(
                new SepayWebhookRequest(
                        555888L,
                        "MBBank",
                        "2026-11-05 11:00:00",
                        "0123456789",
                        null,
                        "UAV INV INV20261105PDF888",
                        "in",
                        new BigDecimal("11000000"),
                        null,
                        null,
                        "FT555888",
                        null),
                "Apikey " + TEST_SECRET,
                null);

        Authentication customerAuth =
                UsernamePasswordAuthenticationToken.authenticated("nguyenvana", "", List.of());
        Authentication strangerAuth =
                UsernamePasswordAuthenticationToken.authenticated("stranger", "", List.of());
        Authentication adminAuth =
                UsernamePasswordAuthenticationToken.authenticated("admin", "", List.of());

        // Stranger is blocked with 404 Not Found
        SystemException denied =
                assertThrows(
                        SystemException.class,
                        () -> billingService.renderInvoiceReceiptPdf(401L, strangerAuth));
        assertEquals(HttpStatus.NOT_FOUND, denied.getStatus());

        // Admin with USER_MANAGE can render receipt
        byte[] adminPdf = billingService.renderInvoiceReceiptPdf(401L, adminAuth);
        assertTrue(adminPdf.length > 800);

        // Verify HTTP controller response via MockMvc (both webhook and PDF download)
        QuotaService mockQuota = mock(QuotaService.class);
        MockMvc billingMvc =
                MockMvcBuilders.standaloneSetup(
                                new BillingController(billingService, mockQuota),
                                new PaymentIpnController(billingService))
                        .setControllerAdvice(new GlobalExceptionHandler())
                        .build();

        byte[] pdfBytes =
                billingMvc
                        .perform(
                                get("/api/v1/billing/invoices/401/receipt").principal(customerAuth))
                        .andExpect(status().isOk())
                        .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                        .andExpect(
                                header().string(
                                                HttpHeaders.CONTENT_DISPOSITION,
                                                "attachment; filename=\"invoice-INV-20261105-PDF888.pdf\""))
                        .andReturn()
                        .getResponse()
                        .getContentAsByteArray();

        String pdfText = new String(pdfBytes, StandardCharsets.ISO_8859_1);
        assertTrue(pdfText.startsWith("%PDF-1.4\n"), "Must start with %PDF-1.4 header");
        assertTrue(pdfText.endsWith("%%EOF"), "Must end with %%EOF");
        assertTrue(pdfText.contains("/Type /Catalog"));
        assertTrue(pdfText.contains("/MediaBox [0 0 595 842]"));
        assertTrue(pdfText.contains("INV-20261105-PDF888"));
        assertTrue(pdfText.contains("Nguyen Van Dat \\(Khach hang\\)"));
        assertTrue(pdfText.contains("Cong ty TNHH Giai phap Bay Do Thi Viet Nam"));
        assertTrue(pdfText.contains("0109876543"));
        assertTrue(pdfText.contains("10,000,000 VND"), "Subtotal excl. 10% VAT");
        assertTrue(pdfText.contains("1,000,000 VND"), "10% VAT amount");
        assertTrue(pdfText.contains("11,000,000 VND"), "Total VND amount");
        assertTrue(pdfText.contains("VIETQR_SEPAY_AUTO"));
        assertTrue(pdfText.contains("SEPAY-555888"));

        // Verify xref table byte offsets and stream /Length strictly match ISO-32000
        Matcher startxrefMatcher = Pattern.compile("startxref\\n(\\d+)\\n%%EOF$").matcher(pdfText);
        assertTrue(startxrefMatcher.find(), "Must have valid startxref footer");
        int xrefPos = Integer.parseInt(startxrefMatcher.group(1));
        assertEquals("xref\n", pdfText.substring(xrefPos, xrefPos + 5));

        Matcher xrefEntryMatcher =
                Pattern.compile("(\\d{10}) 00000 n \\n").matcher(pdfText.substring(xrefPos));
        int objNum = 1;
        while (xrefEntryMatcher.find()) {
            int offset = Integer.parseInt(xrefEntryMatcher.group(1));
            String expectedHeader = objNum + " 0 obj\n";
            assertEquals(
                    expectedHeader,
                    pdfText.substring(offset, offset + expectedHeader.length()),
                    "xref offset must point directly to object " + objNum);
            objNum++;
        }
        assertEquals(7, objNum, "Must index all 6 indirect objects");

        // Also test PaymentIpnController POST /api/v1/billing/webhook/sepay with unknown fields
        billingMvc
                .perform(
                        post("/api/v1/billing/webhook/sepay")
                                .header("Authorization", "Apikey " + TEST_SECRET)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "id": 555888,
                                          "gateway": "MBBank",
                                          "transferType": "in",
                                          "transferAmount": 11000000,
                                          "content": "UAV INV INV20261105PDF888",
                                          "extraProviderField": "ignored-cleanly"
                                        }
                                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.status").value("DUPLICATE_IGNORED"))
                .andExpect(jsonPath("$.invoiceCode").value("INV-20261105-PDF888"));
    }
}
