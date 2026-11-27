package com.uav.platform.dto.response;

import com.uav.platform.enums.*;
import com.uav.platform.enums.MediaRole;

import java.time.LocalDateTime;

public record MissionMediaResponse(
        Long id,
        Long missionId,
        MediaAssetResponse media,
        MediaRole mediaRole,
        String uploadedBy,
        LocalDateTime createdAt) {}
