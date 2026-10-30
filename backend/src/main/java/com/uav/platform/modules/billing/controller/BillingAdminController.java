package com.uav.platform.modules.billing.controller;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.common.util.Pageables;
import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.modules.billing.dto.response.PaymentTransactionAdminResponse;
import com.uav.platform.modules.billing.service.BillingAdminService;
import com.uav.platform.modules.webhook.dto.response.FinancialOutboxEventResponse;
import com.uav.platform.modules.webhook.service.FinancialOutboxAdminService;

import lombok.RequiredArgsConstructor;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

/** Operator views over payment/IPN records and the financial event outbox. */
@RestController
@RequestMapping(ApiRoutes.Billing.ADMIN)
@RequiredArgsConstructor
public class BillingAdminController {
    private final BillingAdminService billingAdmin;
    private final FinancialOutboxAdminService outbox;

    @GetMapping("/transactions")
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<PageResponse<PaymentTransactionAdminResponse>> transactions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String gateway,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate to,
            @RequestParam(required = false) Long invoiceId,
            @RequestParam(required = false) String q) {
        return ResponseEntity.ok(
                billingAdmin.listTransactions(
                        status, gateway, from, to, invoiceId, q, Pageables.of(page, size)));
    }

    @GetMapping("/outbox")
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<PageResponse<FinancialOutboxEventResponse>> outbox(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(outbox.list(status, Pageables.of(page, size)));
    }

    @PostMapping("/outbox/{id}/retry")
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<FinancialOutboxEventResponse> retryOutbox(
            @PathVariable String id, Authentication auth) {
        return ResponseEntity.ok(outbox.retry(id, auth));
    }
}
