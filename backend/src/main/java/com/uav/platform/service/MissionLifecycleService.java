package com.uav.platform.service;

import com.uav.platform.dto.request.MissionAcceptanceRequest;
import com.uav.platform.dto.request.MissionCompletionRequest;
import com.uav.platform.dto.request.MissionCreateRequest;
import com.uav.platform.dto.request.MissionFailureRequest;
import com.uav.platform.dto.request.MissionForceFailRequest;
import com.uav.platform.dto.request.MissionPermitUpsertRequest;
import com.uav.platform.dto.request.MissionPermitVerifyRequest;
import com.uav.platform.dto.request.MissionUpdateRequest;
import com.uav.platform.dto.response.MissionResponse;
import com.uav.platform.entity.Mission;

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

    MissionResponse upsertPermit(
            Long id, MissionPermitUpsertRequest request, Authentication authentication);

    MissionResponse verifyPermit(
            Long id, MissionPermitVerifyRequest request, Authentication authentication);

    String nextCode(int year);
}
