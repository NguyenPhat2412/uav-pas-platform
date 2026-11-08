import React from 'react';
import {TrainingCatalogScreen} from '@/components/training/TrainingCatalogScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'customer.training.catalog',
    portal: 'customer',
    section: 'training',
    requiresAuth: true,
};

/** Expo Router screen entry for the customer training catalog route. */
export default function CustomerTrainingCatalogRoute() {
    return <TrainingCatalogScreen/>;
}
