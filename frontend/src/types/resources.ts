import type {PageResponse} from '@/types';

export type {PageResponse};

export interface Station {
    id: number;
    code: string;
    name: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    status: string;
}

export interface Uav {
    id: number;
    model: string;
    serialNumber: string;
    manufacturer: string;
    status: string;
    stationId?: number;
    stationName?: string;
}

export interface Equipment {
    id: number;
    name: string;
    type: string;
    serialNumber?: string;
    quantity: number;
    availableQuantity: number;
    reservedQuantity: number;
    status: string;
    stationId?: number;
    stationName?: string;
}

export interface MediaAsset {
    id: number;
    originalName: string;
    objectKey?: string;
    contentType: string;
    size: number;
    type: string;
    uploadedBy?: string;
    storageProvider: string;
    confirmed?: boolean;
    confirmedAt?: string;
    createdAt?: string;
}

export interface AuditLog {
    id: number;
    actorUsername?: string;
    action: string;
    entityType: string;
    entityId?: string;
    details?: string;
    createdAt?: string;
}

export interface Operator {
    id: number;
    username: string;
    fullName?: string;
    status: string;
    role?: string;
}

export interface UavHistory {
    id: number;
    uavId: number;
    fromStatus?: string;
    toStatus: string;
    reason?: string;
    changedBy?: string;
    createdAt?: string;
}

export interface InventoryMovement {
    id: number;
    equipmentId: number;
    equipmentName: string;
    type: string;
    quantity: number;
    fromStationId?: number;
    toStationId?: number;
    actor?: string;
    note?: string;
    createdAt?: string;
}
