package com.uav.platform.service.project;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dto.request.project.ProjectCreateRequest;
import com.uav.platform.dto.request.project.ProjectSubscriptionCreateRequest;
import com.uav.platform.dto.request.project.ProjectSubscriptionUpdateRequest;
import com.uav.platform.dto.request.project.ProjectUpdateRequest;
import com.uav.platform.dto.response.project.ProjectResponse;
import com.uav.platform.dto.response.project.ProjectSubscriptionResponse;
import com.uav.platform.enums.project.ProjectStatus;
import com.uav.platform.enums.project.ProjectSubscriptionStatus;

import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;

public interface ProjectService {

    PageResponse<ProjectResponse> listProjects(
            String keyword,
            String province,
            ProjectStatus status,
            Pageable pageable,
            Authentication auth);

    ProjectResponse createProject(ProjectCreateRequest request, Authentication auth);

    ProjectResponse getProject(Long projectId, Authentication auth);

    ProjectResponse updateProject(
            Long projectId, ProjectUpdateRequest request, Authentication auth);

    void deleteProject(Long projectId, Authentication auth);

    PageResponse<ProjectSubscriptionResponse> listSubscriptions(
            Long projectId,
            ProjectSubscriptionStatus status,
            Pageable pageable,
            Authentication auth);

    ProjectSubscriptionResponse createSubscription(
            Long projectId, ProjectSubscriptionCreateRequest request, Authentication auth);

    ProjectSubscriptionResponse updateSubscription(
            Long projectId,
            Long subscriptionId,
            ProjectSubscriptionUpdateRequest request,
            Authentication auth);

    void deleteSubscription(Long projectId, Long subscriptionId, Authentication auth);
}
