package com.uav.platform.controller.billing;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.common.util.Pageables;
import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.dto.request.billing.CreateInvoiceRequest;
import com.uav.platform.dto.request.billing.PayInvoiceRequest;
import com.uav.platform.dto.request.billing.UpdateQuotaRequest;
import com.uav.platform.dto.response.billing.InvoiceResponse;
import com.uav.platform.dto.response.billing.PaymentResponse;
import com.uav.platform.dto.response.billing.ServicePlanResponse;
import com.uav.platform.dto.response.billing.UserQuotaResponse;
import com.uav.platform.enums.billing.InvoiceStatus;
import com.uav.platform.service.billing.BillingService;
import com.uav.platform.service.billing.QuotaService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(ApiRoutes.Billing.BASE)
@RequiredArgsConstructor
public class BillingController {

    private final BillingService billingService;
    private final QuotaService quotaService;

    @GetMapping(ApiRoutes.Billing.PLANS)
    public ResponseEntity<List<ServicePlanResponse>> listPlans() {
        return ResponseEntity.ok(billingService.listActivePlans());
    }

    @GetMapping(ApiRoutes.Billing.QUOTA)
    public ResponseEntity<UserQuotaResponse> getQuota(Authentication auth) {
        return ResponseEntity.ok(quotaService.getQuota(auth));
    }

    @GetMapping(ApiRoutes.Billing.ADMIN_QUOTAS)
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<PageResponse<UserQuotaResponse>> listQuotas(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(quotaService.listQuotas(Pageables.of(page, size)));
    }

    @GetMapping(ApiRoutes.Billing.ADMIN_QUOTA_BY_USER)
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<UserQuotaResponse> getQuotaByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(quotaService.getQuotaByUserId(userId));
    }

    @PutMapping(ApiRoutes.Billing.ADMIN_QUOTA_BY_USER)
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<UserQuotaResponse> updateQuota(
            @PathVariable Long userId, @Valid @RequestBody UpdateQuotaRequest request) {
        return ResponseEntity.ok(quotaService.updateQuota(userId, request));
    }

    @GetMapping(ApiRoutes.Billing.INVOICES)
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

    @GetMapping(ApiRoutes.Billing.INVOICE_BY_ID)
    public ResponseEntity<InvoiceResponse> getInvoice(@PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(billingService.getInvoice(id, auth));
    }

    @PostMapping(ApiRoutes.Billing.INVOICES)
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<InvoiceResponse> createInvoice(
            @Valid @RequestBody CreateInvoiceRequest request, Authentication auth) {
        return ResponseEntity.status(201).body(billingService.createInvoice(request, auth));
    }

    @PostMapping(ApiRoutes.Billing.PAY_INVOICE)
    public ResponseEntity<PaymentResponse> payInvoice(
            @PathVariable Long id,
            @RequestBody(required = false) PayInvoiceRequest request,
            Authentication auth) {
        return ResponseEntity.ok(billingService.payInvoice(id, request, auth));
    }
}
