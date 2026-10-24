package com.uav.platform.modules.billing.controller;

import com.uav.platform.modules.billing.dto.request.ManualPaymentRequest;
import com.uav.platform.modules.billing.dto.request.SubscribeRequest;
import com.uav.platform.modules.billing.dto.response.BankTransferInstructionsResponse;
import com.uav.platform.modules.billing.dto.response.BankTransferStatusResponse;
import com.uav.platform.modules.billing.dto.response.InvoiceResponse;
import com.uav.platform.modules.billing.service.BankTransferService;
import com.uav.platform.modules.billing.service.BillingService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/billing")
@RequiredArgsConstructor
public class BankTransferController {
    private final BankTransferService bankTransfer;
    private final BillingService billing;

    @GetMapping("/bank-transfer")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BankTransferStatusResponse> status() {
        return ResponseEntity.ok(bankTransfer.status());
    }

    @GetMapping("/invoices/{id}/bank-transfer")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BankTransferInstructionsResponse> instructions(
            @PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(bankTransfer.instructions(id, auth));
    }

    /** Returns the plan invoice to pay, or 204 when a free plan was applied straight away. */
    @PostMapping("/subscriptions")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<InvoiceResponse> subscribe(
            @Valid @RequestBody SubscribeRequest request, Authentication auth) {
        InvoiceResponse invoice = billing.subscribe(request.planCode(), auth);
        return invoice == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(invoice);
    }

    @PostMapping("/admin/invoices/{id}/confirm-payment")
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<InvoiceResponse> confirm(
            @PathVariable Long id,
            @Valid @RequestBody ManualPaymentRequest request,
            Authentication auth) {
        return ResponseEntity.ok(billing.confirmBankTransfer(id, request.bankReference(), auth));
    }
}
