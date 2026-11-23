package com.uav.platform.dto.response.marketplace.provider;

import com.uav.platform.enums.marketplace.ProviderDocumentStatus;
import com.uav.platform.enums.marketplace.ProviderDocumentType;

import java.time.LocalDateTime;

public record ProviderDocumentResponse(
        Long id,
        ProviderDocumentType documentType,
        String title,
        String documentNumber,
        String fileUrl,
        Long mediaAssetId,
        String downloadUrl,
        ProviderDocumentStatus status,
        String reviewerNote,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {}
