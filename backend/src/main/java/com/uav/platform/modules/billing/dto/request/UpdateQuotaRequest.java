package com.uav.platform.modules.billing.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;

public record UpdateQuotaRequest(
        @NotBlank(message = "Chọn gói dịch vụ.") String planCode,
        @DecimalMin(value = "5", message = "Hạn mức giờ bay từ 5 đến 1.000 giờ.")
                @DecimalMax(value = "1000", message = "Hạn mức giờ bay từ 5 đến 1.000 giờ.")
                Double flightHoursLimit) {}
