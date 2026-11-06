package com.uav.platform.dto.request.mission;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record MissionPermitUpsertRequest(
        @NotBlank(message = "Nhập số giấy phép bay.")
                @Size(max = 80, message = "Số giấy phép tối đa 80 ký tự.")
                String permitNumber,
        @NotBlank(message = "Nhập cơ quan cấp phép.")
                @Size(max = 180, message = "Tên cơ quan cấp phép tối đa 180 ký tự.")
                String permitAuthority,
        @NotNull(message = "Nhập thời điểm bắt đầu hiệu lực.") LocalDateTime validFrom,
        @NotNull(message = "Nhập thời điểm hết hiệu lực.") LocalDateTime validUntil,
        @Min(value = 10, message = "Trần bay được cấp phép từ 10 đến 5.000 m.")
                @Max(value = 5000, message = "Trần bay được cấp phép từ 10 đến 5.000 m.")
                Integer maxAltitudeMeters,
        Long permitMediaId,
        @Size(max = 1000, message = "Ghi chú giấy phép tối đa 1.000 ký tự.") String note) {}
