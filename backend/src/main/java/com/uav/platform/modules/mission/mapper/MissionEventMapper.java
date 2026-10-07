package com.uav.platform.modules.mission.mapper;

import com.uav.platform.modules.mission.config.response.MissionEventResponse;
import com.uav.platform.modules.mission.entity.MissionEvent;

public final class MissionEventMapper {
    private MissionEventMapper() {}
    public static MissionEventResponse toResponse(MissionEvent event) {
        return new MissionEventResponse(event.getId(), event.getEventType(),
                event.getActor() == null ? null : event.getActor().getUsername(), event.getOldStatus(), event.getNewStatus(),
                event.getDescription(), event.getMetadata(), event.getCreatedAt());
    }
}
