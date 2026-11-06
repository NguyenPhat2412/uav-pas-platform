package com.uav.platform.dto.request.airspace;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

public record AirspaceCheckRequest(
        @NotNull(message = "Chọn kiểu vùng bay.")
                @Pattern(regexp = "POINT|POLYGON|CIRCLE", message = "Kiểu vùng bay không hợp lệ.")
                String areaType,
        @Size(max = 100, message = "Vùng bay tối đa 100 đỉnh.")
                List<@Size(min = 2, max = 2) List<@NotNull Double>> vertices,
        @Min(value = 1, message = "Bán kính vùng tròn từ 1 đến 50.000 m.")
                @Max(value = 50000, message = "Bán kính vùng tròn từ 1 đến 50.000 m.")
                Integer radiusMeters,
        @DecimalMin(value = "-90", message = "Vĩ độ điểm cất cánh phải từ -90 đến 90.")
                @DecimalMax(value = "90", message = "Vĩ độ điểm cất cánh phải từ -90 đến 90.")
                Double takeoffLatitude,
        @DecimalMin(value = "-180", message = "Kinh độ điểm cất cánh phải từ -180 đến 180.")
                @DecimalMax(value = "180", message = "Kinh độ điểm cất cánh phải từ -180 đến 180.")
                Double takeoffLongitude,
        @Min(value = 0, message = "Độ cao bay không hợp lệ.")
                @Max(value = 10000, message = "Độ cao bay tối đa 10.000 m.")
                Integer altitudeAglMeters) {}
