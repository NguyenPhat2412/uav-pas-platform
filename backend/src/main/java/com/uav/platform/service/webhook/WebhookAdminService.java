package com.uav.platform.service.webhook;

import com.uav.platform.dto.response.webhook.WebhookDeliveryLogResponse;
import com.uav.platform.dto.response.webhook.WebhookSecretRotationResponse;

import org.springframework.security.core.Authentication;

public interface WebhookAdminService {
    /** Requeues a FAILED delivery for the existing delivery worker; 409 otherwise. */
    WebhookDeliveryLogResponse retryDelivery(Long deliveryId, Authentication auth);

    /** Generates a new signing secret server-side and returns it exactly once. */
    WebhookSecretRotationResponse rotateSecret(Long subscriptionId, Authentication auth);
}
