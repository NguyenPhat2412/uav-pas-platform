package com.uav.platform.dto.request.airspace;

import com.uav.platform.enums.airspace.AirspaceGeometryType;
import com.uav.platform.enums.airspace.AirspaceZoneType;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.List;

public record AirspaceZoneUpsertRequest(
        @NotBlank(message = "Mã vùng không phận không được để trống.")
                @Size(max = 40, message = "Mã vùng tối đa 40 ký tự.")
                String code,
        @NotBlank(message = "Tên vùng không phận không được để trống.")
                @Size(max = 180, message = "Tên vùng tối đa 180 ký tự.")
                String name,
        @NotNull(message = "Chọn phân loại vùng không phận.") AirspaceZoneType zoneType,
        @NotNull(message = "Chọn kiểu hình học vùng không phận.") AirspaceGeometryType geometryType,
        @DecimalMin(value = "-90") @DecimalMax(value = "90") Double centerLat,
        @DecimalMin(value = "-180") @DecimalMax(value = "180") Double centerLng,
        @Min(value = 10, message = "Bán kính vùng từ 10 đến 100.000 m.")
                @Max(value = 100000, message = "Bán kính vùng từ 10 đến 100.000 m.")
                Integer radiusMeters,
        @Size(max = 200, message = "Đa giác vùng không phận tối đa 200 đỉnh.")
                List<@Size(min = 2, max = 2) List<@NotNull Double>> vertices,
        @Min(value = 0) @Max(value = 10000) Integer maxAltitudeAglM,
        @NotBlank(message = "Nhập cơ quan quản lý không phận.")
                @Size(max = 180, message = "Tên cơ quan quản lý tối đa 180 ký tự.")
                String authority,
        Boolean active,
        @Size(max = 1000, message = "Mô tả tối đa 1.000 ký tự.") String description,
        LocalDateTime effectiveFrom,
        LocalDateTime effectiveUntil) {

    public AirspaceZoneUpsertRequest(
            String code,
            String name,
            AirspaceZoneType zoneType,
            AirspaceGeometryType geometryType,
            Double centerLat,
            Double centerLng,
            Integer radiusMeters,
            List<List<Double>> vertices,
            Integer maxAltitudeAglM,
            String authority,
            Boolean active,
            String description) {
        this(
                code,
                name,
                zoneType,
                geometryType,
                centerLat,
                centerLng,
                radiusMeters,
                vertices,
                maxAltitudeAglM,
                authority,
                active,
                description,
                null,
                null);
    }
}
