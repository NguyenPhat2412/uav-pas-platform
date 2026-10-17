package com.uav.platform.modules.mission.mapper;

import com.uav.platform.modules.mission.dto.response.MissionEventResponse;
import com.uav.platform.modules.mission.entity.MissionEvent;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface MissionEventMapper {

    @Mapping(target = "actor", source = "actor.username")
    MissionEventResponse toResponse(MissionEvent event);
}
