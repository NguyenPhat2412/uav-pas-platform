package com.uav.platform.modules.billing.controller;

import com.uav.platform.modules.billing.dto.request.PaymentIpnRequest;
import com.uav.platform.modules.billing.dto.response.PaymentIpnResponse;
import com.uav.platform.modules.billing.service.BillingService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/billing/webhook")
@RequiredArgsConstructor
public class PaymentIpnController {

    private final BillingService billingService;

    @PostMapping("/payment-ipn")
    public ResponseEntity<PaymentIpnResponse> handlePaymentIpn(
            @Valid @RequestBody PaymentIpnRequest request,
            @RequestHeader(value = "X-Signature-SHA256", required = false) String signatureHeader,
            @RequestHeader(value = "X-Webhook-Secret", required = false) String webhookSecret,
            Authentication auth) {
        return ResponseEntity.ok(
                billingService.processPaymentIpn(
                        request,
                        signatureHeader != null && !signatureHeader.isBlank()
                                ? signatureHeader
                                : webhookSecret,
                        auth));
    }
}
