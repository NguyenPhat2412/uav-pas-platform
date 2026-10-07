package com.uav.platform.modules.mission.mapper;

import com.uav.platform.modules.mission.config.response.MissionMediaResponse;
import com.uav.platform.modules.mission.entity.MissionMedia;
import com.uav.platform.modules.media.mapper.MediaMapper;

public final class MissionMediaMapper {
    private MissionMediaMapper() {}
    public static MissionMediaResponse toResponse(MissionMedia link) {
        return new MissionMediaResponse(link.getId(), link.getMission().getId(), MediaMapper.toResponse(link.getMedia()),
                link.getMediaRole(), link.getUploadedBy() == null ? null : link.getUploadedBy().getUsername(), link.getCreatedAt());
    }
}
