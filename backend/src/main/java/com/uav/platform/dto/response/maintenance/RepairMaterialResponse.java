package com.uav.platform.dto.response.maintenance;

@io.swagger.v3.oas.annotations.media.Schema(name = "Material")
public record RepairMaterialResponse(
        Long id, String name, String unit, String quantity, String unitPrice, String lineTotal) {}
