package com.uav.platform.dto.request;

import com.uav.platform.enums.ProviderType;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ProviderOnboardingRequest(
        @NotBlank(message = "Nhập tên thương hiệu hoặc họ tên đối tác.")
                @Size(max = 160, message = "Tên hiển thị tối đa 160 ký tự.")
                String displayName,
        @NotNull(message = "Chọn loại hình đối tác.") ProviderType providerType,
        @Size(max = 60) String taxOrIdNumber,
        @Size(max = 80) String flightLicenseNumber,
        @Size(max = 2000) String bio,
        @NotBlank(message = "Nhập tỉnh/thành phố hoạt động chính.") @Size(max = 80) String province,
        @Min(5) @Max(2000) Integer serviceRadiusKm,
        @Size(max = 30) String contactPhone,
        @Size(max = 120) String bankName,
        @Size(max = 60) String bankAccountNumber,
        @Size(max = 120) String bankAccountHolder,
        Boolean submitForReview) {}
