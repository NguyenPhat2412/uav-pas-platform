import type {InvoiceStatus, ServicePlan} from '@/types';

export type PlanInput = Omit<ServicePlan, 'id' | 'active'>;

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

export interface BankTransferStatus {
    enabled: boolean;
    bankName: string | null;
}

/** GET /billing/invoices/{id}/bank-transfer. Amounts are VAT inclusive; subtotal/vat split it for display. */
export interface BankTransferInstructions {
    invoiceId: number;
    invoiceCode: string;
    status: string;
    bankBin: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
    transferContent: string;
    qrPayload: string;
    subtotal: number;
    vatRate: number;
    vat: number;
    total: number;
    itemName: string | null;
    flightHours: number | null;
    dueDate: string | null;
    issuedAt: string | null;
}
