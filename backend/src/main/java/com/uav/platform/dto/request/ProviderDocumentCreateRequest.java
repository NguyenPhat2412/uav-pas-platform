package com.uav.platform.dto.request;

import com.uav.platform.enums.ProviderDocumentType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ProviderDocumentCreateRequest(
        @NotNull(message = "Chọn loại hồ sơ pháp lý.") ProviderDocumentType documentType,
        @NotBlank(message = "Nhập tên tài liệu.") @Size(max = 160) String title,
        @Size(max = 80) String documentNumber,
        @Size(max = 500) String fileUrl,
        Long mediaAssetId) {}
