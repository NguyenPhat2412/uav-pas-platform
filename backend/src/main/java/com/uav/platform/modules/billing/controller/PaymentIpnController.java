package com.uav.platform.modules.billing.controller;

import com.uav.platform.modules.billing.dto.request.PaymentIpnRequest;
import com.uav.platform.modules.billing.dto.response.PaymentIpnResponse;
import com.uav.platform.modules.billing.service.BillingService;

import jakarta.validation.Valid;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/billing/webhook")
public class PaymentIpnController {

    private static final Logger log = LoggerFactory.getLogger(PaymentIpnController.class);

    private final BillingService billingService;

    public PaymentIpnController(BillingService billingService) {
        this.billingService = billingService;
    }

    /**
     * Webhook Callback tiếp nhận thông báo thanh toán tức thời (IPN) từ VietQR NAPAS 24/7
     */
    @PostMapping("/payment-ipn")
    public ResponseEntity<PaymentIpnResponse> handlePaymentIpn(
            @Valid @RequestBody PaymentIpnRequest request,
            @RequestHeader(value = "X-Signature-SHA256", required = false) String signatureHeader,
            @RequestHeader(value = "X-Webhook-Secret", required = false) String webhookSecret,
            Authentication auth) {
        log.info(
                "Received Payment IPN Callback for invoiceCode={}",
                request != null ? request.invoiceCode() : null);
        String resolvedSignature =
                (signatureHeader != null && !signatureHeader.isBlank())
                        ? signatureHeader
                        : webhookSecret;
        return ResponseEntity.ok(
                billingService.processPaymentIpn(request, resolvedSignature, auth));
    }
}
