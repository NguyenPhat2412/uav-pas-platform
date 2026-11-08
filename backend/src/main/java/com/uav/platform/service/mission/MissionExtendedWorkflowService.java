package com.uav.platform.service.mission;

import com.uav.platform.dto.request.mission.MissionPreflightUpsertRequest;
import com.uav.platform.dto.request.mission.MissionReviewUpsertRequest;
import com.uav.platform.dto.response.mission.MissionDispatchCandidatesResponse;
import com.uav.platform.dto.response.mission.MissionPreflightResponse;
import com.uav.platform.dto.response.mission.MissionResponse;
import com.uav.platform.dto.response.mission.MissionReviewResponse;
import com.uav.platform.dto.response.mission.OperatorLogbookResponse;

import org.springframework.security.core.Authentication;

public interface MissionExtendedWorkflowService {

    MissionResponse cloneMission(Long id, Authentication authentication);

    MissionReviewResponse getReview(Long id, Authentication authentication);

    MissionReviewResponse upsertReview(
            Long id, MissionReviewUpsertRequest request, Authentication authentication);

    MissionPreflightResponse getPreflight(Long id, Authentication authentication);

    MissionPreflightResponse upsertPreflight(
            Long id, MissionPreflightUpsertRequest request, Authentication authentication);

    OperatorLogbookResponse operatorLogbook(Long operatorId, Authentication authentication);

    MissionDispatchCandidatesResponse dispatchCandidates(Long id, Authentication authentication);

    MissionResponse autoAssign(Long id, Authentication authentication);
}
