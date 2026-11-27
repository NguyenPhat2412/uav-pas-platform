package com.uav.platform.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ProjectCreateRequest(
        @NotBlank(message = "Tên dự án không được để trống")
                @Size(max = 180, message = "Tên dự án tối đa 180 ký tự")
                String name,
        @Size(max = 80, message = "Tỉnh/thành tối đa 80 ký tự") String province,
        @Size(max = 20000, message = "Dữ liệu vùng bay GeoJSON quá lớn") String areaGeoJson,
        @Size(max = 2000, message = "Ghi chú tối đa 2000 ký tự") String note) {}
