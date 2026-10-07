package com.uav.platform.modules.mission.config.response;

import com.uav.platform.modules.mission.common.*;

import com.uav.platform.modules.media.config.response.MediaAssetResponse;
import com.uav.platform.modules.mission.common.MediaRole;

import java.time.LocalDateTime;

public record MissionMediaResponse(Long id, Long missionId, MediaAssetResponse media, MediaRole mediaRole,
                                   String uploadedBy, LocalDateTime createdAt) { }
