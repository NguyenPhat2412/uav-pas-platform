package com.uav.platform.dto.response;

import java.util.List;

public record SupportThreadDetailResponse(
        SupportThreadResponse thread, List<SupportMessageResponse> messages) {}
