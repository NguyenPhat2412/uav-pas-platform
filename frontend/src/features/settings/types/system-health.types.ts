export type HealthStatus = 'UP' | 'DEGRADED' | 'DOWN' | 'UNKNOWN';

/** GET /api/v1/dashboard/system-health — admin only; details hold counts and versions, never hosts or secrets. */
export interface SystemHealth {
    status: HealthStatus;
    checkedAt: string;
    components: {
        key: 'database' | 'storage' | 'webhooks' | 'financialOutbox' | string;
        status: HealthStatus;
        latencyMs: number | null;
        details: Record<string, string | number>;
    }[];
    runtime: {
        uptimeSeconds: number;
        heapUsedMb: number;
        heapMaxMb: number;
        processors: number;
        systemLoad: number;
        javaVersion: string;
    };
}
