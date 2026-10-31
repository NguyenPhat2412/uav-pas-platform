package com.uav.platform.mapper.sar;

import com.uav.platform.dto.response.sar.AiDetectionResponse;
import com.uav.platform.dto.response.sar.AiTaskResponse;
import com.uav.platform.dto.response.sar.SarMissionResponse;
import com.uav.platform.entity.sar.AiDetection;
import com.uav.platform.entity.sar.AiTask;
import com.uav.platform.entity.sar.SarMission;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface SarMapper {

    @Mapping(target = "missionId", source = "mission.id")
    SarMissionResponse toSarMissionResponse(SarMission sar);

    @Mapping(target = "missionId", source = "mission.id")
    @Mapping(target = "mediaId", source = "media.id")
    AiTaskResponse toAiTaskResponse(AiTask task);

    @Mapping(target = "aiTaskId", source = "aiTask.id")
    @Mapping(target = "missionId", source = "mission.id")
    AiDetectionResponse toAiDetectionResponse(AiDetection d);
}
