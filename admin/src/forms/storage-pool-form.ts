import type {
    DriveAllocationStrategy,
    GoogleOAuthAuthorizeInput,
    GoogleOAuthConfigInput,
    StorageBackendMode,
    StorageDriveNodeCreateInput,
    StorageDriveNodeUpdateInput,
    StoragePoolPolicyInput,
    StorageR2MigrationInput,
} from '@/types/storage-pool.types';

export const STORAGE_BACKEND_MODES: readonly StorageBackendMode[] = ['GOOGLE_DRIVE', 'HYBRID_TIERED', 'R2'];
export const STORAGE_STRATEGIES: readonly DriveAllocationStrategy[] = [
    'MOST_FREE_SPACE',
    'MODULE_PRIORITY',
    'ROUND_ROBIN',
];
export const STORAGE_ROUTE_TAGS = ['ALL', 'MISSION_MEDIA', 'TRAINING', 'VIDEO', 'IMAGE', 'DOCUMENT'] as const;

export type DriveConnectTab = 'oauth_redirect' | 'oauth_manual' | 'service_account';

export type StoragePoolValidationError =
    | 'oauthClientRequired'
    | 'nameRequired'
    | 'refreshTokenRequired'
    | 'saJsonRequired';

export function clampStorageTieredMb(raw: string): number {
    return Math.min(100, Math.max(1, Math.round(Number(raw) || 5)));
}

export function clampDrivePriorityWeight(raw: string): number {
    return Math.min(1000, Math.max(1, Math.round(Number(raw) || 100)));
}

export function clampDriveMaxUsagePercent(raw: string): number {
    return Math.min(99, Math.max(50, Math.round(Number(raw) || 92)));
}

export function parseStorageRoutedModules(csv?: string | null): string[] {
    const parsed = (csv ?? 'ALL')
        .split(',')
        .map(v => v.trim().toUpperCase())
        .filter(Boolean);
    return parsed.length > 0 ? parsed : ['ALL'];
}

export function formatStorageRoutedModulesCsv(selected: readonly string[]): string {
    return selected.length > 0 ? selected.join(',') : 'ALL';
}

export function toggleStorageRouteTag(current: readonly string[], tag: string): string[] {
    if (tag === 'ALL') return ['ALL'];
    const withoutAll = current.filter(item => item !== 'ALL');
    if (withoutAll.includes(tag)) {
        const next = withoutAll.filter(item => item !== tag);
        return next.length > 0 ? next : ['ALL'];
    }
    return [...withoutAll, tag];
}

export function buildStoragePolicyInput(params: {
    primaryBackend: StorageBackendMode;
    allocationStrategy: DriveAllocationStrategy;
    fallbackToR2: boolean;
    tieredMb: string;
}): StoragePoolPolicyInput {
    const mb = clampStorageTieredMb(params.tieredMb);
    return {
        primaryBackend: params.primaryBackend,
        allocationStrategy: params.allocationStrategy,
        fallbackToR2: params.fallbackToR2,
        tieredSmallFileMaxBytes: mb * 1024 * 1024,
    };
}

export function validateGoogleOAuthConfigInput(params: {
    clientId: string;
    clientSecret: string;
}): { ok: true; data: GoogleOAuthConfigInput } | { ok: false; errorKey: StoragePoolValidationError } {
    const clientId = params.clientId.trim();
    if (!clientId) return {ok: false, errorKey: 'oauthClientRequired'};
    const clientSecret = params.clientSecret.trim();
    return {
        ok: true,
        data: {
            clientId,
            clientSecret: clientSecret || undefined,
        },
    };
}

export function buildGoogleOAuthAuthorizeInput(params: {
    displayName: string;
    rootFolderId: string;
    priorityWeight: string;
    maxUsagePercent: string;
    selectedModules: readonly string[];
    returnOrigin?: string;
}): GoogleOAuthAuthorizeInput {
    return {
        displayName: params.displayName.trim() || undefined,
        rootFolderId: params.rootFolderId.trim() || undefined,
        priorityWeight: clampDrivePriorityWeight(params.priorityWeight),
        maxUsagePercent: clampDriveMaxUsagePercent(params.maxUsagePercent),
        routedModules: formatStorageRoutedModulesCsv(params.selectedModules),
        returnOrigin: params.returnOrigin,
    };
}

export function validateAndBuildDriveNodeUpdateInput(params: {
    displayName: string;
    enabled: boolean;
    priorityWeight: string;
    maxUsagePercent: string;
    selectedModules: readonly string[];
    rootFolderId: string;
}): { ok: true; data: StorageDriveNodeUpdateInput } | { ok: false; errorKey: StoragePoolValidationError } {
    const displayName = params.displayName.trim();
    if (!displayName) return {ok: false, errorKey: 'nameRequired'};
    return {
        ok: true,
        data: {
            displayName,
            enabled: params.enabled,
            priorityWeight: clampDrivePriorityWeight(params.priorityWeight),
            maxUsagePercent: clampDriveMaxUsagePercent(params.maxUsagePercent),
            routedModules: formatStorageRoutedModulesCsv(params.selectedModules),
            rootFolderId: params.rootFolderId.trim() || undefined,
        },
    };
}

export function validateAndBuildDriveNodeCreateInput(params: {
    tab: Exclude<DriveConnectTab, 'oauth_redirect'>;
    displayName: string;
    rootFolderId: string;
    priorityWeight: string;
    maxUsagePercent: string;
    selectedModules: readonly string[];
    manualClientId: string;
    manualClientSecret: string;
    refreshToken: string;
    serviceAccountJson: string;
}): { ok: true; data: StorageDriveNodeCreateInput } | { ok: false; errorKey: StoragePoolValidationError } {
    const displayName = params.displayName.trim();
    if (!displayName) return {ok: false, errorKey: 'nameRequired'};
    const weight = clampDrivePriorityWeight(params.priorityWeight);
    const capPct = clampDriveMaxUsagePercent(params.maxUsagePercent);
    const routedModules = formatStorageRoutedModulesCsv(params.selectedModules);
    const rootFolderId = params.rootFolderId.trim() || undefined;

    if (params.tab === 'oauth_manual') {
        const refreshToken = params.refreshToken.trim();
        if (!refreshToken) return {ok: false, errorKey: 'refreshTokenRequired'};
        return {
            ok: true,
            data: {
                displayName,
                authType: 'OAUTH2',
                clientId: params.manualClientId.trim() || undefined,
                clientSecret: params.manualClientSecret.trim() || undefined,
                refreshToken,
                rootFolderId,
                priorityWeight: weight,
                maxUsagePercent: capPct,
                routedModules,
            },
        };
    }

    const serviceAccountJson = params.serviceAccountJson.trim();
    if (!serviceAccountJson) return {ok: false, errorKey: 'saJsonRequired'};
    return {
        ok: true,
        data: {
            displayName,
            authType: 'SERVICE_ACCOUNT',
            serviceAccountJson,
            rootFolderId,
            priorityWeight: weight,
            maxUsagePercent: capPct,
            routedModules,
        },
    };
}

export function buildStorageR2MigrationInput(params: {
    batchSize: number;
    deleteFromR2: boolean;
    targetNodeId: string;
}): StorageR2MigrationInput {
    const parsedTarget = params.targetNodeId === 'auto' ? null : Number(params.targetNodeId);
    return {
        limit: Math.min(200, Math.max(1, Math.round(params.batchSize || 25))),
        deleteSourceFromR2: params.deleteFromR2,
        targetNodeId: Number.isFinite(parsedTarget) ? parsedTarget : null,
    };
}
