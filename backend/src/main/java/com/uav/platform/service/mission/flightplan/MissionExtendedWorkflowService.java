package com.uav.platform.service.mission.flightplan;

import com.uav.platform.dto.request.mission.flightplan.MissionPreflightUpsertRequest;
import com.uav.platform.dto.request.mission.flightplan.MissionReviewUpsertRequest;
import com.uav.platform.dto.response.mission.dispatch.MissionDispatchCandidatesResponse;
import com.uav.platform.dto.response.mission.flightplan.MissionInspectionReportResponse;
import com.uav.platform.dto.response.mission.flightplan.MissionMediaResponse;
import com.uav.platform.dto.response.mission.flightplan.MissionPreflightResponse;
import com.uav.platform.dto.response.mission.flightplan.MissionReviewResponse;
import com.uav.platform.dto.response.mission.flightplan.OperatorLogbookResponse;
import com.uav.platform.dto.response.mission.lifecycle.MissionResponse;

import org.springframework.security.core.Authentication;

import java.util.List;

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

    default MissionInspectionReportResponse inspectionReport(
            Long id, List<MissionMediaResponse> mediaItems, Authentication authentication) {
        throw new UnsupportedOperationException("inspectionReport not configured");
    }
}
