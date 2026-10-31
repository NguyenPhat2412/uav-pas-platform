package com.uav.platform.service.training;

import com.uav.platform.dto.request.training.UpdateLessonProgressRequest;
import com.uav.platform.dto.response.training.TrainingCourseDetailResponse;
import com.uav.platform.dto.response.training.TrainingCourseSummaryResponse;
import com.uav.platform.dto.response.training.TrainingLessonDetailResponse;

import org.springframework.security.core.Authentication;

import java.util.List;

/**
 * Learner side of training courses. The portal rule of the document endpoints applies: hidden courses and
 * courses of a portal the caller's role may not use answer 404.
 */
public interface TrainingCourseService {

    List<TrainingCourseSummaryResponse> listCourses(String portal, Authentication authentication);

    TrainingCourseDetailResponse getCourse(String codeOrSlug, Authentication authentication);

    /**
     * One course card by id with the caller's progress, without the portal rule: only for authoring endpoints
     * (returned after an admin changes the cover).
     */
    TrainingCourseSummaryResponse getCourseSummary(Long courseId, Authentication authentication);

    TrainingLessonDetailResponse getLesson(Long lessonId, Authentication authentication);

    TrainingLessonDetailResponse updateLessonProgress(
            Long lessonId, UpdateLessonProgressRequest request, Authentication authentication);
}
