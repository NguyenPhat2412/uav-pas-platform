'use client';
import {useCallback} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@/providers/AuthContext';
import {afterSuccess, type MutationOptions} from '@/lib/query';
import {trainingService} from '@/api/training/training.api';
import {trainingKeys} from '@/hooks/training/query-keys';
import type {
    AdminTrainingLesson,
    TrainingCourseDetail,
    TrainingCourseSummary,
    TrainingDocument,
    TrainingLessonDetail,
    TrainingOverview,
    TrainingPortalTier,
    UpdateTrainingLessonProgressPayload,
    UpsertTrainingDocumentPayload,
    UpsertTrainingLessonPayload,
} from '@/types/training/training.types';

/** SOP documents of one portal with the learner's checklist progress. */
export function useTrainingOverview(portal: TrainingPortalTier) {
    const {user} = useAuth();
    return useQuery({
        queryKey: trainingKeys.overview(user?.id, portal),
        queryFn: ({signal}) => trainingService.getOverview({portal}, signal),
    });
}

/**
 * Ticks SOP checklist steps. The next click is computed from the cached document, so the server's copy
 * is written in right away and the mutation stays pending until the refetched totals have landed too.
 */
export function useTrainingDocumentProgress(portal: TrainingPortalTier) {
    const {user} = useAuth();
    const client = useQueryClient();
    return useMutation({
        mutationFn: ({documentId, checkedSteps, markCompleted}: {documentId: number; checkedSteps: number[]; markCompleted?: boolean}) =>
            trainingService.updateProgress(documentId, {checkedSteps, markCompleted}),
        onSuccess: saved => {
            client.setQueryData<TrainingOverview>(trainingKeys.overview(user?.id, portal), overview =>
                overview && saved
                    ? {...overview, documents: overview.documents.map(doc => (doc.id === saved.id ? {...doc, ...saved} : doc))}
                    : overview);
            return client.invalidateQueries({queryKey: trainingKeys.overview(user?.id, portal)});
        },
    });
}

/** Creates a document, or updates `documentId` when given; every portal's overview is refreshed. */
export function useSaveTrainingDocument(documentId: number | undefined, options?: MutationOptions<TrainingDocument, UpsertTrainingDocumentPayload>) {
    const {user} = useAuth();
    const client = useQueryClient();
    return useMutation({
        ...options,
        mutationFn: (payload: UpsertTrainingDocumentPayload) =>
            documentId != null ? trainingService.updateDocument(documentId, payload) : trainingService.createDocument(payload),
        onSuccess: afterSuccess(options, () => {
            void client.invalidateQueries({queryKey: trainingKeys.overview(user?.id)});
        }),
    });
}

/** The learner's course catalogue for one portal. */
export function useTrainingCourses(portal: TrainingPortalTier) {
    const {user} = useAuth();
    return useQuery({
        queryKey: trainingKeys.courses(user?.id, portal),
        queryFn: ({signal}) => trainingService.listCourses(portal, signal),
    });
}

export function useTrainingCourse(slug: string) {
    const {user} = useAuth();
    return useQuery({
        queryKey: trainingKeys.course(user?.id, slug),
        queryFn: ({signal}) => trainingService.getCourse(slug, signal),
    });
}

/** One cache entry per lesson, shared by the stage and the sidebar's "Tài liệu" menus. */
export function useTrainingLesson(id: number, enabled = true) {
    const {user} = useAuth();
    return useQuery({
        queryKey: trainingKeys.lesson(user?.id, id),
        queryFn: ({signal}) => trainingService.getLesson(id, signal),
        enabled,
        // Signed media URLs change on every fetch; refetching would restart the video.
        staleTime: 30 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
}

/** Saves a lesson's position or completion; the course and catalogue refresh only when completion flips. */
export function useTrainingLessonProgress(slug: string) {
    const {user} = useAuth();
    const client = useQueryClient();
    return useMutation({
        mutationFn: ({id, payload}: {id: number; payload: UpdateTrainingLessonProgressPayload; wasCompleted: boolean}) =>
            trainingService.updateLessonProgress(id, payload),
        onSuccess: (saved, {id, wasCompleted}) => {
            // Keep the cached signed URLs; only the progress fields change.
            client.setQueryData<TrainingLessonDetail>(trainingKeys.lesson(user?.id, id), current =>
                current ? {...current, completed: saved?.completed ?? current.completed, positionSeconds: saved?.positionSeconds ?? current.positionSeconds} : current);
            if ((saved?.completed ?? false) !== wasCompleted) {
                void client.invalidateQueries({queryKey: trainingKeys.course(user?.id, slug)});
                void client.invalidateQueries({queryKey: trainingKeys.courses(user?.id)});
            }
        },
    });
}

/** Ticks a course's practical checklist; pending until the course and catalogue have refetched. */
export function useTrainingCourseChecklist(courseId: number, slug: string) {
    const {user} = useAuth();
    const client = useQueryClient();
    return useMutation({
        mutationFn: ({checkedSteps, markCompleted}: {checkedSteps: number[]; markCompleted: boolean}) =>
            trainingService.updateProgress(courseId, {checkedSteps, markCompleted}),
        onSuccess: saved => {
            client.setQueryData<TrainingCourseDetail>(trainingKeys.course(user?.id, slug), current =>
                current && saved ? {...current, checkedSteps: saved.checkedSteps ?? current.checkedSteps} : current);
            return Promise.all([
                client.invalidateQueries({queryKey: trainingKeys.course(user?.id, slug)}),
                client.invalidateQueries({queryKey: trainingKeys.courses(user?.id)}),
            ]);
        },
    });
}

/** Every lesson of a course, hidden ones included (admin). */
export function useAdminTrainingLessons(courseId: number) {
    const {user} = useAuth();
    return useQuery({
        queryKey: trainingKeys.adminLessons(user?.id, courseId),
        queryFn: ({signal}) => trainingService.adminListLessons(courseId, signal),
    });
}

/** Refreshes the admin lesson list, every catalogue and every open course after a lesson change. */
export function useRefreshTrainingCourse(courseId: number) {
    const {user} = useAuth();
    const client = useQueryClient();
    return useCallback(() => Promise.all([
        client.invalidateQueries({queryKey: trainingKeys.adminLessons(user?.id, courseId)}),
        client.invalidateQueries({queryKey: trainingKeys.courses(user?.id)}),
        client.invalidateQueries({queryKey: trainingKeys.course(user?.id)}),
    ]), [client, user?.id, courseId]);
}

/** Saves lessons one after another (a reorder touches several); the lists refresh whatever the outcome. */
export function useUpdateTrainingLessons(courseId: number) {
    const refresh = useRefreshTrainingCourse(courseId);
    return useMutation({
        mutationFn: async (updates: {id: number; payload: UpsertTrainingLessonPayload}[]) => {
            for (const {id, payload} of updates) await trainingService.adminUpdateLesson(id, payload);
        },
        onSettled: refresh,
    });
}

/** Sets or clears the course cover; the returned summary replaces the catalogue entry at once. */
export function useSetTrainingCover(courseId: number, portal: TrainingPortalTier, options?: MutationOptions<TrainingCourseSummary, number | null>) {
    const {user} = useAuth();
    const client = useQueryClient();
    return useMutation({
        ...options,
        mutationFn: (assetId: number | null) => trainingService.adminSetCover(courseId, assetId),
        onSuccess: afterSuccess(options, saved => {
            if (saved) {
                client.setQueryData<TrainingCourseSummary[]>(trainingKeys.courses(user?.id, portal), list =>
                    list?.map(course => (course.id === saved.id ? {...course, ...saved} : course)));
            }
        }),
        onSettled: () => client.invalidateQueries({queryKey: trainingKeys.courses(user?.id)}),
    });
}

/** Creates a lesson, or updates `lessonId` when given. The caller refreshes the lists in onSuccess. */
export function useSaveTrainingLesson(lessonId: number | undefined, options?: MutationOptions<AdminTrainingLesson, UpsertTrainingLessonPayload>) {
    return useMutation({
        ...options,
        mutationFn: (payload: UpsertTrainingLessonPayload) =>
            lessonId != null ? trainingService.adminUpdateLesson(lessonId, payload) : trainingService.adminCreateLesson(payload),
    });
}

/**
 * Step-by-step admin uploads (per-file progress, then one lesson per drop): the component drives the
 * sequence itself, so these are plain request functions rather than mutations.
 */
export function useTrainingUploads() {
    return TRAINING_UPLOADS;
}

const TRAINING_UPLOADS = {uploadAsset: trainingService.uploadAsset, createLesson: trainingService.adminCreateLesson};
