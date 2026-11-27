package com.uav.platform.dto.request;

import com.uav.platform.enums.SimCommand;

import jakarta.validation.constraints.NotNull;

public record SimulationCommandRequest(@NotNull SimCommand command) {}
