export const EQUIPMENT_TYPES = ['BATTERY', 'CAMERA', 'KV260', 'SENSOR', 'ACCESSORY'] as const;
export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

export const INVENTORY_MOVEMENT_ACTIONS = ['stock-in', 'stock-out', 'reserve', 'release', 'transfer'] as const;
export type InventoryMovementAction = (typeof INVENTORY_MOVEMENT_ACTIONS)[number];

export interface EquipmentCreateDraft {
    name: string;
    type: string;
    serialNumber: string;
    stationId: string;
}

export interface InventoryMovementDraft {
    id: string;
    action: string;
    quantity: string;
    note: string;
    stationId: string;
}

export type EquipmentFieldErrors = Partial<
    Record<'name' | 'type' | 'serialNumber' | 'stationId' | 'id' | 'action' | 'quantity' | 'note', string>
>;

export function emptyEquipmentCreateDraft(): EquipmentCreateDraft {
    return {
        name: '',
        type: 'BATTERY',
        serialNumber: '',
        stationId: '',
    };
}

export function canSubmitEquipmentCreate(draft: EquipmentCreateDraft): boolean {
    return Boolean(draft.name.trim() && draft.type.trim());
}

export function toEquipmentCreatePayload(draft: EquipmentCreateDraft): {
    name: string;
    type: string;
    serialNumber?: string;
    stationId?: number;
} {
    const parsedStationId = Number(draft.stationId);
    return {
        name: draft.name.trim(),
        type: draft.type,
        serialNumber: draft.serialNumber.trim() || undefined,
        stationId: Number.isInteger(parsedStationId) && parsedStationId > 0 ? parsedStationId : undefined,
    };
}

export function emptyInventoryMovementDraft(): InventoryMovementDraft {
    return {
        id: '',
        action: 'stock-in',
        quantity: '1',
        note: '',
        stationId: '',
    };
}

export function canSubmitInventoryMovement(draft: InventoryMovementDraft): boolean {
    if (!draft.id.trim() || !draft.quantity.trim()) {
        return false;
    }
    if (draft.action === 'transfer' && !draft.stationId.trim()) {
        return false;
    }
    return true;
}

export function toInventoryMovementPayload(
    draft: InventoryMovementDraft,
    requestId: string,
): {
    id: number;
    action: string;
    quantity: number;
    note?: string;
    stationId?: number;
    requestId: string;
} {
    const parsedStationId = Number(draft.stationId);
    return {
        id: Number(draft.id),
        action: draft.action,
        quantity: Number(draft.quantity),
        note: draft.note.trim() || undefined,
        stationId: Number.isInteger(parsedStationId) && parsedStationId > 0 ? parsedStationId : undefined,
        requestId,
    };
}

export function equipmentFieldErrors(error: unknown): EquipmentFieldErrors | null {
    const fields = (error as { fields?: Record<string, string> } | null)?.fields;
    return fields && Object.keys(fields).length ? (fields as EquipmentFieldErrors) : null;
}

