import type {ServicePlan} from '@/types';
import type {UserQuota} from '@/types/admin';
import type {CreateInvoiceInput, PlanInput} from '@/types/billing/billing.types';

export type {CreateInvoiceInput, PlanInput, ServicePlan, UserQuota};

export interface ServicePlanDraft {
    code: string;
    name: string;
    price: string;
    billingCycle: string;
    maxMonthlyFlightHours: string;
    maxConcurrentUavs: string;
    allowSarAi: boolean;
    description: string;
}

export type ServicePlanFieldErrors = Partial<Record<keyof ServicePlanDraft, string>>;

export interface InvoiceCustomerOption {
    id: number;
    name: string;
}

export interface CreateInvoiceDraft {
    customer: InvoiceCustomerOption | null;
    amount: string;
    planId: string;
    missionId: string;
    notes: string;
}

export type InvoiceFieldErrors = Partial<
    Record<'userId' | 'amount' | 'planId' | 'missionId' | 'notes', string>
>;

export interface UserQuotaDraft {
    planCode: string;
    flightHoursLimit: string;
}

export type QuotaFieldErrors = Partial<Record<'planCode' | 'flightHoursLimit', string>>;

export function createServicePlanDraft(plan?: ServicePlan | null): ServicePlanDraft {
    return {
        code: plan?.code ?? '',
        name: plan?.name ?? '',
        price: plan ? String(plan.price) : '',
        billingCycle: plan?.billingCycle ?? 'MONTHLY',
        maxMonthlyFlightHours: String(plan?.maxMonthlyFlightHours ?? 20),
        maxConcurrentUavs: String(plan?.maxConcurrentUavs ?? 1),
        allowSarAi: plan?.allowSarAi ?? false,
        description: plan?.description ?? '',
    };
}

export function canSubmitServicePlan(draft: ServicePlanDraft, isEdit = false): boolean {
    return Boolean(
        (isEdit || draft.code.trim()) &&
            draft.name.trim() &&
            draft.price.trim() &&
            draft.maxMonthlyFlightHours.trim() &&
            draft.maxConcurrentUavs.trim(),
    );
}

export function toServicePlanPayload(draft: ServicePlanDraft): PlanInput {
    return {
        code: draft.code.trim().toUpperCase(),
        name: draft.name.trim(),
        price: Number(draft.price),
        billingCycle: draft.billingCycle,
        maxMonthlyFlightHours: Number(draft.maxMonthlyFlightHours),
        maxConcurrentUavs: Number(draft.maxConcurrentUavs),
        allowSarAi: draft.allowSarAi,
        description: draft.description.trim() || undefined,
    };
}

export function servicePlanFieldErrors(error: unknown): ServicePlanFieldErrors | null {
    const fields = (error as { fields?: Record<string, string> } | null)?.fields;
    return fields && Object.keys(fields).length ? (fields as ServicePlanFieldErrors) : null;
}

export function emptyCreateInvoiceDraft(): CreateInvoiceDraft {
    return {
        customer: null,
        amount: '',
        planId: '',
        missionId: '',
        notes: '',
    };
}

export function canSubmitCreateInvoice(draft: CreateInvoiceDraft): boolean {
    return Boolean(draft.customer && draft.amount.trim());
}

export function toCreateInvoicePayload(draft: CreateInvoiceDraft): CreateInvoiceInput {
    return {
        userId: draft.customer?.id ?? 0,
        amount: Number(draft.amount),
        notes: draft.notes.trim() || undefined,
        planId: draft.planId.trim() ? Number(draft.planId) : undefined,
        missionId: draft.missionId.trim() ? Number(draft.missionId) : undefined,
    };
}

export function invoiceFieldErrors(error: unknown): InvoiceFieldErrors | null {
    const fields = (error as { fields?: Record<string, string> } | null)?.fields;
    return fields && Object.keys(fields).length ? (fields as InvoiceFieldErrors) : null;
}

export function toUserQuotaDraft(
    quota: Pick<UserQuota, 'planCode' | 'flightHoursLimit'>,
): UserQuotaDraft {
    return {
        planCode: quota.planCode,
        flightHoursLimit: String(quota.flightHoursLimit),
    };
}

export function canSubmitUserQuota(draft: UserQuotaDraft): boolean {
    return Boolean(draft.planCode.trim() && draft.flightHoursLimit.trim());
}

export function toUserQuotaPayload(
    userId: number,
    draft: UserQuotaDraft,
): { userId: number; planCode: string; flightHoursLimit: number } {
    return {
        userId,
        planCode: draft.planCode.trim(),
        flightHoursLimit: Number(draft.flightHoursLimit),
    };
}

export function quotaFieldErrors(error: unknown): QuotaFieldErrors | null {
    const fields = (error as { fields?: Record<string, string> } | null)?.fields;
    return fields && Object.keys(fields).length ? (fields as QuotaFieldErrors) : null;
}

