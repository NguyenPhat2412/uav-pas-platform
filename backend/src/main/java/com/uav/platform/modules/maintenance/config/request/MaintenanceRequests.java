package com.uav.platform.modules.maintenance.config.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public final class MaintenanceRequests {
    private MaintenanceRequests() { }
    public record CreateSchedule(@NotNull @Positive Long uavId, @NotBlank @Size(max = 160) String title,
            @NotNull @Min(1) @Max(3650) Integer intervalDays, @NotNull LocalDate nextDueDate) { }
    public record UpdateSchedule(@NotNull @PositiveOrZero Long expectedVersion, @NotBlank @Size(max = 160) String title,
            @NotNull @Min(1) @Max(3650) Integer intervalDays, @NotNull LocalDate nextDueDate, @NotNull Boolean active) { }
    public record CreateOrder(@NotNull @Positive Long uavId, @Positive Long scheduleId,
            @NotBlank @Size(max = 160) String title, @Size(max = 2000) String description,
            @NotNull LocalDate plannedDate, @NotBlank @Size(max = 120) String technicianName) { }
    public record UpdateOrder(@NotNull @PositiveOrZero Long expectedVersion,
            @NotBlank @Size(max = 160) String title, @Size(max = 2000) String description,
            @NotNull LocalDate plannedDate, @NotBlank @Size(max = 120) String technicianName) { }
    public record Version(@NotNull @PositiveOrZero Long expectedVersion) { }
    public record Materials(@NotNull @PositiveOrZero Long expectedVersion,
            @NotNull @Size(max = 100) List<@NotNull @Valid Material> items) { }
    public record Material(@NotBlank @Size(max = 160) String name, @NotBlank @Size(max = 30) String unit,
            @NotNull @DecimalMin(value = "0", inclusive = false) @DecimalMax("10000") @Digits(integer = 5, fraction = 3) BigDecimal quantity,
            @NotNull @DecimalMin("0") @DecimalMax("1000000000") @Digits(integer = 10, fraction = 0) BigDecimal unitPrice) { }
    public record Complete(@NotNull @PositiveOrZero Long expectedVersion,
            @NotBlank @Size(max = 1000) String inspectionNotes, @NotNull @AssertTrue Boolean inspectionPassed) { }
    public record Cancel(@NotNull @PositiveOrZero Long expectedVersion, @NotBlank @Size(max = 1000) String reason) { }
}
