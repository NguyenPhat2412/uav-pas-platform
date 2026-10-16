package com.uav.platform.modules.mission.mapper;

import com.uav.platform.modules.mission.config.response.MissionResponse;
import com.uav.platform.modules.mission.entity.Mission;

public final class MissionMapper {
    private MissionMapper() {}
    public static MissionResponse toResponse(Mission mission) {
        return new MissionResponse(mission.getId(), mission.getCode(),
                mission.getCustomer() == null ? null : mission.getCustomer().getId(),
                mission.getCustomer() == null ? null : mission.getCustomer().getFullName(),
                mission.getService() == null ? null : mission.getService().getId(), mission.getMissionType(),
                mission.getTitle(), mission.getDescription(), mission.getRequestedDate(), mission.getStartTime(),
                mission.getExpectedEndTime(), mission.getLocationName(), mission.getLatitude(), mission.getLongitude(),
                mission.getStation() == null ? null : mission.getStation().getId(),
                mission.getUav() == null ? null : mission.getUav().getId(),
                mission.getOperator() == null ? null : mission.getOperator().getId(), mission.getPriority(),
                mission.getStatus(), mission.getNotes(), mission.getCreatedAt(), mission.getUpdatedAt(),
                mission.getCompletionNote(), mission.getEquipmentCondition(), mission.getFailureReason(), mission.getFailureNotes(),
                mission.isOperatorAccepted(), mission.getOperatorConflictNote(), mission.getVersion());
    }
}
