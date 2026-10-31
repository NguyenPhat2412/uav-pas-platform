package com.uav.platform.service.training;

import com.uav.platform.dto.request.training.CreateTrainingAssetRequest;
import com.uav.platform.dto.request.training.UpdateCourseCoverRequest;
import com.uav.platform.dto.request.training.UpsertTrainingLessonRequest;
import com.uav.platform.dto.response.training.TrainingAssetResponse;
import com.uav.platform.dto.response.training.TrainingAssetUploadResponse;
import com.uav.platform.dto.response.training.TrainingLessonAdminResponse;

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
