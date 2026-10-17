package com.uav.platform.modules.mission.service;

import com.uav.platform.modules.mission.dto.request.MissionAcceptanceRequest;
import com.uav.platform.modules.mission.dto.request.MissionCompletionRequest;
import com.uav.platform.modules.mission.dto.request.MissionCreateRequest;
import com.uav.platform.modules.mission.dto.request.MissionFailureRequest;
import com.uav.platform.modules.mission.dto.request.MissionUpdateRequest;
import com.uav.platform.modules.mission.dto.response.MissionResponse;
import com.uav.platform.modules.mission.entity.Mission;

import org.springframework.security.core.Authentication;

/** Mission creation, editing, acceptance and terminal state transitions. */
public interface MissionLifecycleService {
    MissionResponse create(MissionCreateRequest request, String actorUsername);

    MissionResponse updateDraft(
            Long id, MissionUpdateRequest request, Authentication authentication);

    MissionResponse submit(Long id, Authentication authentication);

    MissionResponse cancel(Long id, Authentication authentication);

    MissionResponse confirm(Long id, Authentication authentication);

    MissionResponse reject(Long id, String reason, Authentication authentication);

    MissionResponse ready(Long id, Authentication authentication);

    MissionResponse start(Long id, Authentication authentication);

    MissionResponse complete(
            Long id, MissionCompletionRequest request, Authentication authentication);

    MissionResponse fail(Long id, MissionFailureRequest request, Authentication authentication);

    MissionResponse acceptOperator(
            Long id, MissionAcceptanceRequest request, Authentication authentication);

    void requireAcceptance(Mission mission);

    MissionResponse reportOperatorConflict(Long id, String note, Authentication authentication);

    String nextCode(int year);
}
