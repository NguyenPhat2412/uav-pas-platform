import type {InvoiceStatus, ServicePlan} from '@/types';

export type PlanInput = Omit<ServicePlan, 'id' | 'active'>;
export type InvoiceFilterKey = 'ALL' | InvoiceStatus | 'OVERDUE';

/** GET /billing/admin/plans/stats. Money is VND; percentages are 0–100. Pending includes overdue. */
export interface InvoiceBucket {
    count: number;
    amount: number;
}

export interface PlanStatsSummary {
    totalCustomers: number;
    payingCustomers: number;
    freeCustomers: number;
    mrr: number;
    revenueThisMonth: number;
    revenueLastMonth: number;
    planRevenueThisMonth: number;
    missionRevenueThisMonth: number;
    pendingInvoices: InvoiceBucket;
    overdueInvoices: InvoiceBucket;
    nearLimitCustomers: number;
    expiringSoon: number;
}

export interface PlanStatsRow {
    planId: number;
    code: string;
    name: string;
    active: boolean;
    price: number;
    billingCycle: string;
    subscribers: number;
    payingSubscribers: number;
    sharePercent: number;
    avgUsagePercent: number;
    nearLimit: number;
    expiringSoon: number;
    pendingInvoices: InvoiceBucket;
    overdueInvoices: InvoiceBucket;
    revenueThisMonth: number;
    revenueTotal: number;
}

/** month is YYYY-MM; byPlan has every plan code. */
export interface PlanStatsMonth {
    month: string;
    total: number;
    byPlan: Record<string, number>;
    missionRevenue: number;
    newSubscriptions: number;
}

export interface NearLimitCustomer {
    userId: number;
    username: string;
    fullName: string | null;
    planCode: string;
    usedHours: number;
    limitHours: number;
    percent: number;
}

export interface PlanStats {
    generatedAt: string;
    summary: PlanStatsSummary;
    plans: PlanStatsRow[];
    monthly: PlanStatsMonth[];
    nearLimit: NearLimitCustomer[];
}

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

export interface VietQrOptions {
    bankBin: string;
    accountNumber: string;
    amount: number;
    memo: string;
}
