package com.uav.platform.modules.uav.mapper;

import com.uav.platform.modules.uav.dto.response.UavResponse;
import com.uav.platform.modules.uav.dto.response.UavStatusHistoryResponse;
import com.uav.platform.modules.uav.entity.Uav;
import com.uav.platform.modules.uav.entity.UavStatusHistory;

public final class UavMapper {
    private UavMapper() {}

    public static UavResponse toResponse(Uav uav) {
        return new UavResponse(
                uav.getId(),
                uav.getModel(),
                uav.getSerialNumber(),
                uav.getManufacturer(),
                uav.getStatus(),
                uav.getStation() == null ? null : uav.getStation().getId(),
                uav.getStation() == null ? null : uav.getStation().getName(),
                uav.getLastMaintenanceAt(),
                uav.getCreatedAt());
    }

    public static UavStatusHistoryResponse toResponse(UavStatusHistory history) {
        return new UavStatusHistoryResponse(
                history.getId(),
                history.getUav().getId(),
                history.getFromStatus(),
                history.getToStatus(),
                history.getReason(),
                history.getChangedBy(),
                history.getCreatedAt());
    }
}
