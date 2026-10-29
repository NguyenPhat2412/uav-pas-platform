package com.uav.platform.modules.billing.controller;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.common.util.Pageables;
import com.uav.platform.modules.billing.dto.request.CreateInvoiceRequest;
import com.uav.platform.modules.billing.dto.request.PayInvoiceRequest;
import com.uav.platform.modules.billing.dto.request.UpdateQuotaRequest;
import com.uav.platform.modules.billing.dto.response.InvoiceResponse;
import com.uav.platform.modules.billing.dto.response.PaymentResponse;
import com.uav.platform.modules.billing.dto.response.ServicePlanResponse;
import com.uav.platform.modules.billing.dto.response.UserQuotaResponse;
import com.uav.platform.modules.billing.enums.InvoiceStatus;
import com.uav.platform.modules.billing.service.BillingService;
import com.uav.platform.modules.billing.service.QuotaService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/billing")
@RequiredArgsConstructor
public class BillingController {

    private final BillingService billingService;
    private final QuotaService quotaService;

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
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(quotaService.listQuotas(Pageables.of(page, size)));
    }

    @GetMapping("/admin/quotas/{userId}")
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<UserQuotaResponse> getQuotaByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(quotaService.getQuotaByUserId(userId));
    }

    @PutMapping("/admin/quotas/{userId}")
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<UserQuotaResponse> updateQuota(
            @PathVariable Long userId, @Valid @RequestBody UpdateQuotaRequest request) {
        return ResponseEntity.ok(quotaService.updateQuota(userId, request));
    }

    @GetMapping("/invoices")
    public ResponseEntity<PageResponse<InvoiceResponse>> listInvoices(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) InvoiceStatus status,
            @RequestParam(defaultValue = "false") boolean overdue,
            Authentication auth) {
        return ResponseEntity.ok(
                billingService.listInvoices(
                        auth, Pageables.desc(page, size, "createdAt"), status, overdue));
    }

    @GetMapping("/invoices/{id}")
    public ResponseEntity<InvoiceResponse> getInvoice(@PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(billingService.getInvoice(id, auth));
    }

    @PostMapping("/invoices")
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<InvoiceResponse> createInvoice(
            @Valid @RequestBody CreateInvoiceRequest request, Authentication auth) {
        return ResponseEntity.status(201).body(billingService.createInvoice(request, auth));
    }

    @PostMapping("/invoices/{id}/pay")
    public ResponseEntity<PaymentResponse> payInvoice(
            @PathVariable Long id,
            @RequestBody(required = false) PayInvoiceRequest request,
            Authentication auth) {
        return ResponseEntity.ok(billingService.payInvoice(id, request, auth));
    }
}
