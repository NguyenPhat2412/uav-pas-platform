import type {Station} from '@/types/resources';

export type {Station};

export interface StationDraft {
    code: string;
    name: string;
    address: string;
    latitude: string;
    longitude: string;
}

export type StationFieldErrors = Partial<Record<keyof StationDraft | 'status', string>>;

export function emptyStationDraft(): StationDraft {
    return {
        code: '',
        name: '',
        address: '',
        latitude: '',
        longitude: '',
    };
}

export function toStationDraft(station: Pick<Station, 'code' | 'name' | 'address' | 'latitude' | 'longitude'>): StationDraft {
    return {
        code: station.code,
        name: station.name,
        address: station.address || '',
        latitude: station.latitude != null ? String(station.latitude) : '',
        longitude: station.longitude != null ? String(station.longitude) : '',
    };
}

export function canSubmitStation(draft: StationDraft): boolean {
    return Boolean(draft.code.trim() && draft.name.trim());
}

export function toStationPayload(draft: StationDraft): {
    code: string;
    name: string;
    address?: string;
    latitude?: number;
    longitude?: number;
} {
    return {
        code: draft.code.trim(),
        name: draft.name.trim(),
        address: draft.address.trim() || undefined,
        latitude: draft.latitude.trim() ? Number(draft.latitude) : undefined,
        longitude: draft.longitude.trim() ? Number(draft.longitude) : undefined,
    };
}

export function stationFieldErrors(error: unknown): StationFieldErrors | null {
    const fields = (error as { fields?: Record<string, string> } | null)?.fields;
    return fields && Object.keys(fields).length ? (fields as StationFieldErrors) : null;
}

