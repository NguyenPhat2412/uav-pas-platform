import type {
    FileListQuery,
    FileSortDirection,
    FileSortField,
    StoredFile,
    StoredFileKind,
    StoredFileLink,
    StoredFileModule,
    StoredFileStatus,
} from '@/types/storage/files.types';

export const FILE_MODULES: readonly StoredFileModule[] = [
    'MISSION_MEDIA', 'TRAINING', 'AVATAR', 'STATION_MEDIA', 'UAV_MEDIA', 'EQUIPMENT_MEDIA', 'UNLINKED',
];
export const FILE_KINDS: readonly StoredFileKind[] = ['VIDEO', 'IMAGE', 'DOCUMENT', 'OTHER'];
export const FILE_STATUSES: readonly StoredFileStatus[] = ['IN_USE', 'UNUSED', 'PENDING'];
export const FILE_PAGE_SIZE = 20;

/** Query string for GET /admin/files; "all" filters and blank search are left out. */
export function fileListSearch(query: FileListQuery): string {
    const params = new URLSearchParams();
    if (query.module) params.set('module', query.module);
    if (query.type) params.set('type', query.type);
    if (query.status) params.set('status', query.status);
    const q = query.q?.trim();
    if (q) params.set('q', q);
    params.set('page', String(Math.max(0, query.page)));
    params.set('size', String(query.size));
    params.set('sort', `${query.sort},${query.direction}`);
    return params.toString();
}

/** Clicking the active column flips its direction; another column starts largest/newest first. */
export function nextSort(current: { sort: FileSortField; direction: FileSortDirection }, field: FileSortField) {
    if (current.sort === field) return {sort: field, direction: current.direction === 'desc' ? 'asc' as const : 'desc' as const};
    return {sort: field, direction: 'desc' as const};
}

/** Mirrors the server rule so the button state matches what DELETE will accept. */
export function canDeleteFile(file: Pick<StoredFile, 'deletable' | 'status' | 'module'>): boolean {
    return file.deletable && file.status !== 'IN_USE' && file.module !== 'MISSION_MEDIA';
}

/** Files the cleanup helper may remove, largest first. */
export function cleanupCandidates(files: readonly StoredFile[]): StoredFile[] {
    return files.filter(canDeleteFile).sort((a, b) => b.sizeBytes - a.sizeBytes || a.id.localeCompare(b.id));
}

export function totalBytes(files: readonly Pick<StoredFile, 'sizeBytes'>[]): number {
    return files.reduce((sum, file) => sum + (Number.isFinite(file.sizeBytes) ? file.sizeBytes : 0), 0);
}

/** Admin page that shows the linked item, or null where the platform has none. */
export function linkHref(link: StoredFileLink | null): string | null {
    if (!link || link.id == null) return null;
    switch (link.type) {
        case 'MISSION':
            return `/operations/missions/${link.id}`;
        case 'COURSE':
            return link.slug ? `/admin/training/learn/${encodeURIComponent(link.slug)}` : null;
        case 'USER':
            return `/admin/users/${link.id}`;
        case 'UAV':
            return '/admin/uavs';
        case 'STATION':
            return '/operations/stations';
        case 'EQUIPMENT':
            return '/operations/inventory';
        default:
            return null;
    }
}

export function formatFileSize(bytes: number | null | undefined, formatNumber: (n: number, o?: Intl.NumberFormatOptions) => string = n => String(n)): string {
    if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return '—';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes, unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit++;
    }
    return `${formatNumber(unit === 0 ? value : Math.round(value * 10) / 10, {maximumFractionDigits: unit === 0 ? 0 : 1})} ${units[unit]}`;
}

/** Share of the largest module, for the breakdown bars (0–100). */
export function sharePercent(part: number, whole: number): number {
    if (!Number.isFinite(part) || !Number.isFinite(whole) || whole <= 0 || part <= 0) return 0;
    return Math.min(100, Math.round(part / whole * 1000) / 10);
}
