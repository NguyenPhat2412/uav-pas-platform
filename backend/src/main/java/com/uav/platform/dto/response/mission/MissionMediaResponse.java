package com.uav.platform.dto.response.mission;

import com.uav.platform.dto.response.media.MediaAssetResponse;
import com.uav.platform.enums.mission.*;
import com.uav.platform.enums.mission.MediaRole;

import java.time.LocalDateTime;

public record MissionMediaResponse(
        Long id,
        Long missionId,
        MediaAssetResponse media,
        MediaRole mediaRole,
        String uploadedBy,
        LocalDateTime createdAt) {}
