export type StorageBackendMode = 'GOOGLE_DRIVE' | 'HYBRID_TIERED' | 'R2';
export type DriveAllocationStrategy = 'MOST_FREE_SPACE' | 'MODULE_PRIORITY' | 'ROUND_ROBIN';
export type DriveAuthType = 'OAUTH2' | 'SERVICE_ACCOUNT';
export type DriveNodeHealth = 'UP' | 'QUOTA_FULL' | 'DOWN' | 'UNKNOWN';

export interface StorageDriveNode {
    id: number;
    code: string;
    displayName: string;
    authType: DriveAuthType;
    accountEmail: string | null;
    rootFolderId: string | null;
    enabled: boolean;
    priorityWeight: number;
    maxUsagePercent: number;
    routedModules: string;
    quotaLimitBytes: number | null;
    quotaUsedBytes: number | null;
    quotaDriveBytes: number | null;
    freeBytes: number | null;
    usagePercent: number | null;
    storedObjectCount: number;
    storedBytes: number;
    healthStatus: DriveNodeHealth;
    lastError: string | null;
    lastCheckedAt: string | null;
    createdAt: string;
}

export interface StoragePoolOverview {
    primaryBackend: StorageBackendMode;
    allocationStrategy: DriveAllocationStrategy;
    fallbackToR2: boolean;
    tieredSmallFileMaxBytes: number;
    oauthConfigured: boolean;
    maskedClientId: string | null;
    callbackPath: string;
    driveActiveNodeCount: number;
    driveTotalObjectCount: number;
    driveTotalStoredBytes: number;
    driveTotalLimitBytes: number | null;
    driveTotalFreeBytes: number | null;
    r2PendingObjectCount: number;
    r2PendingBytes: number;
    nodes: StorageDriveNode[];
}

export interface StoragePoolPolicyInput {
    primaryBackend: StorageBackendMode;
    allocationStrategy: DriveAllocationStrategy;
    fallbackToR2: boolean;
    tieredSmallFileMaxBytes?: number;
}

export interface GoogleOAuthConfigInput {
    clientId: string;
    clientSecret?: string;
}

export interface GoogleOAuthAuthorizeInput {
    displayName?: string;
    rootFolderId?: string;
    priorityWeight?: number;
    maxUsagePercent?: number;
    routedModules?: string;
    returnOrigin?: string;
}

export interface GoogleOAuthAuthorizeResult {
    authorizeUrl: string;
    redirectUri: string;
}

export interface StorageDriveNodeCreateInput {
    displayName: string;
    authType: DriveAuthType;
    clientId?: string;
    clientSecret?: string;
    refreshToken?: string;
    serviceAccountJson?: string;
    rootFolderId?: string;
    priorityWeight?: number;
    maxUsagePercent?: number;
    routedModules?: string;
}

export interface StorageDriveNodeUpdateInput {
    displayName: string;
    enabled?: boolean;
    priorityWeight?: number;
    maxUsagePercent?: number;
    routedModules?: string;
    rootFolderId?: string;
}

export interface StorageR2MigrationInput {
    limit?: number;
    deleteSourceFromR2?: boolean;
    targetNodeId?: number | null;
}

export interface StorageR2MigrationResult {
    migratedCount: number;
    migratedBytes: number;
    failedCount: number;
    remainingR2Count: number;
    remainingR2Bytes: number;
}
