export type ApiError = {
    status: number;
    error?: string;
    code?: string;
    message?: string;
    path?: string;
    timestamp?: string;
};

export type Page<T> = {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
};

export interface PageResponse<T> {
    content: T[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
    hasNext: boolean;
    hasPrevious: boolean;
}

export type InvoiceStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';

export interface ServicePlan {
    id: number;
    code: string;
    name: string;
    price: number;
    billingCycle: string;
    maxMonthlyFlightHours: number;
    maxConcurrentUavs: number;
    allowSarAi: boolean;
    description?: string;
    active: boolean;
}

export interface UserQuota {
    id: number;
    userId: number;
    username: string;
    fullName?: string;
    planCode: string;
    planName: string;
    flightHoursUsed: number;
    flightHoursLimit: number;
    flightHoursRemaining: number;
    concurrentUavsUsed: number;
    concurrentUavsLimit: number;
    cycleStart: string;
    cycleEnd: string;
}

export interface Invoice {
    id: number;
    code: string;
    userId: number;
    username: string;
    missionId?: number;
    missionTitle?: string;
    planId?: number;
    planName?: string;
    amount: number;
    status: InvoiceStatus;
    dueDate: string;
    paidAt?: string;
    notes?: string;
    createdAt: string;
}
