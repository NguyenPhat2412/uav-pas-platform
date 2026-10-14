package com.uav.platform.modules.billing.service.impl;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.error.SystemException;
import com.uav.platform.modules.billing.common.InvoiceStatus;
import com.uav.platform.modules.billing.config.request.CreateInvoiceRequest;
import com.uav.platform.modules.billing.config.request.PayInvoiceRequest;
import com.uav.platform.modules.billing.config.request.PaymentIpnRequest;
import com.uav.platform.modules.billing.config.response.InvoiceResponse;
import com.uav.platform.modules.billing.config.response.PaymentIpnResponse;
import com.uav.platform.modules.billing.config.response.PaymentResponse;
import com.uav.platform.modules.billing.config.response.ServicePlanResponse;
import com.uav.platform.modules.billing.entity.Invoice;
import com.uav.platform.modules.billing.entity.PaymentTransaction;
import com.uav.platform.modules.billing.entity.ServicePlan;
import com.uav.platform.modules.billing.entity.UserQuota;
import com.uav.platform.modules.billing.mapper.BillingMapper;
import com.uav.platform.modules.billing.repository.InvoiceRepository;
import com.uav.platform.modules.billing.repository.PaymentTransactionRepository;
import com.uav.platform.modules.billing.repository.ServicePlanRepository;
import com.uav.platform.modules.billing.repository.UserQuotaRepository;
import com.uav.platform.modules.billing.service.BillingService;
import com.uav.platform.modules.mission.entity.Mission;
import com.uav.platform.modules.mission.repository.MissionRepository;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.repository.UserRepository;
import com.uav.platform.modules.user.service.PermissionService;
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
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Service
@Transactional
public class IBillingService implements BillingService {

    private final ServicePlanRepository planRepository;
    private final InvoiceRepository invoiceRepository;
    private final PaymentTransactionRepository paymentRepository;
    private final UserRepository userRepository;
    private final MissionRepository missionRepository;
    private final PermissionService permissions;
    private final UserQuotaRepository quotaRepository;
    private final WebhookService webhookService;
    private final String ipnSecret;

    public IBillingService(ServicePlanRepository planRepository,
                           InvoiceRepository invoiceRepository,
                           PaymentTransactionRepository paymentRepository,
                           UserRepository userRepository,
                           MissionRepository missionRepository,
                           PermissionService permissions) {
        this(planRepository, invoiceRepository, paymentRepository, userRepository, missionRepository, permissions, null, null, "vju_sec_napas_ipn_pay_2026");
    }

    public IBillingService(ServicePlanRepository planRepository,
                           InvoiceRepository invoiceRepository,
                           PaymentTransactionRepository paymentRepository,
                           UserRepository userRepository,
                           MissionRepository missionRepository,
                           PermissionService permissions,
                           UserQuotaRepository quotaRepository,
                           WebhookService webhookService) {
        this(planRepository, invoiceRepository, paymentRepository, userRepository, missionRepository, permissions, quotaRepository, webhookService, "vju_sec_napas_ipn_pay_2026");
    }

    @Autowired
    public IBillingService(ServicePlanRepository planRepository,
                           InvoiceRepository invoiceRepository,
                           PaymentTransactionRepository paymentRepository,
                           UserRepository userRepository,
                           MissionRepository missionRepository,
                           PermissionService permissions,
                           @Autowired(required = false) UserQuotaRepository quotaRepository,
                           @Autowired(required = false) WebhookService webhookService,
                           @org.springframework.beans.factory.annotation.Value("${app.billing.ipn-secret:vju_sec_napas_ipn_pay_2026}") String ipnSecret) {
        this.planRepository = planRepository;
        this.invoiceRepository = invoiceRepository;
        this.paymentRepository = paymentRepository;
        this.userRepository = userRepository;
        this.missionRepository = missionRepository;
        this.permissions = permissions;
        this.quotaRepository = quotaRepository;
        this.webhookService = webhookService;
        this.ipnSecret = (ipnSecret != null && !ipnSecret.isBlank()) ? ipnSecret : "vju_sec_napas_ipn_pay_2026";
    }

    private AppUser getCurrentUser(Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || auth instanceof org.springframework.security.authentication.AnonymousAuthenticationToken) {
            throw SystemException.unauthorized("Authentication required");
        }
        return userRepository.findByUsername(auth.getName())
            .filter(user -> user.isEnabled() && user.isAccountNonLocked())
            .orElseThrow(() -> SystemException.unauthorized("Authentication required"));
    }

    private Invoice accessibleInvoice(Long id, Authentication auth) {
        AppUser user = getCurrentUser(auth);
        Invoice invoice = invoiceRepository.findById(id)
            .orElseThrow(() -> SystemException.notFound("Invoice not found"));
        if (!Objects.equals(invoice.getUser().getId(), user.getId()) && !permissions.has(auth, "USER_MANAGE")) {
            throw SystemException.notFound("Invoice not found");
        }
        return invoice;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ServicePlanResponse> listActivePlans() {
        return planRepository.findByActiveTrue().stream().map(BillingMapper::toPlanResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<InvoiceResponse> listInvoices(Authentication auth, Pageable pageable) {
        AppUser user = getCurrentUser(auth);
        boolean canManage = permissions.has(auth, "USER_MANAGE");

        Page<Invoice> page = canManage
            ? invoiceRepository.findAll(pageable)
            : invoiceRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), pageable);

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
            throw new SystemException("Permission denied", HttpStatus.FORBIDDEN, "PERMISSION_DENIED");
        }
        AppUser user = userRepository.findById(request.userId())
            .orElseThrow(() -> SystemException.notFound("User not found with id: " + request.userId()));

        Mission mission = null;
        if (request.missionId() != null) {
            mission = missionRepository.findById(request.missionId())
                .orElseThrow(() -> SystemException.notFound("Mission not found"));
            if (!Objects.equals(mission.getCustomer().getId(), user.getId())) {
                throw SystemException.badRequest("Mission does not belong to invoice customer");
            }
        }

        ServicePlan plan = null;
        if (request.planId() != null) {
            plan = planRepository.findById(request.planId())
                .orElseThrow(() -> SystemException.notFound("Service plan not found"));
            if (!Boolean.TRUE.equals(plan.getActive())) {
                throw SystemException.badRequest("Service plan is inactive");
            }
        }

        String code = "INV-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd")) + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        LocalDateTime dueDate = LocalDateTime.now().plusDays(7);

        Invoice invoice = new Invoice(code, user, mission, plan, request.amount(), dueDate, request.notes());
        Invoice saved = invoiceRepository.save(invoice);
        return BillingMapper.toInvoiceResponse(saved);
    }

    @Override
    public PaymentResponse payInvoice(Long id, PayInvoiceRequest request, Authentication auth) {
        accessibleInvoice(id, auth);
        throw new SystemException("Payment gateway is not configured", HttpStatus.SERVICE_UNAVAILABLE, "PAYMENT_UNAVAILABLE");
    }

    @Override
    public PaymentIpnResponse processPaymentIpn(PaymentIpnRequest request) {
        return processPaymentIpn(request, this.ipnSecret, null);
    }

    @Override
    public PaymentIpnResponse processPaymentIpn(PaymentIpnRequest request, String signatureHeader, Authentication auth) {
        if (request == null) {
            throw SystemException.badRequest("Payment IPN request is required");
        }
        boolean validSignature = isValidIpnSignature(request, signatureHeader);
        boolean isAuthenticated = auth != null && auth.isAuthenticated()
            && !(auth instanceof org.springframework.security.authentication.AnonymousAuthenticationToken);

        if (!validSignature && !isAuthenticated) {
            throw new SystemException("Invalid or missing VietQR IPN signature", HttpStatus.UNAUTHORIZED, "IPN_SIGNATURE_INVALID");
        }

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

        if (!validSignature) {
            AppUser currentUser = getCurrentUser(auth);
            boolean isOwner = invoice.getUser() != null && Objects.equals(invoice.getUser().getId(), currentUser.getId());
            boolean canManage = permissions != null && permissions.has(auth, "USER_MANAGE");
            if (!isOwner && !canManage) {
                throw new SystemException("Permission denied for invoice IPN", HttpStatus.FORBIDDEN, "PERMISSION_DENIED");
            }
        }

        if (invoice.getStatus() == InvoiceStatus.PAID) {
            throw new SystemException("Invoice is already paid", HttpStatus.CONFLICT, "INVOICE_ALREADY_PAID");
        }

        BigDecimal requiredAmount = invoice.getAmount() != null ? invoice.getAmount() : BigDecimal.ZERO;
        BigDecimal paidAmount = request.amount() != null ? request.amount() : BigDecimal.ZERO;
        if (paidAmount.compareTo(requiredAmount) < 0) {
            throw new SystemException("Payment amount is less than required invoice amount", HttpStatus.BAD_REQUEST, "INVALID_PAYMENT_AMOUNT");
        }

        String transactionCode = (request.transactionCode() != null && !request.transactionCode().isBlank())
            ? request.transactionCode()
            : "TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        invoice.setStatus(InvoiceStatus.PAID);
        invoice.setPaidAt(LocalDateTime.now());
        invoiceRepository.save(invoice);

        UserQuota quota = quotaRepository != null && invoice.getUser() != null
            ? quotaRepository.findByUserId(invoice.getUser().getId()).orElse(null)
            : null;
        if (quota != null) {
            quota.setFlightHoursLimit(quota.getFlightHoursLimit() + 50.0);
            quota.setCycleEnd(LocalDateTime.now().plusMonths(1));
            quotaRepository.save(quota);
        }

        PaymentTransaction txn = new PaymentTransaction(
            invoice,
            invoice.getUser(),
            transactionCode,
            paidAmount
        );
        txn.setGatewayName("VIETQR_NAPAS_247");
        txn.setStatus(request.status() != null ? request.status() : "SUCCESS");
        txn.setCompletedAt(LocalDateTime.now());
        txn.setRawIpnCallback(request.toString());
        paymentRepository.save(txn);

        if (webhookService != null) {
            webhookService.broadcastEvent("PAYMENT_COMPLETED", Map.of(
                "invoiceCode", invoice.getCode(),
                "transactionCode", transactionCode,
                "amount", invoice.getAmount(),
                "customerUsername", invoice.getUser() != null ? invoice.getUser().getUsername() : "CUSTOMER",
                "paidAt", invoice.getPaidAt().toString(),
                "quotaNewLimit", quota != null ? quota.getFlightHoursLimit() : 0
            ));
        }

        return new PaymentIpnResponse(
            "00",
            "PAYMENT_PROCESSED_SUCCESSFULLY",
            "Giao dịch thanh toán VietQR hợp lệ. Đã kích hoạt hạn mức giờ bay cho khách hàng.",
            invoice.getCode(),
            transactionCode
        );
    }

    public String computeIpnSignature(PaymentIpnRequest request) {
        String canonical = (request.invoiceCode() != null ? request.invoiceCode() : String.valueOf(request.invoiceId()))
            + "|" + (request.amount() != null ? request.amount().toPlainString() : "0")
            + "|" + (request.transactionCode() != null ? request.transactionCode() : "");
        try {
            javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
            javax.crypto.spec.SecretKeySpec keySpec = new javax.crypto.spec.SecretKeySpec(
                this.ipnSecret.getBytes(java.nio.charset.StandardCharsets.UTF_8), "HmacSHA256"
            );
            mac.init(keySpec);
            return java.util.HexFormat.of().formatHex(mac.doFinal(canonical.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Unable to compute HMAC-SHA256 for IPN", e);
        }
    }

    private boolean isValidIpnSignature(PaymentIpnRequest request, String providedSignature) {
        if (providedSignature == null || providedSignature.isBlank()) {
            return false;
        }
        byte[] providedBytes = providedSignature.trim().getBytes(java.nio.charset.StandardCharsets.UTF_8);
        byte[] secretBytes = this.ipnSecret.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        if (java.security.MessageDigest.isEqual(providedBytes, secretBytes)) {
            return true;
        }
        String expectedHmac = computeIpnSignature(request);
        return java.security.MessageDigest.isEqual(
            providedBytes,
            expectedHmac.getBytes(java.nio.charset.StandardCharsets.UTF_8)
        );
    }
}
