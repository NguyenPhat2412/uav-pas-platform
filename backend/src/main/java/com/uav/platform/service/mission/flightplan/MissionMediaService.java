package com.uav.platform.service.mission.flightplan;

import com.uav.platform.dto.request.mission.flightplan.MissionMediaRequest;
import com.uav.platform.dto.response.mission.flightplan.MissionMediaResponse;

import org.springframework.security.core.Authentication;

import java.util.List;

/** Mission attachments with the mission lock acquired before the media lock. */
public interface MissionMediaService {
    MissionMediaResponse attachMedia(
            Long id, MissionMediaRequest request, Authentication authentication);

    List<MissionMediaResponse> listMedia(Long id, Authentication authentication);
}
