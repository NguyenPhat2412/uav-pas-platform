package com.uav.platform.dto.request.marketplace.provider;

import com.uav.platform.enums.marketplace.ListingType;
import com.uav.platform.enums.marketplace.PricingModel;
import com.uav.platform.enums.mission.MissionType;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record MarketplaceListingUpsertRequest(
        Long categoryServiceId,
        @NotBlank(message = "Nhập tiêu đề dịch vụ hoặc thiết bị cho thuê.") @Size(max = 180)
                String title,
        @Size(max = 500) String summary,
        @Size(max = 4000) String description,
        @NotNull ListingType listingType,
        @NotNull MissionType missionType,
        @NotNull PricingModel pricingModel,
        @NotNull @DecimalMin(value = "10000", message = "Đơn giá tối thiểu 10.000 VNĐ.")
                BigDecimal basePriceVnd,
        @DecimalMin("0.5") BigDecimal minBookingUnits,
        @DecimalMin("0") BigDecimal securityDepositVnd,
        @NotBlank(message = "Nhập tỉnh/khu vực cung cấp dịch vụ.") @Size(max = 80) String province,
        @Min(5) @Max(2000) Integer serviceRadiusKm,
        @Size(max = 1000) String equipmentSpecs,
        @Size(max = 1000) String deliverablesSummary,
        @Size(max = 500) String coverImageUrl,
        @Min(1) @Max(720) Integer onSiteSlaHours,
        @Min(1) @Max(720) Integer deliverySlaHours,
        Boolean submitForReview) {}
