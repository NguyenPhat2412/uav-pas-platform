package com.uav.platform.dto.request.project;

import com.uav.platform.enums.project.SubscriptionScheduleType;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record ProjectSubscriptionCreateRequest(
        @NotNull(message = "Vui lòng chọn gói dịch vụ") Long listingId,
        @Size(max = 20000, message = "Dữ liệu vùng bay GeoJSON quá lớn") String areaGeoJson,
        SubscriptionScheduleType scheduleType,
        LocalDate startDate,
        LocalDateTime startTime,
        LocalDateTime expectedEndTime,
        @DecimalMin(value = "0.01", message = "Khối lượng đăng ký phải lớn hơn 0") BigDecimal units,
        @Size(max = 255) String locationName,
        BigDecimal latitude,
        BigDecimal longitude,
        @Size(max = 1000) String note) {}
