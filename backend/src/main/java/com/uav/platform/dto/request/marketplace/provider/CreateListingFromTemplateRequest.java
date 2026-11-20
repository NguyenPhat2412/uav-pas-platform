package com.uav.platform.dto.request.marketplace.provider;

import com.uav.platform.enums.marketplace.PricingModel;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record CreateListingFromTemplateRequest(
        @NotNull(message = "Vui lòng chọn mẫu dịch vụ") Long serviceOfferingId,
        @Size(max = 180) String title,
        @Size(max = 80) String province,
        Integer serviceRadiusKm,
        @DecimalMin(value = "0.0", message = "Đơn giá không hợp lệ") BigDecimal basePriceVnd,
        PricingModel pricingModel,
        BigDecimal minBookingUnits,
        Integer deliverySlaHours,
        Integer onSiteSlaHours,
        @Size(max = 1000) String equipmentSpecs,
        @Size(max = 1000) String deliverablesSummary,
        @Size(max = 500) String coverImageUrl,
        Boolean submitForReview) {}
