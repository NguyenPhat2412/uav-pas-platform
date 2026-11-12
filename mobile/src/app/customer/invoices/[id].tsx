import React from 'react';
import {InvoicePaymentScreen} from '@/components/billing/InvoicePaymentScreen';

export interface RouteMeta {
    id: string;
    portal: 'auth' | 'customer' | 'operations';
    section: string;
    requiresAuth: boolean;
}

export const ROUTE_META: RouteMeta = {
    id: 'customer.invoices.detail',
    portal: 'customer',
    section: 'billing',
    requiresAuth: true,
};

/** Expo Router screen entry for the customer invoice payment route. */
export default function CustomerInvoicePaymentRoute() {
    return <InvoicePaymentScreen/>;
}
