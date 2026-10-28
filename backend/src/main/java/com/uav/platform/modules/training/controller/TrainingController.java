package com.uav.platform.modules.training.controller;

import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.modules.training.dto.request.UpdateTrainingProgressRequest;
import com.uav.platform.modules.training.dto.request.UpsertTrainingDocumentRequest;
import com.uav.platform.modules.training.dto.response.TrainingDocumentResponse;
import com.uav.platform.modules.training.dto.response.TrainingOverviewResponse;
import com.uav.platform.modules.training.service.TrainingService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiRoutes.Training.BASE)
@RequiredArgsConstructor
@Tag(
        name = "Training Academy",
        description = "UAV Training & SOP Academy across Customer, Operations, and Admin tiers")
public class TrainingController {

    private final TrainingService trainingService;

    @Operation(summary = "List UAV training documents and user completion metrics by portal")
    @GetMapping
    public ResponseEntity<TrainingOverviewResponse> getOverview(
            @RequestParam(required = false, defaultValue = "CUSTOMER") String portal,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search,
            Authentication authentication) {
        return ResponseEntity.ok(
                trainingService.getOverview(portal, category, search, authentication));
    }

    @Operation(summary = "Get UAV training document detail by code or slug")
    @GetMapping(ApiRoutes.Training.BY_CODE)
    public ResponseEntity<TrainingDocumentResponse> getByCodeOrSlug(
            @PathVariable String codeOrSlug, Authentication authentication) {
        return ResponseEntity.ok(trainingService.getByCodeOrSlug(codeOrSlug, authentication));
    }

    @Operation(summary = "Update user checklist progress and completion status for a document")
    @PutMapping(ApiRoutes.Training.PROGRESS)
    public ResponseEntity<TrainingDocumentResponse> updateProgress(
            @PathVariable Long id,
            @RequestBody(required = false) UpdateTrainingProgressRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(trainingService.updateProgress(id, request, authentication));
    }

    @Operation(summary = "Create a new UAV training / SOP document (Admin)")
    @PreAuthorize(
            "@permissionService.has(authentication, 'PERMISSION_MANAGE') or hasAnyRole('SUPER_ADMIN','SYSTEM_ADMIN')")
    @PostMapping
    public ResponseEntity<TrainingDocumentResponse> createDocument(
            @Valid @RequestBody UpsertTrainingDocumentRequest request,
            Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(trainingService.createDocument(request, authentication));
    }

    @Operation(summary = "Update an existing UAV training / SOP document (Admin)")
    @PreAuthorize(
            "@permissionService.has(authentication, 'PERMISSION_MANAGE') or hasAnyRole('SUPER_ADMIN','SYSTEM_ADMIN')")
    @PutMapping(ApiRoutes.Training.BY_ID)
    public ResponseEntity<TrainingDocumentResponse> updateDocument(
            @PathVariable Long id,
            @Valid @RequestBody UpsertTrainingDocumentRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(trainingService.updateDocument(id, request, authentication));
    }
}
