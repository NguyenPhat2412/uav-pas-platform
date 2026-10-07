package com.uav.platform.modules.mission.config.response;

import com.uav.platform.modules.mission.common.*;

public record MissionAvailabilityResponse(boolean available, boolean stationAvailable, boolean uavAvailable,
                                          boolean operatorAvailable, String message) {}
