package com.uav.platform.dto.response;

import com.uav.platform.enums.ProviderDocumentStatus;
import com.uav.platform.enums.ProviderDocumentType;

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
