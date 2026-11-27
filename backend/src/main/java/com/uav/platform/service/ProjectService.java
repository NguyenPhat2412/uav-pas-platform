package com.uav.platform.service;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dto.request.ProjectCreateRequest;
import com.uav.platform.dto.request.ProjectSubscriptionCreateRequest;
import com.uav.platform.dto.request.ProjectSubscriptionUpdateRequest;
import com.uav.platform.dto.request.ProjectUpdateRequest;
import com.uav.platform.dto.response.ProjectResponse;
import com.uav.platform.dto.response.ProjectSubscriptionResponse;
import com.uav.platform.enums.ProjectStatus;
import com.uav.platform.enums.ProjectSubscriptionStatus;

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
