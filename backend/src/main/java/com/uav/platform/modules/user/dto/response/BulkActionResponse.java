package com.uav.platform.modules.user.dto.response;

import java.util.List;

/** Outcome of a bulk action: ids that were changed and ids that were skipped with a reason. */
public record BulkActionResponse(List<Long> processed, List<Skipped> skipped) {
    public record Skipped(Long id, String reason) {}
}
