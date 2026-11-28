export interface DeviceKeyCreateDraft {
    name: string;
    uavId: string;
    expiresAt: string;
}

export type DeviceKeyFieldErrors = Partial<Record<'name' | 'uavId' | 'expiresAt', string>>;

export function emptyDeviceKeyCreateDraft(): DeviceKeyCreateDraft {
    return {
        name: '',
        uavId: '',
        expiresAt: '',
    };
}

export function canSubmitDeviceKeyCreate(draft: DeviceKeyCreateDraft): boolean {
    return draft.name.trim().length > 0;
}

export function toDeviceKeyCreatePayload(draft: DeviceKeyCreateDraft): {
    name: string;
    uavId: number | null;
    expiresAt: string | null;
} {
    const rawExpiry = draft.expiresAt.trim();
    return {
        name: draft.name.trim(),
        uavId: draft.uavId.trim() ? Number(draft.uavId) : null,
        expiresAt: rawExpiry ? (rawExpiry.length === 16 ? `${rawExpiry}:00` : rawExpiry) : null,
    };
}

export function deviceKeyFieldErrors(error: unknown): DeviceKeyFieldErrors | null {
    const fields = (error as { fields?: Record<string, string> } | null)?.fields;
    return fields && Object.keys(fields).length ? (fields as DeviceKeyFieldErrors) : null;
}

