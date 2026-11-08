import React from 'react';
import {TrainingCourseScreen} from '@/components/training/TrainingCourseScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'operations.training.course',
    portal: 'operations',
    section: 'training',
    requiresAuth: true,
};

/** Expo Router screen entry for an operations training course syllabus. */
export default function OperationsTrainingCourseRoute() {
    return <TrainingCourseScreen/>;
}
