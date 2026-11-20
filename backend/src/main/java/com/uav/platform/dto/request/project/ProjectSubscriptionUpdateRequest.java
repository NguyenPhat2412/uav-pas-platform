package com.uav.platform.dto.request.project;

import com.uav.platform.enums.project.ProjectSubscriptionStatus;
import com.uav.platform.enums.project.SubscriptionScheduleType;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ProjectSubscriptionUpdateRequest(
        SubscriptionScheduleType scheduleType,
        LocalDate startDate,
        LocalDate nextRunDate,
        @DecimalMin(value = "0.01", message = "Khối lượng đăng ký phải lớn hơn 0") BigDecimal units,
        @Size(max = 20000, message = "Dữ liệu vùng bay GeoJSON quá lớn") String areaGeoJson,
        ProjectSubscriptionStatus status,
        @Size(max = 1000) String note) {}
