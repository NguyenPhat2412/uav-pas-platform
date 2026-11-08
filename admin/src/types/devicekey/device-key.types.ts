/* UAV device API keys (admin). */

export type DeviceKeyStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED';

/** Never contains the key itself; keyPrefix is a non-secret fragment for recognition. */
export interface DeviceKey {
    id: number;
    name: string;
    uavId: number | null;
    uavSerialNumber: string | null;
    keyPrefix: string;
    scopes: string[];
    status: DeviceKeyStatus;
    createdBy: string;
    createdAt: string;
    lastUsedAt: string | null;
    expiresAt: string | null;
    revokedAt: string | null;
}

/** The secret is only present in the create response. */
export interface CreatedDeviceKey {
    key: DeviceKey;
    secret: string;
}

export interface CreateDeviceKeyInput {
    name: string;
    uavId?: number | null;
    /** Local date-time, ISO without zone (server time). */
    expiresAt?: string | null;
}
