package com.uav.platform.modules.sar.mapper;

import com.uav.platform.modules.sar.dto.response.AiDetectionResponse;
import com.uav.platform.modules.sar.dto.response.AiTaskResponse;
import com.uav.platform.modules.sar.dto.response.SarMissionResponse;
import com.uav.platform.modules.sar.entity.AiDetection;
import com.uav.platform.modules.sar.entity.AiTask;
import com.uav.platform.modules.sar.entity.SarMission;

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
