export interface DashboardSummary {
    totalUsers: number;
    totalStations: number;
    totalUavs: number;
    availableUavs: number;
    maintenanceUavs: number;
    totalEquipmentUnits: number;
    reservedEquipmentUnits: number;
    totalMediaAssets: number;
    totalAuditEvents: number;
}

/** GET /api/v1/dashboard/customer-analytics — always scoped to the signed-in customer. */
export interface CustomerAnalytics {
    thisMonth: CustomerKpis;
    lastMonth: CustomerKpis;
    mediaFiles: number;
    quota: {
        planName: string | null;
        used: number;
        limit: number;
        cycleStart: string | null;
        cycleEnd: string | null;
        daysLeftInCycle: number;
        projectedDaysToLimit: number | null;
    } | null;
    missionsByMonth: { month: string; completed: number; stopped: number }[];
    spendByMonth: { month: string; paid: number; outstanding: number }[];
    pendingInvoices: { count: number; amount: number; nextDue: string | null };
    pipeline: Record<'waiting' | 'scheduled' | 'active' | 'draft', number>;
    topServices: { name: string; count: number }[];
    locations: { id: number; code: string; latitude: number; longitude: number; status: string }[];
    outcomes: {
        completed: number;
        failed: number;
        cancelled: number;
        rejected: number;
        successRate: number;
        reasons: { reason: string; count: number }[];
    };
    turnaround: { submitToConfirm: number | null; submitToComplete: number | null; sampleSize: number };
    upcoming: { id: number; code: string; title: string; startTime: string; status: string; location: string | null }[];
}

export interface CustomerKpis {
    completedMissions: number;
    flightHours: number;
    spend: number;
}
