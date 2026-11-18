package com.uav.platform.dto.request.marketplace.provider;

import jakarta.validation.constraints.Size;

public record ProviderOrderActionRequest(
        Boolean accept,
        Long uavId,
        @Size(max = 1000) String responseNote,
        @Size(max = 1000) String reason) {

    public ProviderOrderActionRequest(boolean accept, Long uavId, String responseNote) {
        this(Boolean.valueOf(accept), uavId, responseNote, null);
    }

    public String effectiveNote() {
        if (responseNote != null && !responseNote.isBlank()) {
            return responseNote.trim();
        }
        if (reason != null && !reason.isBlank()) {
            return reason.trim();
        }
        return null;
    }
}
