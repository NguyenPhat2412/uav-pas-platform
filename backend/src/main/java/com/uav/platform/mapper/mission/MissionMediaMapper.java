package com.uav.platform.mapper.mission;

import com.uav.platform.dto.response.mission.MissionMediaResponse;
import com.uav.platform.entity.mission.MissionMedia;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface MissionMediaMapper {

    @Mapping(target = "missionId", source = "mission.id")
    @Mapping(target = "uploadedBy", source = "uploadedBy.username")
    MissionMediaResponse toResponse(MissionMedia link);
}
