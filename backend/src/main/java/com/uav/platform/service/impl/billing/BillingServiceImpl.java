package com.uav.platform.service.impl.billing;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dto.record.billing.IpnSignaturePayload;
import com.uav.platform.dto.request.billing.CreateInvoiceRequest;
import com.uav.platform.dto.request.billing.PayInvoiceRequest;
import com.uav.platform.dto.request.billing.PaymentIpnRequest;
import com.uav.platform.dto.response.billing.InvoiceResponse;
import com.uav.platform.dto.response.billing.PaymentIpnResponse;
import com.uav.platform.dto.response.billing.PaymentResponse;
import com.uav.platform.dto.response.billing.ServicePlanResponse;
import com.uav.platform.entity.billing.Invoice;
import com.uav.platform.entity.billing.PaymentTransaction;
import com.uav.platform.entity.billing.ServicePlan;
import com.uav.platform.entity.mission.Mission;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.billing.InvoiceStatus;
import com.uav.platform.error.SystemException;
import com.uav.platform.mapper.billing.BillingMapper;
import com.uav.platform.repository.billing.InvoiceRepository;
import com.uav.platform.repository.billing.PaymentTransactionRepository;
import com.uav.platform.repository.billing.ServicePlanRepository;
import com.uav.platform.repository.billing.UserQuotaRepository;
import com.uav.platform.repository.mission.MissionRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.billing.BillingService;
import com.uav.platform.service.impl.user.UserAccountServiceImpl;
import com.uav.platform.service.permission.PermissionService;
import com.uav.platform.service.webhook.WebhookService;

import lombok.extern.slf4j.Slf4j;

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

    private final ServicePlanRepository planRepository;
    private final InvoiceRepository invoiceRepository;
    private final PaymentTransactionRepository paymentRepository;
    private final UserRepository userRepository;
    private final MissionRepository missionRepository;
    private final PermissionService permissions;
    private final UserQuotaRepository quotaRepository;
    private final WebhookService webhookService;
    private final String ipnSecret;
    private final BillingMapper billingMapper;

    @org.springframework.beans.factory.annotation.Value("${app.billing.provider-enabled:false}")
    private boolean providerEnabled;

    @Autowired private com.uav.platform.service.webhook.FinancialOutboxService financialEvents;

    @Autowired private org.springframework.jdbc.core.JdbcTemplate billingJdbc;
    @Autowired private com.uav.platform.service.billing.QuotaService quotaService;

    /** Writes rejected-payment evidence in its own transaction so it survives the rejection. */
    @Autowired(required = false)
    private org.springframework.transaction.PlatformTransactionManager transactionManager;

    public BillingServiceImpl(
            ServicePlanRepository planRepository,
            InvoiceRepository invoiceRepository,
            PaymentTransactionRepository paymentRepository,
            UserRepository userRepository,
            MissionRepository missionRepository,
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
            ServicePlanRepository planRepository,
            InvoiceRepository invoiceRepository,
            PaymentTransactionRepository paymentRepository,
            UserRepository userRepository,
            MissionRepository missionRepository,
            PermissionService permissions,
            UserQuotaRepository quotaRepository,
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
            ServicePlanRepository planRepository,
            InvoiceRepository invoiceRepository,
            PaymentTransactionRepository paymentRepository,
            UserRepository userRepository,
            MissionRepository missionRepository,
            PermissionService permissions,
            UserQuotaRepository quotaRepository,
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
            ServicePlanRepository planRepository,
            InvoiceRepository invoiceRepository,
            PaymentTransactionRepository paymentRepository,
            UserRepository userRepository,
            MissionRepository missionRepository,
            PermissionService permissions,
            @Autowired(required = false) UserQuotaRepository quotaRepository,
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
    static org.springframework.data.jpa.domain.Specification<Invoice> invoiceFilter(
            Long ownerId, InvoiceStatus status, boolean overdue, LocalDateTime now) {
        return (root, query, cb) -> {
            java.util.List<jakarta.persistence.criteria.Predicate> where =
                    new java.util.ArrayList<>();
            if (ownerId != null) where.add(cb.equal(root.get("user").get("id"), ownerId));
            if (status != null) where.add(cb.equal(root.get("status"), status));
            if (overdue) {
                where.add(cb.equal(root.get("status"), InvoiceStatus.PENDING));
                where.add(cb.lessThan(root.get("dueDate"), now));
            }
            return cb.and(where.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
    }

    @Override
    @Transactional(readOnly = true)
    public InvoiceResponse getInvoice(Long id, Authentication auth) {
        return billingMapper.toInvoiceResponse(accessibleInvoice(id, auth));
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
        LocalDateTime dueDate = LocalDateTime.now().plusDays(7);

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
        financialEvents.recordInvoiceIssued(saved);
        return billingMapper.toInvoiceResponse(saved);
    }

    @Override
    public PaymentResponse payInvoice(Long id, PayInvoiceRequest request, Authentication auth) {
        accessibleInvoice(id, auth);
        throw SystemException.serviceUnavailable(
                "Payment gateway is not configured", "PAYMENT_UNAVAILABLE");
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
        if (!"SUCCESS".equals(request.status())
                || request.transactionCode() == null
                || request.transactionCode().isBlank()
                || request.transactionCode().length() > 100) {
            throw SystemException.badRequest(
                    "Successful provider transaction and transaction code are required");
        }
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

        if ((invoiceCode != null
                        && !invoiceCode.isBlank()
                        && !invoiceCode.equals(invoice.getCode()))
                || (request.invoiceId() != null && !request.invoiceId().equals(invoice.getId()))) {
            throw SystemException.conflict("Invoice identifiers do not match");
        }
        var existing =
                paymentRepository.findByTransactionCode(request.transactionCode()).orElse(null);
        if (existing != null) {
            if (!existing.getInvoice().getId().equals(invoice.getId())
                    || request.amount() == null
                    || existing.getAmount().compareTo(request.amount()) != 0
                    || !"SUCCESS".equals(existing.getStatus())) {
                throw SystemException.conflict(
                        "Payment transaction code already used with different payload");
            }
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
        Runnable write =
                () -> {
                    if (paymentRepository
                            .findByTransactionCode(request.transactionCode())
                            .isPresent()) return;
                    PaymentTransaction txn =
                            PaymentTransactionOperations.create(
                                    invoice,
                                    invoice.getUser(),
                                    request.transactionCode(),
                                    request.amount() != null ? request.amount() : BigDecimal.ZERO);
                    txn.setGatewayName("VIETQR_NAPAS_247");
                    txn.setStatus(status);
                    txn.setRawIpnCallback(request.toString());
                    paymentRepository.save(txn);
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
        invoice.setStatus(InvoiceStatus.PAID);
        invoice.setPaidAt(LocalDateTime.now());
        invoiceRepository.save(invoice);

        if (invoice.getMission() == null && invoice.getPlan() != null) {
            // The customer paid for the invoiced plan: apply it even if it was deactivated since.
            quotaService.applyPaidPlan(invoice.getUser().getId(), invoice.getPlan());
        }

        PaymentTransaction txn =
                PaymentTransactionOperations.create(
                        invoice, invoice.getUser(), transactionCode, amount);
        txn.setGatewayName(gateway);
        txn.setStatus("SUCCESS");
        txn.setCompletedAt(LocalDateTime.now());
        txn.setRawIpnCallback(raw);
        paymentRepository.save(txn);
        financialEvents.recordPaymentCompleted(invoice);
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
        if (plan.getPrice() == null || plan.getPrice().signum() <= 0) {
            quotaService.updateQuota(
                    user.getId(),
                    new com.uav.platform.dto.request.billing.UpdateQuotaRequest(
                            plan.getCode(), plan.getMaxMonthlyFlightHours()));
            return null;
        }
        String code =
                "INV-"
                        + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"))
                        + "-"
                        + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        Invoice invoice =
                new Invoice(
                        code,
                        user,
                        null,
                        plan,
                        wholeDong(plan.getPrice()),
                        LocalDateTime.now().plusDays(7),
                        "PLAN_SUBSCRIPTION:" + plan.getCode());
        Invoice saved = invoiceRepository.save(invoice);
        financialEvents.recordInvoiceIssued(saved);
        return billingMapper.toInvoiceResponse(saved);
    }

    private PaymentIpnResponse paymentResult(Invoice invoice, String transactionCode) {
        return new PaymentIpnResponse(
                "00",
                "PAYMENT_PROCESSED_SUCCESSFULLY",
                "Đã ghi nhận thanh toán có xác thực từ nhà cung cấp.",
                invoice.getCode(),
                transactionCode);
    }

    public String computeIpnSignature(PaymentIpnRequest request) {
        String canonical = IpnSignaturePayload.from(request).canonical();
        try {
            javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
            javax.crypto.spec.SecretKeySpec keySpec =
                    new javax.crypto.spec.SecretKeySpec(
                            this.ipnSecret.getBytes(java.nio.charset.StandardCharsets.UTF_8),
                            "HmacSHA256");
            mac.init(keySpec);
            return java.util.HexFormat.of()
                    .formatHex(
                            mac.doFinal(
                                    canonical.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Unable to compute HMAC-SHA256 for IPN", e);
        }
    }

    private boolean isValidIpnSignature(PaymentIpnRequest request, String providedSignature) {
        if (providedSignature == null || providedSignature.isBlank()) {
            return false;
        }
        byte[] providedBytes =
                providedSignature.trim().getBytes(java.nio.charset.StandardCharsets.UTF_8);
        String expectedHmac = computeIpnSignature(request);
        return java.security.MessageDigest.isEqual(
                providedBytes, expectedHmac.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }
}
