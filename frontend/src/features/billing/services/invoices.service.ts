import {apiClient} from '@/lib/api';
import {API_ROUTES} from '@/lib/api/routes';
import type {Invoice, PageResponse} from '@/types';
import type {CreateInvoiceInput, InvoiceFilters} from '@/features/billing/types/billing.interface';

export type {CreateInvoiceInput, InvoiceFilters};

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
