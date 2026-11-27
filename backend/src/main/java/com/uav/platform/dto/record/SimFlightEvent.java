package com.uav.platform.dto.record;

import com.uav.platform.enums.SimEventLevel;

import java.time.LocalDateTime;

public record SimFlightEvent(LocalDateTime at, SimEventLevel level, String message) {}
