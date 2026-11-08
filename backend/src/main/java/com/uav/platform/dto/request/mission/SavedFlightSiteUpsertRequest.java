package com.uav.platform.dto.request.mission;

import com.uav.platform.enums.mission.MissionType;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record SavedFlightSiteUpsertRequest(
        @NotBlank(message = "Nhập tên gợi nhớ cho địa điểm bay.")
                @Size(max = 120, message = "Tên địa điểm bay tối đa 120 ký tự.")
                String name,
        @NotBlank(message = "Nhập tên khu vực khảo sát.")
                @Size(max = 255, message = "Tên khu vực tối đa 255 ký tự.")
                String locationName,
        @DecimalMin(value = "-90", message = "Vĩ độ phải từ -90 đến 90.")
                @DecimalMax(value = "90", message = "Vĩ độ phải từ -90 đến 90.")
                BigDecimal latitude,
        @DecimalMin(value = "-180", message = "Kinh độ phải từ -180 đến 180.")
                @DecimalMax(value = "180", message = "Kinh độ phải từ -180 đến 180.")
                BigDecimal longitude,
        @NotNull(message = "Chọn phân loại nhiệm vụ mặc định.") MissionType defaultMissionType,
        @Valid FlightPlanRequest flightPlan,
        @Size(max = 1000, message = "Ghi chú địa điểm tối đa 1.000 ký tự.") String notes) {}
