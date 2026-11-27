package com.uav.platform.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record MissionReviewUpsertRequest(
        @Min(value = 1, message = "Điểm đánh giá tối thiểu là 1 sao.")
                @Max(value = 5, message = "Điểm đánh giá tối đa là 5 sao.")
                Integer overallRating,
        @Min(value = 1, message = "Điểm chất lượng dữ liệu tối thiểu là 1 sao.")
                @Max(value = 5, message = "Điểm chất lượng dữ liệu tối đa là 5 sao.")
                Integer dataQualityRating,
        @Min(value = 1, message = "Điểm tiến độ tối thiểu là 1 sao.")
                @Max(value = 5, message = "Điểm tiến độ tối đa là 5 sao.")
                Integer timelinessRating,
        Boolean deliverablesAccepted,
        @Size(max = 1500, message = "Nhận xét nghiệm thu tối đa 1.500 ký tự.") String comment,
        @Min(value = 1, message = "Điểm đánh giá tối thiểu là 1 sao.")
                @Max(value = 5, message = "Điểm đánh giá tối đa là 5 sao.")
                Integer rating) {

    public MissionReviewUpsertRequest(
            Integer overallRating,
            Integer dataQualityRating,
            Integer timelinessRating,
            Boolean deliverablesAccepted,
            String comment) {
        this(
                overallRating,
                dataQualityRating,
                timelinessRating,
                deliverablesAccepted,
                comment,
                null);
    }

    public Integer effectiveOverallRating() {
        return overallRating != null ? overallRating : rating;
    }

    public Integer effectiveDataQualityRating() {
        return dataQualityRating != null ? dataQualityRating : effectiveOverallRating();
    }

    public Integer effectiveTimelinessRating() {
        return timelinessRating != null ? timelinessRating : effectiveOverallRating();
    }
}
