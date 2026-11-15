package com.uav.platform.controller.billing.reconciliation;

import static com.uav.platform.common.constant.SecurityConstants.AUTHORIZATION_HEADER;

import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.dto.request.billing.reconciliation.PaymentIpnRequest;
import com.uav.platform.dto.request.billing.reconciliation.SepayWebhookRequest;
import com.uav.platform.dto.response.billing.reconciliation.PaymentIpnResponse;
import com.uav.platform.dto.response.billing.reconciliation.SepayWebhookResponse;
import com.uav.platform.service.billing.invoice.BillingService;

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
