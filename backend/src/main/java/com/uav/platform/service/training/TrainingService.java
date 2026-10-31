package com.uav.platform.service.training;

import com.uav.platform.dto.request.training.UpdateTrainingProgressRequest;
import com.uav.platform.dto.request.training.UpsertTrainingDocumentRequest;
import com.uav.platform.dto.response.training.TrainingDocumentResponse;
import com.uav.platform.dto.response.training.TrainingOverviewResponse;

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
