import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {trainingKeys} from '@/shared/hooks/training/query-keys';
import {trainingService} from '@/api/training/training.api';
import {useAuth} from '@/providers/AuthContext';
import type {TrainingCourseDetail, TrainingLessonDetail, UpdateTrainingLessonProgressPayload} from '@/shared/types/training/training.types';

/** The customer course catalogue (same cache keys as the web /customer/training page). */
export function useTrainingCourses() {
    const {user} = useAuth();
    return useQuery({
        queryKey: trainingKeys.courses(user?.id, 'CUSTOMER'),
        queryFn: ({signal}) => trainingService.listCourses('CUSTOMER', signal),
        enabled: !!user,
    });
}

export function useTrainingCourse(slug: string) {
    const {user} = useAuth();
    return useQuery({
        queryKey: trainingKeys.course(user?.id, slug),
        queryFn: ({signal}) => trainingService.getCourse(slug, signal),
        enabled: !!user && !!slug,
    });
}

export function useTrainingLesson(id: number) {
    const {user} = useAuth();
    return useQuery({
        queryKey: trainingKeys.lesson(user?.id, id),
        queryFn: ({signal}) => trainingService.getLesson(id, signal),
        enabled: !!user && Number.isSafeInteger(id) && id > 0,
        // Signed media URLs change on every fetch; refetching would restart the video.
        staleTime: 30 * 60 * 1000,
    });
}

/** Saves a lesson's position or completion; the course and catalogue refresh only when completion flips. */
export function useTrainingLessonProgress(slug: string) {
    const {user} = useAuth();
    const client = useQueryClient();
    return useMutation({
        mutationFn: ({id, payload}: { id: number; payload: UpdateTrainingLessonProgressPayload; wasCompleted: boolean }) =>
            trainingService.updateLessonProgress(id, payload),
        onSuccess: (saved, {id, wasCompleted}) => {
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
        mutationFn: ({checkedSteps, markCompleted}: { checkedSteps: number[]; markCompleted: boolean }) =>
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
