package com.uav.platform.controller.billing;

import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.dto.request.billing.PaymentIpnRequest;
import com.uav.platform.dto.response.billing.PaymentIpnResponse;
import com.uav.platform.service.billing.BillingService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(ApiRoutes.Webhook.BASE)
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
