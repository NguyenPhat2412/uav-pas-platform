package com.uav.platform.modules.mission.controller;


import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.modules.mission.config.request.*;
import com.uav.platform.modules.mission.config.response.*;
import com.uav.platform.modules.mission.common.MissionStatus;
import com.uav.platform.modules.mission.common.MissionType;
import com.uav.platform.modules.mission.service.MissionService;
import com.uav.platform.modules.media.config.request.MediaUploadRequest;
import com.uav.platform.modules.media.config.response.SignedMediaUrlResponse;
import com.uav.platform.modules.media.config.response.MediaAssetResponse;
import com.uav.platform.modules.media.service.MediaService;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/missions")
public class MissionController {
    private final MissionService service;
    private final MediaService mediaService;
    public MissionController(MissionService service) { this(service, null); }
    @Autowired
    public MissionController(MissionService service, MediaService mediaService) { this.service = service; this.mediaService = mediaService; }

    @GetMapping
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_VIEW')")
    public ResponseEntity<PageResponse<MissionResponse>> list(
            @RequestParam(required = false) MissionStatus status,
            @RequestParam(required = false) MissionType missionType,
            @RequestParam(required = false) Long stationId,
            @RequestParam(required = false) Long operatorId,
            @RequestParam(required = false) Long customerId,
            @RequestParam(required = false) java.time.LocalDate requestedDate,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {
        MissionFilter filter = new MissionFilter(status, missionType, stationId, operatorId, customerId, requestedDate, search);
        return ResponseEntity.ok(service.list(filter, PageRequest.of(page, size, Sort.by("createdAt").descending()), authentication));
    }

    @GetMapping("/availability")
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_VIEW')")
    public ResponseEntity<MissionAvailabilityResponse> availability(@RequestParam java.time.LocalDateTime startTime,
                                                                     @RequestParam java.time.LocalDateTime endTime,
                                                                     @RequestParam(required = false) Long stationId,
                                                                     @RequestParam(required = false) Long uavId,
                                                                     @RequestParam(required = false) Long operatorId) {
        return ResponseEntity.ok(service.availability(startTime, endTime, stationId, uavId, operatorId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_VIEW')")
    public ResponseEntity<MissionResponse> get(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(service.get(id, authentication));
    }

    @PostMapping
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_CREATE')")
    public ResponseEntity<MissionResponse> create(@Valid @RequestBody MissionCreateRequest request, Authentication authentication) {
        return ResponseEntity.status(201).body(service.create(request, authentication.getName()));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_UPDATE')")
    public ResponseEntity<MissionResponse> update(@PathVariable Long id, @Valid @RequestBody MissionUpdateRequest request,
                                                  Authentication authentication) {
        return ResponseEntity.ok(service.updateDraft(id, request, authentication));
    }

    @PostMapping("/{id}/submit")
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_UPDATE')")
    public ResponseEntity<MissionResponse> submit(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(service.submit(id, authentication));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_CANCEL')")
    public ResponseEntity<MissionResponse> cancel(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(service.cancel(id, authentication));
    }

    @PostMapping("/{id}/assign-station")
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_ASSIGN_STATION')")
    public ResponseEntity<MissionResponse> assignStation(@PathVariable Long id, @Valid @RequestBody ResourceAssignmentRequest request,
                                                         Authentication authentication) {
        return ResponseEntity.ok(service.assignStation(id, request, authentication));
    }

    @PostMapping("/{id}/assign-uav")
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_ASSIGN_UAV')")
    public ResponseEntity<MissionResponse> assignUav(@PathVariable Long id, @Valid @RequestBody ResourceAssignmentRequest request,
                                                     Authentication authentication) {
        return ResponseEntity.ok(service.assignUav(id, request, authentication));
    }

    @PostMapping("/{id}/replace-uav")
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_ASSIGN_UAV')")
    public ResponseEntity<MissionResponse> replaceUav(@PathVariable Long id, @Valid @RequestBody MissionUavReplacementRequest request,
                                                      Authentication authentication) {
        return ResponseEntity.ok(service.replaceUav(id, request, authentication));
    }

    @PostMapping("/{id}/unassign-uav")
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_ASSIGN_UAV')")
    public ResponseEntity<MissionResponse> unassignUav(@PathVariable Long id, @Valid @RequestBody MissionUavUnassignmentRequest request,
                                                       Authentication authentication) {
        return ResponseEntity.ok(service.unassignUav(id, request, authentication));
    }

    @PostMapping("/{id}/assign-operator")
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_ASSIGN_OPERATOR')")
    public ResponseEntity<MissionResponse> assignOperator(@PathVariable Long id, @Valid @RequestBody ResourceAssignmentRequest request,
                                                          Authentication authentication) {
        return ResponseEntity.ok(service.assignOperator(id, request, authentication));
    }

    @PostMapping("/{id}/reserve-equipment")
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_RESERVE_EQUIPMENT')")
    public ResponseEntity<MissionResponse> reserveEquipment(@PathVariable Long id, @Valid @RequestBody ResourceAssignmentRequest request,
                                                            Authentication authentication) {
        return ResponseEntity.ok(service.reserveEquipment(id, request, authentication));
    }

    @GetMapping("/{id}/dispatch-resources")
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_VIEW')")
    public ResponseEntity<MissionDispatchResourcesResponse> dispatchResources(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(service.dispatchResources(id, authentication));
    }

    @PostMapping("/{id}/redispatch-operator")
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_ASSIGN_OPERATOR')")
    public ResponseEntity<MissionResponse> redispatchOperator(@PathVariable Long id,
            @Valid @RequestBody MissionResourceRedispatchRequest request, Authentication authentication) {
        return ResponseEntity.ok(service.redispatchOperator(id, request, authentication));
    }

    @PostMapping("/{id}/redispatch-station")
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_ASSIGN_STATION')")
    public ResponseEntity<MissionResponse> redispatchStation(@PathVariable Long id,
            @Valid @RequestBody MissionResourceRedispatchRequest request, Authentication authentication) {
        return ResponseEntity.ok(service.redispatchStation(id, request, authentication));
    }

    @PostMapping("/{id}/redispatch-equipment")
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_RESERVE_EQUIPMENT')")
    public ResponseEntity<MissionResponse> redispatchEquipment(@PathVariable Long id,
            @Valid @RequestBody MissionEquipmentRedispatchRequest request, Authentication authentication) {
        return ResponseEntity.ok(service.redispatchEquipment(id, request, authentication));
    }

    @PostMapping("/{id}/confirm")
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_CONFIRM')")
    public ResponseEntity<MissionResponse> confirm(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(service.confirm(id, authentication));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_REJECT')")
    public ResponseEntity<MissionResponse> reject(@PathVariable Long id, @RequestParam String reason, Authentication authentication) {
        return ResponseEntity.ok(service.reject(id, reason, authentication));
    }

    @PostMapping("/{id}/ready")
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_STATUS_UPDATE')")
    public ResponseEntity<MissionResponse> ready(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(service.ready(id, authentication));
    }

    @PostMapping("/{id}/start")
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_START')")
    public ResponseEntity<MissionResponse> start(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(service.start(id, authentication));
    }

    @PostMapping("/{id}/accept")
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_STATUS_UPDATE')")
    public ResponseEntity<MissionResponse> accept(@PathVariable Long id,
            @Valid @RequestBody MissionAcceptanceRequest request, Authentication authentication) {
        return ResponseEntity.ok(service.acceptOperator(id, request, authentication));
    }

    @PostMapping("/{id}/report-conflict")
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_STATUS_UPDATE')")
    public ResponseEntity<MissionResponse> reportConflict(@PathVariable Long id, @RequestParam String note,
                                                           Authentication authentication) {
        return ResponseEntity.ok(service.reportOperatorConflict(id, note, authentication));
    }

    @PostMapping("/{id}/complete")
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_COMPLETE')")
    public ResponseEntity<MissionResponse> complete(@PathVariable Long id, @Valid @RequestBody MissionCompletionRequest request,
                                                     Authentication authentication) {
        return ResponseEntity.ok(service.complete(id, request, authentication));
    }

    @PostMapping("/{id}/fail")
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_STATUS_UPDATE')")
    public ResponseEntity<MissionResponse> fail(@PathVariable Long id, @Valid @RequestBody MissionFailureRequest request,
                                                 Authentication authentication) {
        return ResponseEntity.ok(service.fail(id, request, authentication));
    }

    @GetMapping("/{id}/media")
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_MEDIA_VIEW')")
    public ResponseEntity<List<MissionMediaResponse>> media(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(service.listMedia(id, authentication));
    }

    @PostMapping("/{id}/media")
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_MEDIA_UPLOAD')")
    public ResponseEntity<MissionMediaResponse> attachMedia(@PathVariable Long id, @Valid @RequestBody MissionMediaRequest request,
                                                             Authentication authentication) {
        return ResponseEntity.status(201).body(service.attachMedia(id, request, authentication));
    }

    @PostMapping("/{id}/media/upload-url")
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_MEDIA_UPLOAD')")
    public ResponseEntity<SignedMediaUrlResponse> mediaUploadUrl(@PathVariable Long id,
                                                                  @Valid @RequestBody MediaUploadRequest request,
                                                                  Authentication authentication) {
        service.get(id, authentication);
        MediaUploadRequest linked = new MediaUploadRequest(request.originalName(), request.contentType(), request.size(),
                request.type(), "MISSION", id.toString());
        var asset = mediaService.register(linked, authentication.getName());
        return ResponseEntity.ok(mediaService.uploadUrl(asset.id()));
    }

    @PostMapping("/{id}/media/{mediaId}/confirm")
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_MEDIA_UPLOAD')")
    public ResponseEntity<MediaAssetResponse> confirmMedia(@PathVariable Long id, @PathVariable Long mediaId, Authentication authentication) {
        service.get(id, authentication);
        return ResponseEntity.ok(mediaService.confirmMission(mediaId, id, authentication.getName()));
    }

    @GetMapping("/{id}/timeline")
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_TIMELINE_VIEW')")
    public ResponseEntity<List<MissionEventResponse>> timeline(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(service.timeline(id, authentication));
    }
}
