package com.uav.platform.dto.request.marketplace.admin;

import jakarta.validation.constraints.Size;

public record AutoDispatchRequest(Long missionId, @Size(max = 500) String note) {}
