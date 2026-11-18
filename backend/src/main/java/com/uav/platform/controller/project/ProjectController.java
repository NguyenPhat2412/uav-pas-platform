package com.uav.platform.controller.project;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.common.util.Pageables;
import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.dto.request.project.ProjectCreateRequest;
import com.uav.platform.dto.request.project.ProjectSubscriptionCreateRequest;
import com.uav.platform.dto.request.project.ProjectSubscriptionUpdateRequest;
import com.uav.platform.dto.request.project.ProjectUpdateRequest;
import com.uav.platform.dto.response.project.ProjectResponse;
import com.uav.platform.dto.response.project.ProjectSubscriptionResponse;
import com.uav.platform.enums.project.ProjectStatus;
import com.uav.platform.enums.project.ProjectSubscriptionStatus;
import com.uav.platform.service.project.ProjectService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiRoutes.Projects.BASE)
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    @GetMapping
    public ResponseEntity<PageResponse<ProjectResponse>> listProjects(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String province,
            @RequestParam(required = false) ProjectStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth) {
        String effectiveKeyword = (q != null && !q.isBlank()) ? q : keyword;
        return ResponseEntity.ok(
                projectService.listProjects(
                        effectiveKeyword,
                        province,
                        status,
                        Pageables.desc(page, size, "createdAt"),
                        auth));
    }

    @PostMapping
    public ResponseEntity<ProjectResponse> createProject(
            @Valid @RequestBody ProjectCreateRequest request, Authentication auth) {
        return ResponseEntity.status(201).body(projectService.createProject(request, auth));
    }

    @GetMapping(ApiRoutes.Projects.BY_ID)
    public ResponseEntity<ProjectResponse> getProject(@PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(projectService.getProject(id, auth));
    }

    @PatchMapping(ApiRoutes.Projects.BY_ID)
    public ResponseEntity<ProjectResponse> updateProject(
            @PathVariable Long id,
            @Valid @RequestBody ProjectUpdateRequest request,
            Authentication auth) {
        return ResponseEntity.ok(projectService.updateProject(id, request, auth));
    }

    @DeleteMapping(ApiRoutes.Projects.BY_ID)
    public ResponseEntity<Void> deleteProject(@PathVariable Long id, Authentication auth) {
        projectService.deleteProject(id, auth);
        return ResponseEntity.noContent().build();
    }

    @GetMapping(ApiRoutes.Projects.SUBSCRIPTIONS)
    public ResponseEntity<PageResponse<ProjectSubscriptionResponse>> listSubscriptions(
            @PathVariable Long id,
            @RequestParam(required = false) ProjectSubscriptionStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth) {
        return ResponseEntity.ok(
                projectService.listSubscriptions(
                        id, status, Pageables.desc(page, size, "createdAt"), auth));
    }

    @PostMapping(ApiRoutes.Projects.SUBSCRIPTIONS)
    public ResponseEntity<ProjectSubscriptionResponse> createSubscription(
            @PathVariable Long id,
            @Valid @RequestBody ProjectSubscriptionCreateRequest request,
            Authentication auth) {
        return ResponseEntity.status(201)
                .body(projectService.createSubscription(id, request, auth));
    }

    @PatchMapping(ApiRoutes.Projects.SUBSCRIPTION_BY_ID)
    public ResponseEntity<ProjectSubscriptionResponse> updateSubscription(
            @PathVariable Long id,
            @PathVariable Long subId,
            @Valid @RequestBody ProjectSubscriptionUpdateRequest request,
            Authentication auth) {
        return ResponseEntity.ok(projectService.updateSubscription(id, subId, request, auth));
    }

    @DeleteMapping(ApiRoutes.Projects.SUBSCRIPTION_BY_ID)
    public ResponseEntity<Void> deleteSubscription(
            @PathVariable Long id, @PathVariable Long subId, Authentication auth) {
        projectService.deleteSubscription(id, subId, auth);
        return ResponseEntity.noContent().build();
    }
}
