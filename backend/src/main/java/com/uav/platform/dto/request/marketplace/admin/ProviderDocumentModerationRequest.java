package com.uav.platform.dto.request.marketplace.admin;

import com.uav.platform.enums.marketplace.ProviderDocumentStatus;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ProviderDocumentModerationRequest(
        @NotNull ProviderDocumentStatus status, @Size(max = 500) String reviewerNote) {}
