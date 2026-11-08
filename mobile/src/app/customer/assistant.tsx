import React from 'react';
import {AssistantScreen} from '@/components/assistant/AssistantScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'customer.assistant',
    portal: 'customer',
    section: 'assistant',
    requiresAuth: true,
};

/** Expo Router screen entry for the customer AI assistant route. */
export default function CustomerAssistantRoute() {
    return <AssistantScreen/>;
}
