package com.uav.platform.dto.request.mission;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record MissionReviewUpsertRequest(
        @NotNull(message = "Chọn mức đánh giá tổng thể từ 1 đến 5 sao.")
                @Min(value = 1, message = "Điểm đánh giá tối thiểu là 1 sao.")
                @Max(value = 5, message = "Điểm đánh giá tối đa là 5 sao.")
                Integer overallRating,
        @NotNull(message = "Chọn điểm chất lượng dữ liệu bàn giao từ 1 đến 5 sao.")
                @Min(value = 1, message = "Điểm chất lượng dữ liệu tối thiểu là 1 sao.")
                @Max(value = 5, message = "Điểm chất lượng dữ liệu tối đa là 5 sao.")
                Integer dataQualityRating,
        @NotNull(message = "Chọn điểm tiến độ thực hiện từ 1 đến 5 sao.")
                @Min(value = 1, message = "Điểm tiến độ tối thiểu là 1 sao.")
                @Max(value = 5, message = "Điểm tiến độ tối đa là 5 sao.")
                Integer timelinessRating,
        Boolean deliverablesAccepted,
        @Size(max = 1500, message = "Nhận xét nghiệm thu tối đa 1.500 ký tự.") String comment) {}
