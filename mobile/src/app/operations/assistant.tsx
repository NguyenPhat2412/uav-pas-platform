import React from 'react';
import {AssistantScreen} from '@/components/assistant/AssistantScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'operations.assistant',
    portal: 'operations',
    section: 'assistant',
    requiresAuth: true,
};

/** Expo Router screen entry for the operations AI assistant route. */
export default function OperationsAssistantRoute() {
    return <AssistantScreen/>;
}
