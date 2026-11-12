package com.uav.platform.controller.mission;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.common.util.Pageables;
import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.dto.record.mission.MissionFilter;
import com.uav.platform.dto.request.media.MediaUploadRequest;
import com.uav.platform.dto.request.mission.*;
import com.uav.platform.dto.response.media.MediaAssetResponse;
import com.uav.platform.dto.response.media.SignedMediaUrlResponse;
import com.uav.platform.dto.response.mission.*;
import com.uav.platform.enums.mission.MissionStatus;
import com.uav.platform.enums.mission.MissionType;
import com.uav.platform.service.media.MediaService;
import com.uav.platform.service.mission.MissionService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping(ApiRoutes.Missions.BASE)
@RequiredArgsConstructor(onConstructor_ = @Autowired)
public class MissionController {
    private final MissionService service;
    private final MediaService mediaService;

    public MissionController(MissionService service) {
        this(service, null);
    }

    @GetMapping
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_VIEW')")
    public ResponseEntity<PageResponse<MissionResponse>> list(
            @RequestParam(required = false) MissionStatus status,
            @RequestParam(required = false) MissionType missionType,
            @RequestParam(required = false) Long stationId,
            @RequestParam(required = false) Long operatorId,
            @RequestParam(required = false) Long customerId,
            @RequestParam(required = false) LocalDate requestedDate,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {
        return ResponseEntity.ok(
                service.list(
                        new MissionFilter(
                                status,
                                missionType,
                                stationId,
                                operatorId,
                                customerId,
                                requestedDate,
                                search),
                        Pageables.desc(page, size, "createdAt"),
                        authentication));
    }

    @GetMapping(ApiRoutes.Missions.AVAILABILITY)
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_VIEW')")
    public ResponseEntity<MissionAvailabilityResponse> availability(
            @RequestParam LocalDateTime startTime,
            @RequestParam LocalDateTime endTime,
            @RequestParam(required = false) Long stationId,
            @RequestParam(required = false) Long uavId,
            @RequestParam(required = false) Long operatorId) {
        return ResponseEntity.ok(
                service.availability(startTime, endTime, stationId, uavId, operatorId));
    }

    @GetMapping(ApiRoutes.Missions.MISSION_ID)
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_VIEW')")
    public ResponseEntity<MissionResponse> get(
            @PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(service.get(id, authentication));
    }

    @PostMapping
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_CREATE')")
    public ResponseEntity<MissionResponse> create(
            @Valid @RequestBody MissionCreateRequest request, Authentication authentication) {
        return ResponseEntity.status(201).body(service.create(request, authentication.getName()));
    }

    /** Validates a mission request without saving it; 204 when it would be accepted, field errors otherwise. */
    @PostMapping(ApiRoutes.Missions.VALIDATE)
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_CREATE')")
    public ResponseEntity<Void> validate(@Valid @RequestBody MissionCreateRequest request) {
        service.validate(request);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping(ApiRoutes.Missions.MISSION_ID)
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_UPDATE')")
    public ResponseEntity<MissionResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody MissionUpdateRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(service.updateDraft(id, request, authentication));
    }

    @PostMapping(ApiRoutes.Missions.SUBMIT)
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_UPDATE')")
    public ResponseEntity<MissionResponse> submit(
            @PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(service.submit(id, authentication));
    }

    @PostMapping(ApiRoutes.Missions.CANCEL)
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_CANCEL')")
    public ResponseEntity<MissionResponse> cancel(
            @PathVariable Long id,
            @RequestParam(required = false) String reason,
            @Valid @RequestBody(required = false) MissionCancelRequest request,
            Authentication authentication) {
        // The body is optional: older clients post without one; ?reason= mirrors /reject.
        String note = request != null && request.reason() != null ? request.reason() : reason;
        return ResponseEntity.ok(service.cancel(id, note, authentication));
    }

    @PostMapping(ApiRoutes.Missions.ASSIGN_STATION)
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_ASSIGN_STATION')")
    public ResponseEntity<MissionResponse> assignStation(
            @PathVariable Long id,
            @Valid @RequestBody ResourceAssignmentRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(service.assignStation(id, request, authentication));
    }

    @PostMapping(ApiRoutes.Missions.ASSIGN_UAV)
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_ASSIGN_UAV')")
    public ResponseEntity<MissionResponse> assignUav(
            @PathVariable Long id,
            @Valid @RequestBody ResourceAssignmentRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(service.assignUav(id, request, authentication));
    }

    @PostMapping(ApiRoutes.Missions.REPLACE_UAV)
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_ASSIGN_UAV')")
    public ResponseEntity<MissionResponse> replaceUav(
            @PathVariable Long id,
            @Valid @RequestBody MissionUavReplacementRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(service.replaceUav(id, request, authentication));
    }

    @PostMapping(ApiRoutes.Missions.UNASSIGN_UAV)
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_ASSIGN_UAV')")
    public ResponseEntity<MissionResponse> unassignUav(
            @PathVariable Long id,
            @Valid @RequestBody MissionUavUnassignmentRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(service.unassignUav(id, request, authentication));
    }

    @PostMapping(ApiRoutes.Missions.ASSIGN_OPERATOR)
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_ASSIGN_OPERATOR')")
    public ResponseEntity<MissionResponse> assignOperator(
            @PathVariable Long id,
            @Valid @RequestBody ResourceAssignmentRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(service.assignOperator(id, request, authentication));
    }

    @PostMapping(ApiRoutes.Missions.RESERVE_EQUIPMENT)
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_RESERVE_EQUIPMENT')")
    public ResponseEntity<MissionResponse> reserveEquipment(
            @PathVariable Long id,
            @Valid @RequestBody ResourceAssignmentRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(service.reserveEquipment(id, request, authentication));
    }

    @GetMapping(ApiRoutes.Missions.DISPATCH_RESOURCES)
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_VIEW')")
    public ResponseEntity<MissionDispatchResourcesResponse> dispatchResources(
            @PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(service.dispatchResources(id, authentication));
    }

    @PostMapping(ApiRoutes.Missions.REDISPATCH_OPERATOR)
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_ASSIGN_OPERATOR')")
    public ResponseEntity<MissionResponse> redispatchOperator(
            @PathVariable Long id,
            @Valid @RequestBody MissionResourceRedispatchRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(service.redispatchOperator(id, request, authentication));
    }

    @PostMapping(ApiRoutes.Missions.REDISPATCH_STATION)
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_ASSIGN_STATION')")
    public ResponseEntity<MissionResponse> redispatchStation(
            @PathVariable Long id,
            @Valid @RequestBody MissionResourceRedispatchRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(service.redispatchStation(id, request, authentication));
    }

    @PostMapping(ApiRoutes.Missions.REDISPATCH_EQUIPMENT)
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_RESERVE_EQUIPMENT')")
    public ResponseEntity<MissionResponse> redispatchEquipment(
            @PathVariable Long id,
            @Valid @RequestBody MissionEquipmentRedispatchRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(service.redispatchEquipment(id, request, authentication));
    }

    @PostMapping(ApiRoutes.Missions.CONFIRM)
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_CONFIRM')")
    public ResponseEntity<MissionResponse> confirm(
            @PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(service.confirm(id, authentication));
    }

    @PostMapping(ApiRoutes.Missions.REJECT)
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_REJECT')")
    public ResponseEntity<MissionResponse> reject(
            @PathVariable Long id, @RequestParam String reason, Authentication authentication) {
        return ResponseEntity.ok(service.reject(id, reason, authentication));
    }

    @PostMapping(ApiRoutes.Missions.READY)
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_STATUS_UPDATE')")
    public ResponseEntity<MissionResponse> ready(
            @PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(service.ready(id, authentication));
    }

    @PostMapping(ApiRoutes.Missions.START)
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_START')")
    public ResponseEntity<MissionResponse> start(
            @PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(service.start(id, authentication));
    }

    @PostMapping(ApiRoutes.Missions.ACCEPT)
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_STATUS_UPDATE')")
    public ResponseEntity<MissionResponse> accept(
            @PathVariable Long id,
            @Valid @RequestBody MissionAcceptanceRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(service.acceptOperator(id, request, authentication));
    }

    @PostMapping(ApiRoutes.Missions.REPORT_CONFLICT)
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_STATUS_UPDATE')")
    public ResponseEntity<MissionResponse> reportConflict(
            @PathVariable Long id, @RequestParam String note, Authentication authentication) {
        return ResponseEntity.ok(service.reportOperatorConflict(id, note, authentication));
    }

    @PostMapping(ApiRoutes.Missions.COMPLETE)
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_COMPLETE')")
    public ResponseEntity<MissionResponse> complete(
            @PathVariable Long id,
            @Valid @RequestBody MissionCompletionRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(service.complete(id, request, authentication));
    }

    @PostMapping(ApiRoutes.Missions.FAIL)
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_STATUS_UPDATE')")
    public ResponseEntity<MissionResponse> fail(
            @PathVariable Long id,
            @Valid @RequestBody MissionFailureRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(service.fail(id, request, authentication));
    }

    /**
     * Commander/admin closure of a READY, RESOURCE_RESERVED or IN_PROGRESS mission whose assigned
     * operator cannot complete or fail it. Requires a reason; releases the UAV and equipment.
     */
    @PostMapping(ApiRoutes.Missions.FORCE_FAIL)
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_CONFIRM')")
    public ResponseEntity<MissionResponse> forceFail(
            @PathVariable Long id,
            @Valid @RequestBody MissionForceFailRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(service.forceFail(id, request, authentication));
    }

    @PutMapping(ApiRoutes.Missions.PERMIT)
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_VIEW')")
    public ResponseEntity<MissionResponse> upsertPermit(
            @PathVariable Long id,
            @Valid @RequestBody MissionPermitUpsertRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(service.upsertPermit(id, request, authentication));
    }

    @PostMapping(ApiRoutes.Missions.PERMIT_VERIFY)
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_CONFIRM')")
    public ResponseEntity<MissionResponse> verifyPermit(
            @PathVariable Long id,
            @Valid @RequestBody MissionPermitVerifyRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(service.verifyPermit(id, request, authentication));
    }

    @GetMapping(ApiRoutes.Missions.MEDIA)
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_MEDIA_VIEW')")
    public ResponseEntity<List<MissionMediaResponse>> media(
            @PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(service.listMedia(id, authentication));
    }

    @PostMapping(ApiRoutes.Missions.MEDIA)
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_MEDIA_UPLOAD')")
    public ResponseEntity<MissionMediaResponse> attachMedia(
            @PathVariable Long id,
            @Valid @RequestBody MissionMediaRequest request,
            Authentication authentication) {
        return ResponseEntity.status(201).body(service.attachMedia(id, request, authentication));
    }

    @PostMapping(ApiRoutes.Missions.MEDIA_UPLOAD_URL)
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_MEDIA_UPLOAD')")
    public ResponseEntity<SignedMediaUrlResponse> mediaUploadUrl(
            @PathVariable Long id,
            @Valid @RequestBody MediaUploadRequest request,
            Authentication authentication) {
        service.get(id, authentication);
        return ResponseEntity.ok(
                mediaService.registerMissionUploadUrl(id, request, authentication.getName()));
    }

    @PostMapping(ApiRoutes.Missions.MEDIA_CONFIRM)
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_MEDIA_UPLOAD')")
    public ResponseEntity<MediaAssetResponse> confirmMedia(
            @PathVariable Long id, @PathVariable Long mediaId, Authentication authentication) {
        service.get(id, authentication);
        return ResponseEntity.ok(
                mediaService.confirmMission(mediaId, id, authentication.getName()));
    }

    @GetMapping(ApiRoutes.Missions.TIMELINE)
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_TIMELINE_VIEW')")
    public ResponseEntity<List<MissionEventResponse>> timeline(
            @PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(service.timeline(id, authentication));
    }

    @PostMapping(ApiRoutes.Missions.CLONE)
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_CREATE')")
    public ResponseEntity<MissionResponse> cloneMission(
            @PathVariable Long id, Authentication authentication) {
        return ResponseEntity.status(201).body(service.cloneMission(id, authentication));
    }

    @GetMapping(ApiRoutes.Missions.REVIEW)
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_VIEW')")
    public ResponseEntity<MissionReviewResponse> getReview(
            @PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(service.getReview(id, authentication));
    }

    @PutMapping(ApiRoutes.Missions.REVIEW)
    @PreAuthorize(
            "@permissionService.has(authentication, 'MISSION_CREATE') or @permissionService.has(authentication, 'MISSION_UPDATE') or @permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<MissionReviewResponse> upsertReview(
            @PathVariable Long id,
            @Valid @RequestBody MissionReviewUpsertRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(service.upsertReview(id, request, authentication));
    }

    @GetMapping(ApiRoutes.Missions.PREFLIGHT)
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_VIEW')")
    public ResponseEntity<MissionPreflightResponse> getPreflight(
            @PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(service.getPreflight(id, authentication));
    }

    @PutMapping(ApiRoutes.Missions.PREFLIGHT)
    @PreAuthorize(
            "@permissionService.has(authentication, 'MISSION_STATUS_UPDATE') or @permissionService.has(authentication, 'MISSION_CONFIRM')")
    public ResponseEntity<MissionPreflightResponse> upsertPreflight(
            @PathVariable Long id,
            @Valid @RequestBody MissionPreflightUpsertRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(service.upsertPreflight(id, request, authentication));
    }

    @GetMapping(ApiRoutes.Missions.OPERATOR_LOGBOOK)
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_VIEW')")
    public ResponseEntity<OperatorLogbookResponse> operatorLogbook(
            @RequestParam(required = false) Long operatorId, Authentication authentication) {
        return ResponseEntity.ok(service.operatorLogbook(operatorId, authentication));
    }

    @GetMapping(ApiRoutes.Missions.DISPATCH_CANDIDATES)
    @PreAuthorize(
            "@permissionService.has(authentication, 'MISSION_VIEW_ALL') or @permissionService.has(authentication, 'MISSION_CONFIRM') or @permissionService.has(authentication, 'MISSION_ASSIGN_STATION') or @permissionService.has(authentication, 'MISSION_ASSIGN_UAV') or @permissionService.has(authentication, 'MISSION_ASSIGN_OPERATOR') or @permissionService.has(authentication, 'MISSION_RESERVE_EQUIPMENT')")
    public ResponseEntity<MissionDispatchCandidatesResponse> dispatchCandidates(
            @PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(service.dispatchCandidates(id, authentication));
    }

    @PostMapping(ApiRoutes.Missions.AUTO_ASSIGN)
    @PreAuthorize(
            "@permissionService.has(authentication, 'MISSION_ASSIGN_STATION') or @permissionService.has(authentication, 'MISSION_ASSIGN_UAV') or @permissionService.has(authentication, 'MISSION_ASSIGN_OPERATOR') or @permissionService.has(authentication, 'MISSION_RESERVE_EQUIPMENT')")
    public ResponseEntity<MissionResponse> autoAssign(
            @PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(service.autoAssign(id, authentication));
    }

    @GetMapping(ApiRoutes.Missions.INSPECTION_REPORT)
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_VIEW')")
    public ResponseEntity<MissionInspectionReportResponse> inspectionReport(
            @PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(service.inspectionReport(id, authentication));
    }
}
