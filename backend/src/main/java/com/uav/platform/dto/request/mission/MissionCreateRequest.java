package com.uav.platform.dto.request.mission;

import com.uav.platform.enums.mission.*;
import com.uav.platform.enums.mission.MissionPriority;
import com.uav.platform.enums.mission.MissionType;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record MissionCreateRequest(
        @NotNull(message = "Chọn loại nhiệm vụ.") MissionType missionType,
        @NotBlank(message = "Nhập tiêu đề yêu cầu.")
                @Size(max = 180, message = "Tiêu đề không được vượt quá 180 ký tự.")
                String title,
        @Size(max = 2000, message = "Mô tả không được vượt quá 2.000 ký tự.") String description,
        @NotNull(message = "Chọn ngày yêu cầu hợp lệ.")
                @FutureOrPresent(message = "Ngày yêu cầu phải từ hôm nay trở đi.")
                LocalDate requestedDate,
        @NotNull(message = "Chọn ngày và giờ bắt đầu hợp lệ.") LocalDateTime startTime,
        @NotNull(message = "Chọn ngày và giờ kết thúc hợp lệ.") LocalDateTime expectedEndTime,
        @NotBlank(message = "Nhập địa điểm thực hiện.")
                @Size(max = 255, message = "Địa điểm không được vượt quá 255 ký tự.")
                String locationName,
        @DecimalMin(value = "-90", message = "Vĩ độ phải từ -90 đến 90.")
                @DecimalMax(value = "90", message = "Vĩ độ phải từ -90 đến 90.")
                BigDecimal latitude,
        @DecimalMin(value = "-180", message = "Kinh độ phải từ -180 đến 180.")
                @DecimalMax(value = "180", message = "Kinh độ phải từ -180 đến 180.")
                BigDecimal longitude,
        Long serviceId,
        MissionPriority priority,
        @Size(max = 2000, message = "Ghi chú không được vượt quá 2.000 ký tự.") String notes,
        @jakarta.validation.Valid FlightPlanRequest flightPlan) {

    public MissionCreateRequest(
            MissionType missionType,
            String title,
            String description,
            LocalDate requestedDate,
            LocalDateTime startTime,
            LocalDateTime expectedEndTime,
            String locationName,
            BigDecimal latitude,
            BigDecimal longitude,
            Long serviceId,
            MissionPriority priority,
            String notes) {
        this(
                missionType,
                title,
                description,
                requestedDate,
                startTime,
                expectedEndTime,
                locationName,
                latitude,
                longitude,
                serviceId,
                priority,
                notes,
                null);
    }
}
