package com.uav.platform.modules.webhook.mapper;

import com.uav.platform.modules.webhook.dto.response.WebhookDeliveryLogResponse;
import com.uav.platform.modules.webhook.dto.response.WebhookSubscriptionResponse;
import com.uav.platform.modules.webhook.entity.WebhookDeliveryLog;
import com.uav.platform.modules.webhook.entity.WebhookSubscription;

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
