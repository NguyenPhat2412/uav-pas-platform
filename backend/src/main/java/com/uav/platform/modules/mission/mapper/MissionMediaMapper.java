package com.uav.platform.modules.mission.mapper;

import com.uav.platform.modules.mission.dto.response.MissionMediaResponse;
import com.uav.platform.modules.mission.entity.MissionMedia;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface MissionMediaMapper {

    @Mapping(target = "missionId", source = "mission.id")
    @Mapping(target = "uploadedBy", source = "uploadedBy.username")
    MissionMediaResponse toResponse(MissionMedia link);
}
