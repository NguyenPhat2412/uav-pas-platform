package com.uav.platform.modules.mission.config.response;

import com.uav.platform.modules.mission.common.*;

public record UavServiceResponse(Long id, String code, String name, String description, boolean active, int defaultDurationMinutes) { }
