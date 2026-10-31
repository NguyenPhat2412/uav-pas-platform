package com.uav.platform.service.mission;

import com.uav.platform.dto.request.mission.MissionAcceptanceRequest;
import com.uav.platform.dto.request.mission.MissionCompletionRequest;
import com.uav.platform.dto.request.mission.MissionCreateRequest;
import com.uav.platform.dto.request.mission.MissionFailureRequest;
import com.uav.platform.dto.request.mission.MissionForceFailRequest;
import com.uav.platform.dto.request.mission.MissionUpdateRequest;
import com.uav.platform.dto.response.mission.MissionResponse;
import com.uav.platform.entity.mission.Mission;

import org.springframework.security.core.Authentication;

/** Mission creation, editing, acceptance and terminal state transitions. */
public interface MissionLifecycleService {
    MissionResponse create(MissionCreateRequest request, String actorUsername);

    /** Runs every create rule without saving; throws the same field errors create would. */
    void validate(MissionCreateRequest request);

    MissionResponse updateDraft(
            Long id, MissionUpdateRequest request, Authentication authentication);

    MissionResponse submit(Long id, Authentication authentication);

    default MissionResponse cancel(Long id, Authentication authentication) {
        return cancel(id, null, authentication);
    }

    /** reason is optional (at most 500 characters) and recorded in the timeline. */
    MissionResponse cancel(Long id, String reason, Authentication authentication);

    MissionResponse confirm(Long id, Authentication authentication);

    MissionResponse reject(Long id, String reason, Authentication authentication);

    MissionResponse ready(Long id, Authentication authentication);

    MissionResponse start(Long id, Authentication authentication);

    MissionResponse complete(
            Long id, MissionCompletionRequest request, Authentication authentication);

    MissionResponse fail(Long id, MissionFailureRequest request, Authentication authentication);

    /** Closes a mission as FAILED without the assigned operator; releases resources like fail. */
    MissionResponse forceFail(
            Long id, MissionForceFailRequest request, Authentication authentication);

    MissionResponse acceptOperator(
            Long id, MissionAcceptanceRequest request, Authentication authentication);

    void requireAcceptance(Mission mission);

    MissionResponse reportOperatorConflict(Long id, String note, Authentication authentication);

    String nextCode(int year);
}
