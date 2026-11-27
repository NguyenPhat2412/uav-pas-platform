package com.uav.platform.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record MissionBidCreateRequest(
        @NotNull @DecimalMin(value = "50000", message = "Giá chào thầu tối thiểu 50.000 VNĐ.")
                BigDecimal proposedPriceVnd,
        @Min(1) @Max(720) Integer estimatedDeliveryHours,
        @NotBlank(message = "Nhập phương án thực hiện và cam kết kỹ thuật.") @Size(max = 1500)
                String proposalNote,
        @Size(max = 120) String proposedUavModel) {}
