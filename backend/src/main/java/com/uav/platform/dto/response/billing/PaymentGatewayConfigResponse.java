package com.uav.platform.dto.response.billing;

import java.math.BigDecimal;

/** Admin snapshot of VietQR receiving account settings and automated webhook reconciliation readiness. */
public record PaymentGatewayConfigResponse(
        boolean bankTransferConfigured,
        String bankBin,
        String bankName,
        String accountNumber,
        String accountName,
        BigDecimal vatRate,
        boolean webhookAutoReconcileReady,
        boolean providerEnabled,
        boolean secretConfigured,
        String sepayWebhookPath,
        String ipnWebhookPath,
        String sampleQrPayload) {}
