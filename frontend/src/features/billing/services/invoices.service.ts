import {API_ROUTES, apiClient} from '@/lib/api';
import type {Invoice, InvoiceStatus, PageResponse} from '@/types';

export interface InvoiceFilters {
    status?: InvoiceStatus;
    overdue?: boolean;
}

export interface CreateInvoiceInput {
    userId: number;
    amount: number;
    missionId?: number;
    planId?: number;
    notes?: string;
}

export const invoicesService = {
    /** Managers receive every customer's invoices; the backend scopes others to their own. */
    page: (page: number, filters: InvoiceFilters, signal?: AbortSignal) => {
        const query = new URLSearchParams({page: String(page), size: '20'});
        if (filters.status) query.set('status', filters.status);
        if (filters.overdue) query.set('overdue', 'true');
        return apiClient.get<PageResponse<Invoice>>(`${API_ROUTES.billing.invoices}?${query}`, {signal});
    },
    create: (input: CreateInvoiceInput) => apiClient.post<Invoice>(API_ROUTES.billing.invoices, input),
};
