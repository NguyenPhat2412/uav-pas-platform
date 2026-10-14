package com.uav.platform.modules.billing.controller;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.modules.billing.config.request.CreateInvoiceRequest;
import com.uav.platform.modules.billing.config.request.PayInvoiceRequest;
import com.uav.platform.modules.billing.config.request.UpdateQuotaRequest;
import com.uav.platform.modules.billing.config.response.InvoiceResponse;
import com.uav.platform.modules.billing.config.response.PaymentResponse;
import com.uav.platform.modules.billing.config.response.ServicePlanResponse;
import com.uav.platform.modules.billing.config.response.UserQuotaResponse;
import com.uav.platform.modules.billing.service.BillingService;
import com.uav.platform.modules.billing.service.QuotaService;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/billing")
public class BillingController {

    private final BillingService billingService;
    private final QuotaService quotaService;

    public BillingController(BillingService billingService, QuotaService quotaService) {
        this.billingService = billingService;
        this.quotaService = quotaService;
    }

    @GetMapping("/plans")
    public ResponseEntity<List<ServicePlanResponse>> listPlans() {
        return ResponseEntity.ok(billingService.listActivePlans());
    }

    @GetMapping("/quota")
    public ResponseEntity<UserQuotaResponse> getQuota(Authentication auth) {
        return ResponseEntity.ok(quotaService.getQuota(auth));
    }

    @GetMapping("/admin/quotas")
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<PageResponse<UserQuotaResponse>> listQuotas(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(quotaService.listQuotas(PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100))));
    }

    @PutMapping("/admin/quotas/{userId}")
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<UserQuotaResponse> updateQuota(
        @PathVariable Long userId,
        @Valid @RequestBody UpdateQuotaRequest request
    ) {
        return ResponseEntity.ok(quotaService.updateQuota(userId, request));
    }

    @GetMapping("/invoices")
    public ResponseEntity<PageResponse<InvoiceResponse>> listInvoices(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        Authentication auth
    ) {
        return ResponseEntity.ok(billingService.listInvoices(auth, PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100), Sort.by("createdAt").descending())));
    }

    @GetMapping("/invoices/{id}")
    public ResponseEntity<InvoiceResponse> getInvoice(@PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(billingService.getInvoice(id, auth));
    }

    @PostMapping("/invoices")
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<InvoiceResponse> createInvoice(@Valid @RequestBody CreateInvoiceRequest request, Authentication auth) {
        return ResponseEntity.status(201).body(billingService.createInvoice(request, auth));
    }

    @PostMapping("/invoices/{id}/pay")
    public ResponseEntity<PaymentResponse> payInvoice(
        @PathVariable Long id,
        @RequestBody(required = false) PayInvoiceRequest request,
        Authentication auth
    ) {
        return ResponseEntity.ok(billingService.payInvoice(id, request, auth));
    }
}
