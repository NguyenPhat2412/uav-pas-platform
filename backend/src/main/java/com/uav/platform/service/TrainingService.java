package com.uav.platform.service;

import com.uav.platform.dto.request.UpdateTrainingProgressRequest;
import com.uav.platform.dto.request.UpsertTrainingDocumentRequest;
import com.uav.platform.dto.response.TrainingDocumentResponse;
import com.uav.platform.dto.response.TrainingOverviewResponse;

import org.springframework.security.core.Authentication;

public interface TrainingService {

    TrainingOverviewResponse getOverview(
            String portal, String category, String search, Authentication authentication);

    TrainingDocumentResponse getByCodeOrSlug(String codeOrSlug, Authentication authentication);

    TrainingDocumentResponse updateProgress(
            Long documentId, UpdateTrainingProgressRequest request, Authentication authentication);

    TrainingDocumentResponse createDocument(
            UpsertTrainingDocumentRequest request, Authentication authentication);

    TrainingDocumentResponse updateDocument(
            Long id, UpsertTrainingDocumentRequest request, Authentication authentication);
}
