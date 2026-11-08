import React from 'react';
import {TrainingCatalogScreen} from '@/components/training/TrainingCatalogScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'operations.training.catalog',
    portal: 'operations',
    section: 'training',
    requiresAuth: true,
};

/** Expo Router screen entry for the operations training catalog route. */
export default function OperationsTrainingCatalogRoute() {
    return <TrainingCatalogScreen/>;
}
