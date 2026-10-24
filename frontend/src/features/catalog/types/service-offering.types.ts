/** A bookable UAV service. The code is the stable key missions reference, so it cannot be edited. */
export interface ServiceOffering {
    id: number;
    code: string;
    name: string;
    description: string | null;
    active: boolean;
    defaultDurationMinutes: number;
}

export interface ServiceOfferingInput {
    code: string;
    name: string;
    description?: string;
    defaultDurationMinutes: number;
}
