package com.uav.platform.dto.request.mission;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record MissionPermitVerifyRequest(
        @NotNull(message = "Chọn kết quả thẩm định giấy phép bay.") Boolean approved,
        @Size(max = 1000, message = "Ghi chú thẩm định tối đa 1.000 ký tự.") String note) {}
