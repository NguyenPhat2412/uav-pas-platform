package com.uav.platform.service.impl;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dao.ICustomerBillingProfileDao;
import com.uav.platform.dao.IInvoiceDao;
import com.uav.platform.dao.IMissionDao;
import com.uav.platform.dao.IPaymentTransactionDao;
import com.uav.platform.dao.IServicePlanDao;
import com.uav.platform.dao.IUserDao;
import com.uav.platform.dao.IUserQuotaDao;
import com.uav.platform.dto.record.InvoiceReceiptData;
import com.uav.platform.dto.record.PaymentAccountSettings;
import com.uav.platform.dto.request.CreateInvoiceRequest;
import com.uav.platform.dto.request.CreateNotificationRequest;
import com.uav.platform.dto.request.PayInvoiceRequest;
import com.uav.platform.dto.request.PaymentIpnRequest;
import com.uav.platform.dto.request.SepayWebhookRequest;
import com.uav.platform.dto.response.InvoiceEmailDispatchResponse;
import com.uav.platform.dto.response.InvoiceResponse;
import com.uav.platform.dto.response.PaymentIpnResponse;
import com.uav.platform.dto.response.PaymentResponse;
import com.uav.platform.dto.response.SepayWebhookResponse;
import com.uav.platform.dto.response.ServicePlanResponse;
import com.uav.platform.entity.AppUser;
import com.uav.platform.entity.CustomerBillingProfile;
import com.uav.platform.entity.Invoice;
import com.uav.platform.entity.Mission;
import com.uav.platform.entity.PaymentTransaction;
import com.uav.platform.entity.ServicePlan;
import com.uav.platform.enums.InvoiceStatus;
import com.uav.platform.enums.MissionStatus;
import com.uav.platform.enums.NotificationType;
import com.uav.platform.enums.PaymentMethod;
import com.uav.platform.error.SystemException;
import com.uav.platform.mapper.BillingMapper;
import com.uav.platform.service.BillingService;
import com.uav.platform.service.NotificationService;
import com.uav.platform.service.PaymentSettingsService;
import com.uav.platform.service.PermissionService;
import com.uav.platform.service.WebhookService;

import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Slf4j
@Service
@Transactional
public class BillingServiceImpl implements BillingService {

    private final IServicePlanDao planRepository;
    private final IInvoiceDao invoiceRepository;
    private final IPaymentTransactionDao paymentRepository;
    private final IUserDao userRepository;
    private final IMissionDao missionRepository;
    private final PermissionService permissions;
    private final IUserQuotaDao quotaRepository;
    private final WebhookService webhookService;
    private final String ipnSecret;
    private final BillingMapper billingMapper;

    @org.springframework.beans.factory.annotation.Value("${app.billing.provider-enabled:false}")
    private boolean providerEnabled;

    @Autowired private com.uav.platform.service.FinancialOutboxService financialEvents;

    @Autowired private org.springframework.jdbc.core.JdbcTemplate billingJdbc;
    @Autowired private com.uav.platform.service.QuotaService quotaService;

    /** Writes rejected-payment evidence in its own transaction so it survives the rejection. */
    @Autowired(required = false)
    private org.springframework.transaction.PlatformTransactionManager transactionManager;

    @Autowired(required = false)
    private PaymentSettingsService paymentSettingsService;

    @Autowired(required = false)
    private ICustomerBillingProfileDao billingProfileRepository;

    @Autowired(required = false)
    private ObjectProvider<NotificationService> notifications;

    @Autowired(required = false)
    private com.uav.platform.transport.RealtimeEventBroadcaster realtimeBroadcaster;

    @Autowired(required = false)
    private com.uav.platform.service.MarketplaceEscrowService marketplaceEscrow;

    @Autowired(required = false)
    private com.uav.platform.service.SystemConfigService systemConfig;

    @Autowired(required = false)
    private com.uav.platform.service.InvoiceMailService invoiceMailService;

    public void setInvoiceMailService(
            com.uav.platform.service.InvoiceMailService invoiceMailService) {
        this.invoiceMailService = invoiceMailService;
    }

    private int configuredDueDays() {
        return Math.max(
                1,
                com.uav.platform.service.impl.SystemConfigurationOperations.intOrDefault(
                        systemConfig, "billing.invoice_due_days", 7));
    }

    public void setNotifications(ObjectProvider<NotificationService> notifications) {
        this.notifications = notifications;
    }

    public void setPaymentSettingsService(PaymentSettingsService paymentSettingsService) {
        this.paymentSettingsService = paymentSettingsService;
    }

    public void setRealtimeBroadcaster(
            com.uav.platform.transport.RealtimeEventBroadcaster realtimeBroadcaster) {
        this.realtimeBroadcaster = realtimeBroadcaster;
    }

    public BillingServiceImpl(
            IServicePlanDao planRepository,
            IInvoiceDao invoiceRepository,
            IPaymentTransactionDao paymentRepository,
            IUserDao userRepository,
            IMissionDao missionRepository,
            PermissionService permissions) {
        this(
                planRepository,
                invoiceRepository,
                paymentRepository,
                userRepository,
                missionRepository,
                permissions,
                null,
                null,
                "");
    }

    public BillingServiceImpl(
            IServicePlanDao planRepository,
            IInvoiceDao invoiceRepository,
            IPaymentTransactionDao paymentRepository,
            IUserDao userRepository,
            IMissionDao missionRepository,
            PermissionService permissions,
            IUserQuotaDao quotaRepository,
            WebhookService webhookService) {
        this(
                planRepository,
                invoiceRepository,
                paymentRepository,
                userRepository,
                missionRepository,
                permissions,
                quotaRepository,
                webhookService,
                "");
    }

    public BillingServiceImpl(
            IServicePlanDao planRepository,
            IInvoiceDao invoiceRepository,
            IPaymentTransactionDao paymentRepository,
            IUserDao userRepository,
            IMissionDao missionRepository,
            PermissionService permissions,
            IUserQuotaDao quotaRepository,
            WebhookService webhookService,
            String ipnSecret) {
        this(
                planRepository,
                invoiceRepository,
                paymentRepository,
                userRepository,
                missionRepository,
                permissions,
                quotaRepository,
                webhookService,
                ipnSecret,
                org.mapstruct.factory.Mappers.getMapper(BillingMapper.class));
    }

    @Autowired
    public BillingServiceImpl(
            IServicePlanDao planRepository,
            IInvoiceDao invoiceRepository,
            IPaymentTransactionDao paymentRepository,
            IUserDao userRepository,
            IMissionDao missionRepository,
            PermissionService permissions,
            @Autowired(required = false) IUserQuotaDao quotaRepository,
            @Autowired(required = false) WebhookService webhookService,
            @org.springframework.beans.factory.annotation.Value("${app.billing.ipn-secret:}")
                    String ipnSecret,
            BillingMapper billingMapper) {
        this.planRepository = planRepository;
        this.invoiceRepository = invoiceRepository;
        this.paymentRepository = paymentRepository;
        this.userRepository = userRepository;
        this.missionRepository = missionRepository;
        this.permissions = permissions;
        this.quotaRepository = quotaRepository;
        this.webhookService = webhookService;
        this.ipnSecret = (ipnSecret != null && !ipnSecret.isBlank()) ? ipnSecret : "";
        this.billingMapper = billingMapper;
    }

    private AppUser getCurrentUser(Authentication auth) {
        if (auth == null
                || !auth.isAuthenticated()
                || auth
                        instanceof
                        org.springframework.security.authentication.AnonymousAuthenticationToken) {
            throw SystemException.unauthorized("Authentication required");
        }
        return userRepository
                .findByUsername(auth.getName())
                .filter(
                        user ->
                                UserAccountServiceImpl.isEnabled(user)
                                        && UserAccountServiceImpl.isAccountNonLocked(user))
                .orElseThrow(() -> SystemException.unauthorized("Authentication required"));
    }

    private Invoice accessibleInvoice(Long id, Authentication auth) {
        AppUser user = getCurrentUser(auth);
        Invoice invoice =
                invoiceRepository
                        .findById(id)
                        .orElseThrow(() -> SystemException.notFound("Invoice not found"));
        if (!Objects.equals(invoice.getUser().getId(), user.getId())
                && !permissions.has(auth, "USER_MANAGE")) {
            throw SystemException.notFound("Invoice not found");
        }
        return invoice;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ServicePlanResponse> listActivePlans() {
        return planRepository.findByActiveTrue().stream()
                .map(billingMapper::toPlanResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<InvoiceResponse> listInvoices(Authentication auth, Pageable pageable) {
        AppUser user = getCurrentUser(auth);
        boolean canManage = permissions.has(auth, "USER_MANAGE");

        Page<Invoice> page =
                canManage
                        ? invoiceRepository.findAll(pageable)
                        : invoiceRepository.findByUserIdOrderByCreatedAtDesc(
                                user.getId(), pageable);

        return PageResponse.from(page.map(billingMapper::toInvoiceResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<InvoiceResponse> listInvoices(
            Authentication auth, Pageable pageable, InvoiceStatus status, boolean overdue) {
        if (status == null && !overdue) return listInvoices(auth, pageable);
        AppUser user = getCurrentUser(auth);
        boolean canManage = permissions.has(auth, "USER_MANAGE");
        Long ownerId = canManage ? null : user.getId();
        return PageResponse.from(
                invoiceRepository
                        .findAll(
                                invoiceFilter(ownerId, status, overdue, LocalDateTime.now()),
                                pageable)
                        .map(billingMapper::toInvoiceResponse));
    }

    /** Customers are always pinned to their own invoices; managers see every invoice. */
    static com.uav.platform.dao.base.HibernateSpecification<Invoice> invoiceFilter(
            Long ownerId, InvoiceStatus status, boolean overdue, LocalDateTime now) {
        return BillingPaymentOperations.invoiceFilter(ownerId, status, overdue, now);
    }

    @Override
    @Transactional(readOnly = true)
    public InvoiceResponse getInvoice(Long id, Authentication auth) {
        return billingMapper.toInvoiceResponse(accessibleInvoice(id, auth));
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] renderInvoiceReceiptPdf(Long id, Authentication auth) {
        Invoice invoice = accessibleInvoice(id, auth);
        AppUser customer = invoice.getUser();
        CustomerBillingProfile profile =
                (billingProfileRepository != null && customer != null && customer.getId() != null)
                        ? billingProfileRepository.findById(customer.getId()).orElse(null)
                        : null;
        PaymentTransaction settledTxn = resolveSettledTransaction(invoice.getId());
        PaymentAccountSettings settings =
                paymentSettingsService != null ? paymentSettingsService.current() : null;

        InvoiceReceiptData receiptData =
                InvoiceMailServiceImpl.buildReceiptData(
                        invoice, customer, profile, settledTxn, settings);
        return InvoiceReceiptOperations.renderPdf(receiptData);
    }

    @Override
    public InvoiceEmailDispatchResponse sendInvoiceEmail(
            Long id, String recipientEmail, Authentication auth) {
        Invoice invoice = accessibleInvoice(id, auth);
        if (invoiceMailService == null) {
            throw SystemException.serviceUnavailable(
                    "Invoice email service is unavailable", "INVOICE_MAIL_UNAVAILABLE");
        }
        return invoiceMailService.sendInvoiceEmail(invoice, recipientEmail);
    }

    private PaymentTransaction resolveSettledTransaction(Long invoiceId) {
        if (paymentRepository == null || invoiceId == null) {
            return null;
        }
        var settled =
                paymentRepository.findFirstByInvoiceIdAndStatusOrderByCompletedAtDescIdDesc(
                        invoiceId, "SUCCESS");
        if (settled != null && settled.isPresent()) {
            return settled.get();
        }
        try {
            var single = paymentRepository.findByInvoiceId(invoiceId);
            return single != null
                    ? single.filter(t -> "SUCCESS".equals(t.getStatus())).orElse(null)
                    : null;
        } catch (RuntimeException ex) {
            return null;
        }
    }

    @Override
    public InvoiceResponse createInvoice(CreateInvoiceRequest request, Authentication auth) {
        getCurrentUser(auth);
        if (!permissions.has(auth, "USER_MANAGE")) {
            throw SystemException.forbidden("Permission denied", "PERMISSION_DENIED");
        }
        AppUser user =
                userRepository
                        .findById(request.userId())
                        .orElseThrow(
                                () ->
                                        SystemException.notFound(
                                                "User not found with id: " + request.userId()));

        Mission mission = null;
        if (request.missionId() != null) {
            mission =
                    missionRepository
                            .findById(request.missionId())
                            .orElseThrow(() -> SystemException.notFound("Mission not found"));
            if (!Objects.equals(mission.getCustomer().getId(), user.getId())) {
                throw SystemException.badRequest("Mission does not belong to invoice customer");
            }
            if (mission.getStatus() == MissionStatus.CANCELLED
                    || mission.getStatus() == MissionStatus.REJECTED) {
                throw SystemException.badRequest(
                        "A cancelled or rejected mission cannot be billed", "MISSION_NOT_BILLABLE");
            }
            // One bill per mission: a second open or paid invoice would let the customer pay twice.
            if (invoiceRepository.existsByMissionIdAndStatusIn(
                    mission.getId(), List.of(InvoiceStatus.PENDING, InvoiceStatus.PAID))) {
                throw SystemException.conflict(
                        "Mission already has an open or paid invoice", "INVOICE_ALREADY_EXISTS");
            }
        }

        ServicePlan plan = null;
        if (request.planId() != null) {
            plan =
                    planRepository
                            .findById(request.planId())
                            .orElseThrow(() -> SystemException.notFound("Service plan not found"));
            if (!Boolean.TRUE.equals(plan.getActive())) {
                throw SystemException.badRequest("Service plan is inactive");
            }
        }

        String code =
                "INV-"
                        + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"))
                        + "-"
                        + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        LocalDateTime dueDate = LocalDateTime.now().plusDays(configuredDueDays());

        Invoice invoice =
                new Invoice(
                        code,
                        user,
                        mission,
                        plan,
                        wholeDong(request.amount()),
                        dueDate,
                        request.notes());
        Invoice saved = invoiceRepository.save(invoice);
        if (financialEvents != null) {
            financialEvents.recordInvoiceIssued(saved);
        }
        publishInvoiceRealtime(saved);
        return billingMapper.toInvoiceResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentResponse payInvoice(Long id, PayInvoiceRequest request, Authentication auth) {
        Invoice invoice = accessibleInvoice(id, auth);
        PaymentAccountSettings settings =
                paymentSettingsService != null ? paymentSettingsService.current() : null;
        if (settings == null || !settings.configured()) {
            throw SystemException.serviceUnavailable(
                    "Payment gateway is not configured", "PAYMENT_UNAVAILABLE");
        }
        PaymentMethod method =
                request != null && request.paymentMethod() != null
                        ? request.paymentMethod()
                        : PaymentMethod.BANK_TRANSFER;
        // shortcut: only VietQR / bank transfer is wired; add a gateway adapter before enabling
        // these.
        if (method == PaymentMethod.VNPAY || method == PaymentMethod.MOMO) {
            throw SystemException.badRequest(
                    "Payment method is not supported yet", "PAYMENT_METHOD_UNSUPPORTED");
        }
        if (invoice.getStatus() == InvoiceStatus.PAID) {
            return BillingPaymentOperations.paidPaymentResponse(
                    invoice, resolveSettledTransaction(invoice.getId()), method);
        }
        if (invoice.getStatus() != InvoiceStatus.PENDING) {
            throw SystemException.conflict("Invoice is not pending payment", "INVOICE_NOT_PENDING");
        }
        BigDecimal totalDong =
                wholeDong(invoice.getAmount() != null ? invoice.getAmount() : BigDecimal.ZERO);
        String transferMemo = BankTransferServiceImpl.transferContent(invoice.getCode());
        String qrPayload =
                VietQrOperations.build(
                        settings.bankBin(), settings.accountNumber(), totalDong, transferMemo);
        return BillingPaymentOperations.pendingTransferResponse(
                invoice, totalDong, method, transferMemo, qrPayload);
    }

    @Override
    public PaymentIpnResponse processPaymentIpn(PaymentIpnRequest request) {
        return processPaymentIpn(request, null, null);
    }

    @Override
    public PaymentIpnResponse processPaymentIpn(
            PaymentIpnRequest request, String signatureHeader, Authentication auth) {
        log.info(
                "Received Payment IPN Callback for invoiceCode={}",
                request != null ? request.invoiceCode() : null);
        if (request == null) {
            throw SystemException.badRequest("Payment IPN request is required");
        }
        if (!providerEnabled || ipnSecret.length() < 32) {
            throw SystemException.serviceUnavailable(
                    "Payment gateway is not configured", "PAYMENT_UNAVAILABLE");
        }
        if (!isValidIpnSignature(request, signatureHeader)) {
            throw SystemException.unauthorized(
                    "Invalid or missing payment provider signature", "IPN_SIGNATURE_INVALID");
        }
        BillingPaymentOperations.validateIpnSuccessPayload(request);
        // Serialize provider transaction IDs, including attempts to reuse one across invoices.
        billingJdbc.queryForObject(
                "SELECT id FROM billing_payment_guard WHERE id=1 FOR UPDATE", Long.class);

        String invoiceCode = request.invoiceCode();
        Invoice invoice = null;
        if (invoiceCode != null && !invoiceCode.isBlank()) {
            invoice = invoiceRepository.findByCode(invoiceCode).orElse(null);
        }
        if (invoice == null && request.invoiceId() != null) {
            invoice = invoiceRepository.findById(request.invoiceId()).orElse(null);
        }
        if (invoice == null) {
            throw SystemException.notFound("INVOICE_NOT_FOUND");
        }

        BillingPaymentOperations.validateIpnInvoiceIdentifiers(invoice, request);
        var existing =
                paymentRepository.findByTransactionCode(request.transactionCode()).orElse(null);
        if (existing != null) {
            BillingPaymentOperations.validateDuplicateIpnTransaction(existing, invoice, request);
            return paymentResult(invoice, request.transactionCode());
        }
        if (invoice.getStatus() != InvoiceStatus.PENDING) {
            // Money arrived for an invoice already paid, cancelled or expired: keep the evidence.
            recordRejectedPayment(invoice, request, "UNMATCHED");
            throw SystemException.conflict("Invoice is not pending payment");
        }

        // VND has no minor unit: the QR shows the whole-đồng amount, so compare against that.
        BigDecimal requiredAmount =
                wholeDong(invoice.getAmount() != null ? invoice.getAmount() : BigDecimal.ZERO);
        BigDecimal paidAmount = request.amount() != null ? request.amount() : BigDecimal.ZERO;
        if (request.amount() == null
                || paidAmount.signum() <= 0
                || paidAmount.compareTo(requiredAmount) != 0) {
            recordRejectedPayment(invoice, request, "MISMATCH");
            throw SystemException.badRequest(
                    "Payment amount must match invoice amount", "INVALID_PAYMENT_AMOUNT");
        }

        String transactionCode =
                (request.transactionCode() != null && !request.transactionCode().isBlank())
                        ? request.transactionCode()
                        : "TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        completePayment(
                invoice, transactionCode, paidAmount, "VIETQR_NAPAS_247", request.toString());
        return paymentResult(invoice, transactionCode);
    }

    @Override
    public SepayWebhookResponse processSepayWebhook(
            SepayWebhookRequest request, String authorizationHeader, String webhookSecretHeader) {
        if (!providerEnabled || ipnSecret.length() < 32) {
            throw SystemException.serviceUnavailable(
                    "Payment gateway is not configured", "PAYMENT_UNAVAILABLE");
        }
        if (!SepayReconciliationOperations.isValidWebhookSecret(
                this.ipnSecret, authorizationHeader, webhookSecretHeader)) {
            throw SystemException.unauthorized(
                    "Invalid or missing webhook API key", "WEBHOOK_SECRET_INVALID");
        }
        if (request == null) {
            throw SystemException.badRequest("SePay webhook payload is required");
        }
        if (request.transferType() == null
                || !"in".equalsIgnoreCase(request.transferType().trim())) {
            return new SepayWebhookResponse(
                    true, "IGNORED_OUTGOING", "Outgoing transfer ignored", null, null);
        }

        PaymentAccountSettings accountSettings =
                paymentSettingsService != null ? paymentSettingsService.current() : null;
        if (!SepayReconciliationOperations.matchesReceivingAccount(accountSettings, request)) {
            return new SepayWebhookResponse(
                    true,
                    "IGNORED_ACCOUNT",
                    "Account number does not match configured receiving account",
                    null,
                    null);
        }

        String transactionCode = SepayReconciliationOperations.deriveTransactionCode(request);

        if (billingJdbc != null) {
            billingJdbc.queryForObject(
                    "SELECT id FROM billing_payment_guard WHERE id=1 FOR UPDATE", Long.class);
        }

        var existing = paymentRepository.findByTransactionCode(transactionCode).orElse(null);
        if (existing != null) {
            String existingInvoiceCode =
                    existing.getInvoice() != null ? existing.getInvoice().getCode() : null;
            return new SepayWebhookResponse(
                    true,
                    "DUPLICATE_IGNORED",
                    "Transaction already processed",
                    existingInvoiceCode,
                    transactionCode);
        }

        Invoice invoice =
                SepayReconciliationOperations.resolveInvoice(request, invoiceRepository)
                        .orElse(null);
        if (invoice == null) {
            return new SepayWebhookResponse(
                    true,
                    "UNMATCHED_MEMO",
                    "No matching invoice code found in transfer content",
                    null,
                    transactionCode);
        }

        String rawSummary = SepayReconciliationOperations.summarizePayload(request);
        BigDecimal paidAmount =
                request.transferAmount() != null ? request.transferAmount() : BigDecimal.ZERO;

        if (invoice.getStatus() != InvoiceStatus.PENDING) {
            recordRejectedTransfer(
                    invoice,
                    transactionCode,
                    paidAmount,
                    "VIETQR_SEPAY_AUTO",
                    request.accountNumber(),
                    rawSummary,
                    "UNMATCHED");
            return new SepayWebhookResponse(
                    true,
                    "INVOICE_NOT_PENDING",
                    "Invoice is not pending payment; recorded as unmatched transfer",
                    invoice.getCode(),
                    transactionCode);
        }

        BigDecimal requiredAmount =
                wholeDong(invoice.getAmount() != null ? invoice.getAmount() : BigDecimal.ZERO);
        if (request.transferAmount() == null
                || paidAmount.signum() <= 0
                || paidAmount.compareTo(requiredAmount) != 0) {
            recordRejectedTransfer(
                    invoice,
                    transactionCode,
                    paidAmount,
                    "VIETQR_SEPAY_AUTO",
                    request.accountNumber(),
                    rawSummary,
                    "MISMATCH");
            return new SepayWebhookResponse(
                    true,
                    "AMOUNT_MISMATCH",
                    "Transfer amount does not match invoice; recorded for admin review",
                    invoice.getCode(),
                    transactionCode);
        }

        completePayment(
                invoice,
                transactionCode,
                wholeDong(paidAmount),
                "VIETQR_SEPAY_AUTO",
                request.accountNumber(),
                rawSummary);
        return new SepayWebhookResponse(
                true,
                "PAID",
                "Đã đối soát tự động giao dịch chuyển khoản ngân hàng.",
                invoice.getCode(),
                transactionCode);
    }

    /** Invoice amounts are whole Vietnamese đồng; fractions are rounded half-up once, at creation. */
    static BigDecimal wholeDong(BigDecimal amount) {
        return amount == null ? null : amount.setScale(0, java.math.RoundingMode.HALF_UP);
    }

    /**
     * Persists a verified provider transfer that could not settle its invoice (status MISMATCH for
     * a wrong amount, UNMATCHED for a late or duplicate transfer) with the raw callback, in a
     * separate transaction, so admins see it under Billing > Transactions after the IPN is refused.
     */
    private void recordRejectedPayment(Invoice invoice, PaymentIpnRequest request, String status) {
        recordRejectedTransfer(
                invoice,
                request.transactionCode(),
                request.amount() != null ? request.amount() : BigDecimal.ZERO,
                "VIETQR_NAPAS_247",
                null,
                request.toString(),
                status);
    }

    private void recordRejectedTransfer(
            Invoice invoice,
            String transactionCode,
            BigDecimal amount,
            String gateway,
            String bankAccountNumber,
            String rawCallback,
            String status) {
        Runnable write =
                () -> {
                    if (paymentRepository.findByTransactionCode(transactionCode).isPresent())
                        return;
                    paymentRepository.save(
                            BillingPaymentOperations.buildTransaction(
                                    invoice,
                                    transactionCode,
                                    amount,
                                    gateway,
                                    bankAccountNumber,
                                    status,
                                    rawCallback,
                                    null));
                };
        try {
            if (transactionManager == null) {
                write.run();
                return;
            }
            var tx =
                    new org.springframework.transaction.support.TransactionTemplate(
                            transactionManager);
            tx.setPropagationBehavior(
                    org.springframework.transaction.TransactionDefinition.PROPAGATION_REQUIRES_NEW);
            tx.executeWithoutResult(ignored -> write.run());
        } catch (RuntimeException ex) {
            // Evidence is best effort; the IPN is still refused with its own error below.
            log.warn(
                    "Could not record rejected payment: invoiceId={}, status={}",
                    invoice.getId(),
                    status);
        }
    }

    /** Shared by the provider IPN and admin confirmation so both settle an invoice identically. */
    private void completePayment(
            Invoice invoice,
            String transactionCode,
            BigDecimal amount,
            String gateway,
            String raw) {
        completePayment(invoice, transactionCode, amount, gateway, null, raw);
    }

    private void completePayment(
            Invoice invoice,
            String transactionCode,
            BigDecimal amount,
            String gateway,
            String bankAccountNumber,
            String raw) {
        invoice.setStatus(InvoiceStatus.PAID);
        invoice.setPaidAt(LocalDateTime.now());
        invoiceRepository.save(invoice);
        if (marketplaceEscrow != null && invoice.getId() != null) {
            marketplaceEscrow.onInvoicePaid(invoice.getId());
        }

        if (invoice.getMission() != null) {
            invoice.getMission().setBillingStatus("PAID");
            if (missionRepository != null) {
                missionRepository.save(invoice.getMission());
            }
        } else if (invoice.getPlan() != null && quotaService != null) {
            // The customer paid for the invoiced plan: apply it even if it was deactivated since.
            quotaService.applyPaidPlan(invoice.getUser().getId(), invoice.getPlan());
        }

        paymentRepository.save(
                BillingPaymentOperations.buildTransaction(
                        invoice,
                        transactionCode,
                        amount,
                        gateway,
                        bankAccountNumber,
                        "SUCCESS",
                        raw,
                        LocalDateTime.now()));
        if (financialEvents != null) {
            financialEvents.recordPaymentCompleted(invoice);
        }
        if (financialEvents == null || !financialEvents.handlesPaymentNotification()) {
            notifyInvoiceSettled(invoice);
        }
        publishInvoiceRealtime(invoice);
    }

    private void publishInvoiceRealtime(Invoice invoice) {
        if (realtimeBroadcaster == null || invoice == null || invoice.getStatus() == null) {
            return;
        }
        Long customerId = invoice.getUser() != null ? invoice.getUser().getId() : null;
        realtimeBroadcaster.publishInvoiceUpdated(
                customerId, invoice.getId(), invoice.getCode(), invoice.getStatus().name());
    }

    private void notifyInvoiceSettled(Invoice invoice) {
        notifyCustomer(invoice, "Đã ghi nhận thanh toán", "Hóa đơn: " + invoice.getCode());
    }

    private void notifyCustomer(Invoice invoice, String title, String content) {
        if (invoice == null
                || invoice.getUser() == null
                || invoice.getUser().getId() == null
                || notifications == null) {
            return;
        }
        NotificationService notificationService = notifications.getIfAvailable();
        if (notificationService == null) {
            return;
        }
        try {
            notificationService.sendNotification(
                    new CreateNotificationRequest(
                            invoice.getUser().getId(),
                            title,
                            content,
                            NotificationType.PAYMENT,
                            "INVOICE",
                            invoice.getId()));
        } catch (RuntimeException ex) {
            log.warn(
                    "Unable to dispatch invoice notification for invoice {}: {}",
                    invoice.getCode(),
                    ex.getMessage());
        }
    }

    @Override
    @Transactional
    public InvoiceResponse confirmBankTransfer(Long id, String bankReference, Authentication auth) {
        AppUser actor = getCurrentUser(auth);
        if (!permissions.has(auth, "USER_MANAGE")) {
            throw SystemException.forbidden("Permission denied", "PERMISSION_DENIED");
        }
        billingJdbc.queryForObject(
                "SELECT id FROM billing_payment_guard WHERE id=1 FOR UPDATE", Long.class);
        Invoice invoice =
                invoiceRepository
                        .findById(id)
                        .orElseThrow(() -> SystemException.notFound("Invoice not found"));
        if (invoice.getStatus() != InvoiceStatus.PENDING) {
            throw SystemException.conflict("Invoice is not pending payment");
        }
        String reference = bankReference.trim();
        if (paymentRepository.findByTransactionCode(reference).isPresent()) {
            throw SystemException.conflict(
                    "Payment transaction code already used with different payload");
        }
        completePayment(
                invoice,
                reference,
                invoice.getAmount(),
                "BANK_TRANSFER_MANUAL",
                "confirmedBy=" + actor.getUsername());
        return billingMapper.toInvoiceResponse(invoice);
    }

    @Override
    @Transactional
    public InvoiceResponse subscribe(String planCode, Authentication auth) {
        AppUser user = getCurrentUser(auth);
        // Serialize subscribe calls of one customer so two clicks cannot open two plan invoices.
        userRepository.findByIdForUpdate(user.getId());
        ServicePlan plan =
                planRepository
                        .findByCode(planCode)
                        .orElseThrow(() -> SystemException.notFound("Service plan not found"));
        if (!Boolean.TRUE.equals(plan.getActive())) {
            throw SystemException.badRequest("Service plan is inactive");
        }
        // One open plan invoice at a time: re-selecting a plan returns the invoice already waiting
        // for payment.
        Invoice open =
                invoiceRepository.findByUserId(user.getId()).stream()
                        .filter(
                                i ->
                                        i.getStatus() == InvoiceStatus.PENDING
                                                && i.getMission() == null
                                                && i.getPlan() != null)
                        .filter(i -> i.getPlan().getId().equals(plan.getId()))
                        .findFirst()
                        .orElse(null);
        if (open != null) return billingMapper.toInvoiceResponse(open);
        // Choosing another plan replaces the unpaid one, so the customer can never pay for two.
        invoiceRepository.findByUserId(user.getId()).stream()
                .filter(
                        i ->
                                i.getStatus() == InvoiceStatus.PENDING
                                        && i.getMission() == null
                                        && i.getPlan() != null)
                .forEach(
                        i ->
                                close(
                                        i,
                                        InvoiceStatus.CANCELLED,
                                        "[Đổi sang gói " + plan.getCode() + "]"));
        if (plan.getPrice() == null || plan.getPrice().signum() <= 0) {
            quotaService.updateQuota(
                    user.getId(),
                    new com.uav.platform.dto.request.UpdateQuotaRequest(
                            plan.getCode(), plan.getMaxMonthlyFlightHours()));
            return null;
        }
        Invoice saved =
                invoiceRepository.save(
                        BillingPaymentOperations.buildPlanInvoice(user, plan, configuredDueDays()));
        if (financialEvents != null) {
            financialEvents.recordInvoiceIssued(saved);
        }
        publishInvoiceRealtime(saved);
        return billingMapper.toInvoiceResponse(saved);
    }

    @Override
    @Transactional
    public InvoiceResponse cancelInvoice(Long id, String reason, Authentication auth) {
        Invoice invoice = accessibleInvoice(id, auth);
        boolean admin = permissions.has(auth, "USER_MANAGE");
        if (!admin && invoice.getMission() != null) {
            throw SystemException.forbidden(
                    "A mission invoice can only be cancelled by an administrator",
                    "INVOICE_CANCEL_FORBIDDEN");
        }
        // Lock against a payment settling the same invoice at this moment.
        billingJdbc.queryForObject(
                "SELECT id FROM billing_payment_guard WHERE id=1 FOR UPDATE", Long.class);
        if (invoice.getStatus() != InvoiceStatus.PENDING) {
            throw SystemException.conflict("Invoice is not pending payment", "INVOICE_NOT_PENDING");
        }
        String note = BillingPaymentOperations.validateCancelReason(reason);
        close(
                invoice,
                InvoiceStatus.CANCELLED,
                (admin ? "[Admin hủy] " : "[Khách hủy] ") + (note == null ? "" : note));
        return billingMapper.toInvoiceResponse(invoice);
    }

    @Override
    @Transactional
    public int cancelOpenMissionInvoices(com.uav.platform.entity.Mission mission, String reason) {
        if (mission == null || mission.getId() == null) return 0;
        List<Invoice> open =
                invoiceRepository.findByMissionIdAndStatus(mission.getId(), InvoiceStatus.PENDING);
        for (Invoice invoice : open) {
            close(invoice, InvoiceStatus.CANCELLED, "[Hủy tự động] " + reason);
        }
        if (!open.isEmpty()) mission.setBillingStatus("CANCELLED");
        return open.size();
    }

    @Override
    @Transactional
    @org.springframework.scheduling.annotation.Scheduled(
            cron = "${app.billing.invoice-expiry-cron:0 5 * * * *}")
    public int expireOverduePlanInvoices() {
        List<Invoice> overdue =
                invoiceRepository.findByStatusAndDueDateBeforeAndMissionIsNull(
                        InvoiceStatus.PENDING, LocalDateTime.now());
        for (Invoice invoice : overdue) {
            close(invoice, InvoiceStatus.EXPIRED, "[Hết hạn thanh toán]");
            notifyCustomer(
                    invoice,
                    "Hóa đơn đã hết hạn",
                    "Hóa đơn "
                            + invoice.getCode()
                            + " đã quá hạn và được đóng. Hãy chọn lại gói nếu cần.");
        }
        if (!overdue.isEmpty()) log.info("Expired {} overdue plan invoices", overdue.size());
        return overdue.size();
    }

    /** Ends a pending invoice without payment and tells the customer's open screens. */
    private void close(Invoice invoice, InvoiceStatus status, String note) {
        BillingPaymentOperations.applyCloseStatus(invoice, status, note);
        invoiceRepository.save(invoice);
        publishInvoiceRealtime(invoice);
    }

    private PaymentIpnResponse paymentResult(Invoice invoice, String transactionCode) {
        return BillingPaymentOperations.paymentResult(invoice, transactionCode);
    }

    public String computeIpnSignature(PaymentIpnRequest request) {
        return BillingPaymentOperations.computeIpnSignature(this.ipnSecret, request);
    }

    private boolean isValidIpnSignature(PaymentIpnRequest request, String providedSignature) {
        return BillingPaymentOperations.isValidIpnSignature(
                this.ipnSecret, request, providedSignature);
    }
}
