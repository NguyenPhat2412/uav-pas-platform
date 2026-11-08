/**
 * URL-Friendly Slug & Route Resolution Utilities
 *
 * Formats human-readable slugs (e.g. `msn-2026-0015-15`, `nguyen-van-an-4`, `uav-m350-01-5`)
 * while preserving full backward compatibility with numeric IDs (`15`, `4`, `5`) and code lookups.
 */

export function slugifyText(value: string | null | undefined): string {
    if (!value) return '';
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-');
}

/**
 * Extracts the numeric entity ID from either a pure numeric parameter (`"42"`)
 * or a human-readable slug with a trailing numeric ID (`"msn-2026-0042-42"`, `"nguyen-van-an-4"`).
 */
export function parseEntityId(param: string | null | undefined): number {
    if (!param) return NaN;
    const trimmed = decodeURIComponent(param).trim();
    if (/^\d+$/.test(trimmed)) {
        const direct = Number(trimmed);
        return Number.isSafeInteger(direct) && direct > 0 ? direct : NaN;
    }
    const match = trimmed.match(/-(\d+)$/);
    if (match) {
        const extracted = Number(match[1]);
        return Number.isSafeInteger(extracted) && extracted > 0 ? extracted : NaN;
    }
    return NaN;
}

export function toMissionSlug(mission: { id: number; code?: string | null; title?: string | null }): string {
    const prefix = slugifyText(mission.code) || slugifyText(mission.title) || 'mission';
    return `${prefix}-${mission.id}`;
}

export function toUserSlug(user: { id: number; username?: string | null; fullName?: string | null }): string {
    const prefix = slugifyText(user.username) || slugifyText(user.fullName) || 'user';
    return `${prefix}-${user.id}`;
}

export function toUavSlug(uav: { id: number; serialNumber?: string | null; model?: string | null }): string {
    const prefix = slugifyText(uav.serialNumber) || slugifyText(uav.model) || 'uav';
    return `${prefix}-${uav.id}`;
}

export function toStationSlug(station: { id: number; code?: string | null; name?: string | null }): string {
    const prefix = slugifyText(station.code) || slugifyText(station.name) || 'station';
    return `${prefix}-${station.id}`;
}

export function toServiceSlug(service: { id: number; code?: string | null; name?: string | null }): string {
    const prefix = slugifyText(service.code) || slugifyText(service.name) || 'service';
    return `${prefix}-${service.id}`;
}

/**
 * Resolves a service ID from URL query parameters (`?service=...` or legacy `?serviceId=...`).
 * Supports slug with trailing ID (`area-inspection-2`), service code (`area-inspection` / `AREA_INSPECTION`), or numeric ID (`2`).
 */
export function resolveServiceIdFromParam(
    serviceParam: string | null | undefined,
    legacyServiceIdParam?: string | null | undefined,
    catalogue?: readonly { id: number; code: string; name?: string }[]
): number | undefined {
    const raw = serviceParam || legacyServiceIdParam;
    if (!raw) return undefined;
    if (catalogue?.length) {
        const normalized = slugifyText(raw);
        const found = catalogue.find(
            item => toServiceSlug(item) === normalized || slugifyText(item.code) === normalized || slugifyText(item.name) === normalized
        );
        if (found) return found.id;
    }
    const byId = parseEntityId(raw);
    if (Number.isSafeInteger(byId) && byId > 0) return byId;
    return -1;
}

/**
 * Resolves a UAV ID string from URL query parameters (`?uav=...` or legacy `?uavId=...`).
 * Supports slug with trailing ID (`uav-m350-01-5`), serialNumber (`UAV-M350-01`), or numeric ID (`5`).
 */
export function resolveUavIdFromParam(
    uavParam: string | null | undefined,
    legacyUavIdParam?: string | null | undefined,
    uavs?: readonly { id: number; serialNumber?: string | null; model?: string | null }[]
): string {
    const raw = uavParam || legacyUavIdParam;
    if (!raw) return '';
    if (uavs?.length) {
        const normalized = slugifyText(raw);
        const found = uavs.find(
            item => toUavSlug(item) === normalized || slugifyText(item.serialNumber) === normalized
        );
        if (found) return String(found.id);
    }
    const byId = parseEntityId(raw);
    if (Number.isSafeInteger(byId) && byId > 0) return String(byId);
    return '';
}

/**
 * Resolves a Station ID from URL query parameters (`?station=...` or legacy `?stationId=...`).
 */
export function resolveStationIdFromParam(
    stationParam: string | null | undefined,
    stations?: readonly { id: number; code?: string | null; name?: string | null }[]
): number | undefined {
    if (!stationParam) return undefined;
    if (stations?.length) {
        const normalized = slugifyText(stationParam);
        const found = stations.find(
            item => toStationSlug(item) === normalized || slugifyText(item.code) === normalized
        );
        if (found) return found.id;
    }
    const byId = parseEntityId(stationParam);
    if (Number.isSafeInteger(byId) && byId > 0) return byId;
    return undefined;
}
