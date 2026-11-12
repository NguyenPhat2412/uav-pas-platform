import React from 'react';
import {TrainingCourseScreen} from '@/components/training/TrainingCourseScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'customer.training.course',
    portal: 'customer',
    section: 'training',
    requiresAuth: true,
};

/** Expo Router screen entry for a customer training course syllabus. */
export default function CustomerTrainingCourseRoute() {
    return <TrainingCourseScreen/>;
}
