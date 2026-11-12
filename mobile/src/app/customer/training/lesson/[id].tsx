import React from 'react';
import {TrainingLessonScreen} from '@/components/training/TrainingLessonScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'customer.training.lesson',
    portal: 'customer',
    section: 'training',
    requiresAuth: true,
};

/** Expo Router screen entry for an interactive customer training lesson. */
export default function CustomerTrainingLessonRoute() {
    return <TrainingLessonScreen/>;
}
