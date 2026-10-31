package com.uav.platform.dto.request.mission;

import jakarta.validation.constraints.*;

/** A null replacement releases the whole selected reservation; otherwise quantity is the new total. */
public record MissionEquipmentRedispatchRequest(
        @NotNull @PositiveOrZero Long expectedVersion,
        @NotNull @Positive Long reservationId,
        @Positive Long replacementId,
        @Positive Integer quantity,
        @NotBlank @Size(max = 500) String reason) {}
