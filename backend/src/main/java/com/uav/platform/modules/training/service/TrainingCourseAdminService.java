package com.uav.platform.modules.training.service;

import com.uav.platform.modules.training.dto.request.CreateTrainingAssetRequest;
import com.uav.platform.modules.training.dto.request.UpdateCourseCoverRequest;
import com.uav.platform.modules.training.dto.request.UpsertTrainingLessonRequest;
import com.uav.platform.modules.training.dto.response.TrainingAssetResponse;
import com.uav.platform.modules.training.dto.response.TrainingAssetUploadResponse;
import com.uav.platform.modules.training.dto.response.TrainingLessonAdminResponse;

import java.util.List;

/** Course authoring: lessons, cover and uploaded media. Callers hold PERMISSION_MANAGE. */
public interface TrainingCourseAdminService {

    List<TrainingLessonAdminResponse> listLessons(Long courseId);

    TrainingLessonAdminResponse createLesson(UpsertTrainingLessonRequest request);

    TrainingLessonAdminResponse updateLesson(Long lessonId, UpsertTrainingLessonRequest request);

    /** Soft delete: the lesson becomes inactive, learner progress is kept. */
    void deleteLesson(Long lessonId);

    void setCover(Long courseId, UpdateCourseCoverRequest request);

    TrainingAssetUploadResponse createAsset(CreateTrainingAssetRequest request, String actor);

    TrainingAssetResponse confirmAsset(Long assetId);
}
