package com.uav.platform.mapper.webhook;

import com.uav.platform.dto.response.webhook.WebhookDeliveryLogResponse;
import com.uav.platform.dto.response.webhook.WebhookSubscriptionResponse;
import com.uav.platform.entity.webhook.WebhookDeliveryLog;
import com.uav.platform.entity.webhook.WebhookSubscription;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.Named;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface WebhookMapper {

    @Mapping(target = "secretKey", source = "secretKey", qualifiedByName = "maskSecret")
    WebhookSubscriptionResponse toSubscriptionResponse(WebhookSubscription sub);

    @Mapping(target = "subscriptionId", source = "subscription.id")
    @Mapping(target = "subscriptionName", source = "subscription.name", defaultValue = "N/A")
    WebhookDeliveryLogResponse toDeliveryLogResponse(WebhookDeliveryLog log);

    @Named("maskSecret")
    default String maskSecret(String secretKey) {
        if (secretKey == null || secretKey.isBlank()) {
            return "****";
        }
        String trimmed = secretKey.trim();
        if (trimmed.length() <= 4) {
            return "****";
        }
        return "********" + trimmed.substring(trimmed.length() - 4);
    }
}
