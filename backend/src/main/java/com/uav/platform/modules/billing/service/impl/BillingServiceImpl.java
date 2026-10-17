package com.uav.platform.modules.billing.service.impl;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.error.SystemException;
import com.uav.platform.modules.billing.dto.request.CreateInvoiceRequest;
import com.uav.platform.modules.billing.dto.request.PayInvoiceRequest;
import com.uav.platform.modules.billing.dto.request.PaymentIpnRequest;
import com.uav.platform.modules.billing.dto.response.InvoiceResponse;
import com.uav.platform.modules.billing.dto.response.PaymentIpnResponse;
import com.uav.platform.modules.billing.dto.response.PaymentResponse;
import com.uav.platform.modules.billing.dto.response.ServicePlanResponse;
import com.uav.platform.modules.billing.entity.Invoice;
import com.uav.platform.modules.billing.entity.PaymentTransaction;
import com.uav.platform.modules.billing.entity.ServicePlan;
import com.uav.platform.modules.billing.enums.InvoiceStatus;
import com.uav.platform.modules.billing.mapper.BillingMapper;
import com.uav.platform.modules.billing.repository.InvoiceRepository;
import com.uav.platform.modules.billing.repository.PaymentTransactionRepository;
import com.uav.platform.modules.billing.repository.ServicePlanRepository;
import com.uav.platform.modules.billing.repository.UserQuotaRepository;
import com.uav.platform.modules.billing.service.BillingService;
import com.uav.platform.modules.mission.entity.Mission;
import com.uav.platform.modules.mission.repository.MissionRepository;
import com.uav.platform.modules.permission.service.PermissionService;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.repository.UserRepository;
import com.uav.platform.modules.webhook.service.WebhookService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

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

    @org.springframework.beans.factory.annotation.Value("${app.billing.provider-enabled:false}")
    private boolean providerEnabled;

    @Autowired
    private com.uav.platform.modules.webhook.service.FinancialOutboxService financialEvents;

    @Autowired private org.springframework.jdbc.core.JdbcTemplate billingJdbc;
    @Autowired private com.uav.platform.modules.billing.service.QuotaService quotaService;

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
                    String ipnSecret) {
        this.planRepository = planRepository;
        this.invoiceRepository = invoiceRepository;
        this.paymentRepository = paymentRepository;
        this.userRepository = userRepository;
        this.missionRepository = missionRepository;
        this.permissions = permissions;
        this.quotaRepository = quotaRepository;
        this.webhookService = webhookService;
        this.ipnSecret = (ipnSecret != null && !ipnSecret.isBlank()) ? ipnSecret : "";
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
                .filter(user -> user.isEnabled() && user.isAccountNonLocked())
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
                .map(BillingMapper::toPlanResponse)
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

        return PageResponse.from(page.map(BillingMapper::toInvoiceResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public InvoiceResponse getInvoice(Long id, Authentication auth) {
        return BillingMapper.toInvoiceResponse(accessibleInvoice(id, auth));
    }

    @Override
    public InvoiceResponse createInvoice(CreateInvoiceRequest request, Authentication auth) {
        getCurrentUser(auth);
        if (!permissions.has(auth, "USER_MANAGE")) {
            throw new SystemException(
                    "Permission denied", HttpStatus.FORBIDDEN, "PERMISSION_DENIED");
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
                new Invoice(code, user, mission, plan, request.amount(), dueDate, request.notes());
        Invoice saved = invoiceRepository.save(invoice);
        financialEvents.recordInvoiceIssued(saved);
        return BillingMapper.toInvoiceResponse(saved);
    }

    @Override
    public PaymentResponse payInvoice(Long id, PayInvoiceRequest request, Authentication auth) {
        accessibleInvoice(id, auth);
        throw new SystemException(
                "Payment gateway is not configured",
                HttpStatus.SERVICE_UNAVAILABLE,
                "PAYMENT_UNAVAILABLE");
    }

    @Override
    public PaymentIpnResponse processPaymentIpn(PaymentIpnRequest request) {
        return processPaymentIpn(request, null, null);
    }

    @Override
    public PaymentIpnResponse processPaymentIpn(
            PaymentIpnRequest request, String signatureHeader, Authentication auth) {
        if (request == null) {
            throw SystemException.badRequest("Payment IPN request is required");
        }
        if (!providerEnabled || ipnSecret.length() < 32) {
            throw new SystemException(
                    "Payment gateway is not configured",
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "PAYMENT_UNAVAILABLE");
        }
        if (!isValidIpnSignature(request, signatureHeader)) {
            throw new SystemException(
                    "Invalid or missing payment provider signature",
                    HttpStatus.UNAUTHORIZED,
                    "IPN_SIGNATURE_INVALID");
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
            throw SystemException.conflict("Invoice is not pending payment");
        }

        BigDecimal requiredAmount =
                invoice.getAmount() != null ? invoice.getAmount() : BigDecimal.ZERO;
        BigDecimal paidAmount = request.amount() != null ? request.amount() : BigDecimal.ZERO;
        if (request.amount() == null
                || paidAmount.signum() <= 0
                || paidAmount.compareTo(requiredAmount) != 0) {
            throw new SystemException(
                    "Payment amount must match invoice amount",
                    HttpStatus.BAD_REQUEST,
                    "INVALID_PAYMENT_AMOUNT");
        }

        String transactionCode =
                (request.transactionCode() != null && !request.transactionCode().isBlank())
                        ? request.transactionCode()
                        : "TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        invoice.setStatus(InvoiceStatus.PAID);
        invoice.setPaidAt(LocalDateTime.now());
        invoiceRepository.save(invoice);

        if (invoice.getMission() == null && invoice.getPlan() != null) {
            // Applying a plan changes limits only; consumed hours and cycle dates are retained.
            quotaService.updateQuota(
                    invoice.getUser().getId(),
                    new com.uav.platform.modules.billing.dto.request.UpdateQuotaRequest(
                            invoice.getPlan().getCode(),
                            invoice.getPlan().getMaxMonthlyFlightHours()));
        }

        PaymentTransaction txn =
                new PaymentTransaction(invoice, invoice.getUser(), transactionCode, paidAmount);
        txn.setGatewayName("VIETQR_NAPAS_247");
        txn.setStatus(request.status() != null ? request.status() : "SUCCESS");
        txn.setCompletedAt(LocalDateTime.now());
        txn.setRawIpnCallback(request.toString());
        paymentRepository.save(txn);
        financialEvents.recordPaymentCompleted(invoice);

        return paymentResult(invoice, transactionCode);
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
        String canonical =
                (request.invoiceCode() != null ? request.invoiceCode() : "")
                        + "|"
                        + (request.invoiceId() != null ? request.invoiceId() : "")
                        + "|"
                        + (request.amount() != null
                                ? request.amount().stripTrailingZeros().toPlainString()
                                : "")
                        + "|"
                        + (request.transactionCode() != null ? request.transactionCode() : "")
                        + "|"
                        + (request.status() != null ? request.status() : "");
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
