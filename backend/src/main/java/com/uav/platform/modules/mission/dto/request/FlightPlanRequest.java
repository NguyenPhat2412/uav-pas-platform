package com.uav.platform.modules.mission.dto.request;

import jakarta.validation.constraints.*;

import java.util.List;

/**
 * Customer flight-area plan. area is the operating envelope: POINT (takeoff/landing zone only), POLYGON (2..100
 * [lat, lng] vertices) or CIRCLE (one [lat, lng] centre plus radiusMeters). Area, perimeter and centre are always
 * recomputed on the server.
 */
public record FlightPlanRequest(
        @NotNull(message = "Chọn kiểu vùng bay.")
                @Pattern(regexp = "POINT|POLYGON|CIRCLE", message = "Kiểu vùng bay không hợp lệ.")
                String areaType,
        @Size(max = 100, message = "Vùng bay tối đa 100 đỉnh.")
                List<@Size(min = 2, max = 2) List<@NotNull Double>> vertices,
        @Min(value = 100, message = "Bán kính vùng tròn từ 100 đến 2.000 m.")
                @Max(value = 2000, message = "Bán kính vùng tròn từ 100 đến 2.000 m.")
                Integer radiusMeters,
        @DecimalMin(value = "-90", message = "Vĩ độ điểm cất cánh phải từ -90 đến 90.")
                @DecimalMax(value = "90", message = "Vĩ độ điểm cất cánh phải từ -90 đến 90.")
                Double takeoffLatitude,
        @DecimalMin(value = "-180", message = "Kinh độ điểm cất cánh phải từ -180 đến 180.")
                @DecimalMax(value = "180", message = "Kinh độ điểm cất cánh phải từ -180 đến 180.")
                Double takeoffLongitude,
        @NotNull(message = "Nhập độ cao bay (AGL).") Integer altitudeAglMeters,
        @NotNull(message = "Nhập độ phân giải GSD mục tiêu.") Double targetGsdCm,
        @NotNull(message = "Nhập độ chồng phủ dọc.")
                @Min(value = 60, message = "Độ chồng phủ dọc từ 60% đến 90%.")
                @Max(value = 90, message = "Độ chồng phủ dọc từ 60% đến 90%.")
                Integer forwardOverlap,
        @NotNull(message = "Nhập độ chồng phủ ngang.")
                @Min(value = 50, message = "Độ chồng phủ ngang từ 50% đến 85%.")
                @Max(value = 85, message = "Độ chồng phủ ngang từ 50% đến 85%.")
                Integer sideOverlap,
        @NotNull(message = "Chọn ít nhất một cảm biến.")
                @Size(min = 1, max = 4, message = "Chọn từ 1 đến 4 cảm biến.")
                List<
                                @Pattern(
                                        regexp = "RGB_4K|THERMAL|LIDAR|MULTISPECTRAL",
                                        message = "Cảm biến không hợp lệ.")
                                String>
                        sensors,
        @Size(max = 1000, message = "Mô tả vật cản tối đa 1.000 ký tự.") String obstacles,
        boolean permitSupport) {}
