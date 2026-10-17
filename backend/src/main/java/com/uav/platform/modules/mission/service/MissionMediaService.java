package com.uav.platform.modules.mission.service;

import com.uav.platform.modules.mission.dto.request.MissionMediaRequest;
import com.uav.platform.modules.mission.dto.response.MissionMediaResponse;

import org.springframework.security.core.Authentication;

import java.util.List;

/** Mission attachments with the mission lock acquired before the media lock. */
public interface MissionMediaService {
    MissionMediaResponse attachMedia(
            Long id, MissionMediaRequest request, Authentication authentication);

    List<MissionMediaResponse> listMedia(Long id, Authentication authentication);
}
