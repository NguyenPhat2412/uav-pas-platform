export type StoredFileModule =
    | 'MISSION_MEDIA'
    | 'TRAINING'
    | 'AVATAR'
    | 'STATION_MEDIA'
    | 'UAV_MEDIA'
    | 'EQUIPMENT_MEDIA'
    | 'UNLINKED';
export type StoredFileKind = 'VIDEO' | 'IMAGE' | 'DOCUMENT' | 'OTHER';
export type StoredFileStatus = 'IN_USE' | 'UNUSED' | 'PENDING';
export type FileSortField = 'createdAt' | 'sizeBytes';
export type FileSortDirection = 'asc' | 'desc';

export interface StoredFileLink {
    type: 'MISSION' | 'COURSE' | 'USER' | 'STATION' | 'UAV' | 'EQUIPMENT' | string;
    id: number | null;
    label: string | null;
    slug: string | null;
}

/** One stored object; id is "MODULE:dbId". */
export interface StoredFile {
    id: string;
    module: StoredFileModule;
    fileName: string;
    contentType: string;
    kind: StoredFileKind;
    sizeBytes: number;
    storageKey: string;
    owner: { id: number | null; name: string } | null;
    linkedTo: StoredFileLink | null;
    status: StoredFileStatus;
    deletable: boolean;
    createdAt: string;
}

export interface StoredFilePage {
    content: StoredFile[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
}

export interface FileTotal {
    count: number;
    bytes: number;
}

export interface StoredFileSummary {
    total: FileTotal;
    unused: FileTotal;
    pending: FileTotal;
    byModule: { module: StoredFileModule; count: number; bytes: number; unusedCount: number; pendingCount: number }[];
    byKind: { kind: StoredFileKind; count: number; bytes: number }[];
    largest: StoredFile[];
}

export interface FileListQuery {
    module?: StoredFileModule;
    type?: StoredFileKind;
    status?: StoredFileStatus;
    q?: string;
    page: number;
    size: number;
    sort: FileSortField;
    direction: FileSortDirection;
}
