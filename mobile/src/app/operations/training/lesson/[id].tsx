import React from 'react';
import {TrainingLessonScreen} from '@/components/training/TrainingLessonScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'operations.training.lesson',
    portal: 'operations',
    section: 'training',
    requiresAuth: true,
};

/** Expo Router screen entry for an interactive operations training lesson. */
export default function OperationsTrainingLessonRoute() {
    return <TrainingLessonScreen/>;
}
