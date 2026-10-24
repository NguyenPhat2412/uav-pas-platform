/** A bookable UAV service. The code is the stable key missions reference, so it cannot be edited. */
export interface ServiceOffering {
    id: number;
    code: string;
    name: string;
    description: string | null;
    active: boolean;
    defaultDurationMinutes: number;
    /** Technical sheet; null where operations have not committed to a value. */
    sensors?: string[];
    bestGsdCm?: number | null;
    maxAreaHectares?: number | null;
    maxWindMs?: number | null;
    onSiteHours?: number | null;
    deliveryHours?: number | null;
}

export interface ServiceOfferingInput {
    code: string;
    name: string;
    description?: string;
    defaultDurationMinutes: number;
}

export const serviceSensors = ['RGB_4K', 'THERMAL', 'LIDAR', 'MULTISPECTRAL'] as const;

/** PUT /uav-services/{id}: spec fields are optional; omitted or null clears the commitment. */
export interface ServiceOfferingUpdate extends Omit<ServiceOfferingInput, 'code'> {
    sensors?: string[];
    bestGsdCm?: number | null;
    maxAreaHectares?: number | null;
    maxWindMs?: number | null;
    onSiteHours?: number | null;
    deliveryHours?: number | null;
}
