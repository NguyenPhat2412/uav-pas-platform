package com.uav.platform.modules.webhook.service;

import com.uav.platform.modules.webhook.dto.response.WebhookDeliveryLogResponse;
import com.uav.platform.modules.webhook.dto.response.WebhookSecretRotationResponse;

import org.springframework.security.core.Authentication;

public interface WebhookAdminService {
    /** Requeues a FAILED delivery for the existing delivery worker; 409 otherwise. */
    WebhookDeliveryLogResponse retryDelivery(Long deliveryId, Authentication auth);

    /** Generates a new signing secret server-side and returns it exactly once. */
    WebhookSecretRotationResponse rotateSecret(Long subscriptionId, Authentication auth);
}
