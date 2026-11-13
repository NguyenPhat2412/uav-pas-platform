/* Billing back-office: payment transactions, the financial outbox and customer billing profiles. */

/** One payment/IPN record as returned by GET /api/v1/billing/admin/transactions. */
export interface AdminPaymentTransaction {
    id: number;
    transactionCode: string;
    gatewayName: string;
    amount: number;
    status: string;
    bankBin: string | null;
    bankAccountNumber: string | null;
    invoiceId: number | null;
    invoiceCode: string | null;
    invoiceStatus: string | null;
    invoiceAmount: number | null;
    userId: number | null;
    username: string | null;
    customerName: string | null;
    customerEmail: string | null;
    /** Provider callback with credential-like fields already masked by the backend. */
    rawCallback: string | null;
    createdAt: string | null;
    completedAt: string | null;
    /** Set when an admin closed a transfer that could not settle its invoice. */
    resolution: 'REFUNDED' | null;
    resolutionNote: string | null;
    resolvedAt: string | null;
    resolvedBy: string | null;
}

export interface TransactionFilters {
    status?: string;
    gateway?: string;
    from?: string;
    to?: string;
    invoiceId?: string;
    q?: string;
}

export interface FinancialOutboxEvent {
    id: string;
    eventType: string;
    invoiceId: number;
    userId: number;
    payload: string;
    status: string;
    attempts: number;
    notificationCreated: boolean;
    lastError: string | null;
    nextAttemptAt: string;
    createdAt: string;
    retryable: boolean;
}

export interface AdminBillingProfile {
    organizationName: string | null;
    taxCode: string | null;
    billingAddress: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    version: number;
    updatedAt: string | null;
}

export interface PaymentGatewayConfig {
    bankTransferConfigured: boolean;
    bankBin: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
    vatRate: number;
    webhookAutoReconcileReady: boolean;
    providerEnabled: boolean;
    secretConfigured: boolean;
    sepayWebhookPath: string;
    ipnWebhookPath: string;
    sampleQrPayload: string | null;
}

export interface PaymentGatewayConfigInput {
    bankBin: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
    vatRate: number;
}

/** GET /billing/admin/statistics — money is whole VND; period figures cover [from, to]. */
export interface PaymentStatsPeriod {
    collected: number;
    paidCount: number;
    issued: number;
    issuedCount: number;
    collectionRate: number;
    avgDaysToPay: number;
    averageInvoice: number;
    refunded: number;
    payingCustomers: number;
}

export interface PaymentStatsSlice {
    key: string;
    count: number;
    amount: number;
}

export interface PaymentStatistics {
    from: string;
    to: string;
    period: PaymentStatsPeriod;
    previous: PaymentStatsPeriod;
    outstanding: {pendingCount: number; pendingAmount: number; overdueCount: number; overdueAmount: number};
    monthly: {month: string; issued: number; collected: number; refunded: number}[];
    byGateway: PaymentStatsSlice[];
    bySource: PaymentStatsSlice[];
    byPlan: PaymentStatsSlice[];
    byStatus: PaymentStatsSlice[];
    aging: PaymentStatsSlice[];
    review: {
        pendingCount: number;
        pendingAmount: number;
        mismatchCount: number;
        unmatchedCount: number;
        refundedCount: number;
        refundedAmount: number;
    };
    topCustomers: {userId: number; name: string; paidCount: number; paid: number; outstanding: number}[];
}
