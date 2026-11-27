package com.uav.platform.dto.response;

import com.uav.platform.enums.ProviderType;
import com.uav.platform.enums.ProviderVerificationStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record ProviderProfileResponse(
        Long id,
        Long userId,
        String username,
        String slug,
        String displayName,
        ProviderType providerType,
        String taxOrIdNumber,
        String flightLicenseNumber,
        String bio,
        String province,
        int serviceRadiusKm,
        String contactPhone,
        String bankName,
        String bankAccountNumber,
        String bankAccountHolder,
        ProviderVerificationStatus verificationStatus,
        String reviewNote,
        LocalDateTime verifiedAt,
        String verifiedBy,
        BigDecimal commissionRateOverride,
        BigDecimal ratingAvg,
        int reviewCount,
        int completedMissionsCount,
        LocalDateTime createdAt,
        List<ProviderDocumentResponse> documents) {}
