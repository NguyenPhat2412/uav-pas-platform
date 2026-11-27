package com.uav.platform.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ProviderOrderCompleteRequest(
        @NotBlank(message = "Nhập biên bản kết quả bàn giao cho khách hàng.") @Size(max = 2000)
                String completionNote,
        @Size(max = 500) String equipmentCondition) {}
