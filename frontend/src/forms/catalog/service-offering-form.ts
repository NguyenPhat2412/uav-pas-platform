import type {ServiceOffering, ServiceOfferingUpdate} from '@/types/catalog/service-offering.types';

export type {ServiceOffering, ServiceOfferingUpdate};

export interface ServiceOfferingSpecDraft {
    bestGsdCm: string;
    maxAreaHectares: string;
    maxWindMs: string;
    onSiteHours: string;
    deliveryHours: string;
}

export interface ServiceOfferingDraft {
    code: string;
    name: string;
    description: string;
    defaultDurationMinutes: string;
    sensors: string[];
    spec: ServiceOfferingSpecDraft;
}

export type ServiceOfferingFieldErrors = Partial<
    Record<
        | 'code'
        | 'name'
        | 'description'
        | 'defaultDurationMinutes'
        | 'sensors'
        | keyof ServiceOfferingSpecDraft,
        string
    >
>;

export function createServiceOfferingDraft(service?: ServiceOffering | null): ServiceOfferingDraft {
    return {
        code: service?.code ?? '',
        name: service?.name ?? '',
        description: service?.description ?? '',
        defaultDurationMinutes: String(service?.defaultDurationMinutes ?? 60),
        sensors: service?.sensors ? [...service.sensors] : [],
        spec: {
            bestGsdCm: service?.bestGsdCm?.toString() ?? '',
            maxAreaHectares: service?.maxAreaHectares?.toString() ?? '',
            maxWindMs: service?.maxWindMs?.toString() ?? '',
            onSiteHours: service?.onSiteHours?.toString() ?? '',
            deliveryHours: service?.deliveryHours?.toString() ?? '',
        },
    };
}

export function canSubmitServiceOffering(draft: ServiceOfferingDraft, isEdit = false): boolean {
    return Boolean(
        (isEdit || draft.code.trim()) &&
            draft.name.trim() &&
            draft.defaultDurationMinutes.trim(),
    );
}

function parseOptionalNumber(raw: string): number | null {
    return raw.trim() === '' ? null : Number(raw);
}

export function toServiceOfferingPayload(
    draft: ServiceOfferingDraft,
    id?: number,
): { id?: number; code: string; details: ServiceOfferingUpdate } {
    return {
        id,
        code: draft.code.trim().toUpperCase(),
        details: {
            name: draft.name.trim(),
            description: draft.description.trim() || undefined,
            defaultDurationMinutes: Number(draft.defaultDurationMinutes),
            sensors: [...draft.sensors],
            bestGsdCm: parseOptionalNumber(draft.spec.bestGsdCm),
            maxAreaHectares: parseOptionalNumber(draft.spec.maxAreaHectares),
            maxWindMs: parseOptionalNumber(draft.spec.maxWindMs),
            onSiteHours: parseOptionalNumber(draft.spec.onSiteHours),
            deliveryHours: parseOptionalNumber(draft.spec.deliveryHours),
        },
    };
}

export function serviceOfferingFieldErrors(error: unknown): ServiceOfferingFieldErrors | null {
    const fields = (error as { fields?: Record<string, string> } | null)?.fields;
    return fields && Object.keys(fields).length ? (fields as ServiceOfferingFieldErrors) : null;
}

