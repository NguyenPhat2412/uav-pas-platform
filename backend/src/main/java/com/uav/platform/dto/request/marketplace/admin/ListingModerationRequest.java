package com.uav.platform.dto.request.marketplace.admin;

import com.uav.platform.enums.marketplace.ListingModerationStatus;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ListingModerationRequest(
        @NotNull ListingModerationStatus status,
        @Size(max = 1000) String moderationNote,
        Boolean featured) {}
