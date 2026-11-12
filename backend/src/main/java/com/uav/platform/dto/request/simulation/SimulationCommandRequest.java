package com.uav.platform.dto.request.simulation;

import com.uav.platform.enums.simulation.SimCommand;

import jakarta.validation.constraints.NotNull;

public record SimulationCommandRequest(@NotNull SimCommand command) {}
