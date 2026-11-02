package com.uav.platform.dto.record.simulation;

import com.uav.platform.enums.simulation.SimEventLevel;

import java.time.LocalDateTime;

public record SimFlightEvent(LocalDateTime at, SimEventLevel level, String message) {}
