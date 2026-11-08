import {queryKeys} from '@/lib/query';
import type {TrainingPortalTier} from '@/types/training/training.types';

type UserId = number | undefined;

/** Prefixes (without the last part) invalidate every portal, course or lesson at once. */
export const trainingKeys = {
    overview: (userId: UserId, portal?: TrainingPortalTier) =>
        portal ? queryKeys.of(userId, 'training', 'overview', portal) : queryKeys.of(userId, 'training', 'overview'),
    courses: (userId: UserId, portal?: TrainingPortalTier) =>
        portal ? queryKeys.of(userId, 'training', 'courses', portal) : queryKeys.of(userId, 'training', 'courses'),
    course: (userId: UserId, slug?: string) =>
        slug ? queryKeys.of(userId, 'training', 'course', slug) : queryKeys.of(userId, 'training', 'course'),
    lesson: (userId: UserId, id: number) => queryKeys.of(userId, 'training', 'lesson', id),
    adminLessons: (userId: UserId, courseId: number) => queryKeys.of(userId, 'training', 'admin-lessons', courseId),
};
