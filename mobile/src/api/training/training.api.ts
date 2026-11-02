import {apiClient, API_ROUTES} from '@/lib/api/client';
import type {
    TrainingCourseDetail,
    TrainingCourseSummary,
    TrainingDocument,
    TrainingLessonDetail,
    TrainingPortalTier,
    UpdateTrainingLessonProgressPayload,
    UpdateTrainingProgressPayload,
} from '@/shared/types/training/training.types';

/** The learner half of the web trainingService (docs/training-courses-api.md); the app never edits courses. */
export const trainingService = {
    listCourses: (portal: TrainingPortalTier, signal?: AbortSignal) =>
        apiClient.get<TrainingCourseSummary[]>(`${API_ROUTES.training.courses}?portal=${portal}`, {signal}),
    getCourse: (codeOrSlug: string, signal?: AbortSignal) =>
        apiClient.get<TrainingCourseDetail>(API_ROUTES.training.course(codeOrSlug), {signal}),
    getLesson: (id: number, signal?: AbortSignal) =>
        apiClient.get<TrainingLessonDetail>(API_ROUTES.training.lesson(id), {signal}),
    updateLessonProgress: (id: number, payload: UpdateTrainingLessonProgressPayload) =>
        apiClient.put<TrainingLessonDetail>(API_ROUTES.training.lessonProgress(id), payload),
    /** A course's practical checklist (the course is a training document on the server). */
    updateProgress: (documentId: number, payload: UpdateTrainingProgressPayload) =>
        apiClient.put<TrainingDocument>(API_ROUTES.training.progress(documentId), payload),
};
