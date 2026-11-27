package com.uav.platform.controller;

import static com.uav.platform.common.constant.SecurityConstants.AUTHORIZATION_HEADER;

import com.uav.platform.config.ApiRoutes;
import com.uav.platform.dto.request.PaymentIpnRequest;
import com.uav.platform.dto.request.SepayWebhookRequest;
import com.uav.platform.dto.response.PaymentIpnResponse;
import com.uav.platform.dto.response.SepayWebhookResponse;
import com.uav.platform.service.BillingService;

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

    @PostMapping(ApiRoutes.Webhook.PAYMENT_IPN)
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

    @PostMapping(ApiRoutes.Webhook.SEPAY)
    public ResponseEntity<SepayWebhookResponse> handleSepayWebhook(
            @RequestBody SepayWebhookRequest request,
            @RequestHeader(value = AUTHORIZATION_HEADER, required = false)
                    String authorizationHeader,
            @RequestHeader(value = "X-Webhook-Secret", required = false) String webhookSecret) {
        return ResponseEntity.ok(
                billingService.processSepayWebhook(request, authorizationHeader, webhookSecret));
    }
}
