import {apiClient} from '@/lib/api';
import {API_ROUTES} from '@/lib/api/routes';
import type {AiDetection, AiTask, SarCockpitMission, SarDispatchResult, SarFlightPlan} from '@/features/sar/types/sar.types';

export const sarService = {
    missions: (includeClosed = false, signal?: AbortSignal) =>
        apiClient.get<SarCockpitMission[]>(`${API_ROUTES.sar.missions}?includeClosed=${includeClosed}`, {signal}),
    detections: (missionId: number, signal?: AbortSignal) =>
        apiClient.get<AiDetection[]>(API_ROUTES.ai.detections(missionId), {signal}),
    tasks: (missionId: number, signal?: AbortSignal) =>
        apiClient.get<AiTask[]>(API_ROUTES.ai.tasks(missionId), {signal}),
    verify: (detectionId: number, verified: boolean) =>
        apiClient.patch<AiDetection>(API_ROUTES.ai.verifyDetection(detectionId), {verified}),
    dispatchRescue: (missionId: number, payload: Record<string, unknown>) =>
        apiClient.post<SarDispatchResult>(API_ROUTES.sar.dispatchRescue(missionId), payload),
    returnToHome: (missionId: number) =>
        apiClient.post<SarDispatchResult>(API_ROUTES.sar.returnToHome(missionId)),
    flightPlan: (missionId: number, lkpLat: number, lkpLng: number, sweepWidthMeters = 60, maxLegs = 12) =>
        apiClient.post<SarFlightPlan>(API_ROUTES.sar.flightPlan, {missionId, lkpLat, lkpLng, sweepWidthMeters, maxLegs}),
};

/** Keys shared by every cockpit widget so a verify in one view refreshes the others. */
export const sarKeys = {
    missions: ['sar', 'missions'] as const,
    detections: (missionId: number) => ['sar', 'detections', missionId] as const,
    tasks: (missionId: number) => ['sar', 'tasks', missionId] as const,
    telemetry: (missionId: number) => ['sar', 'telemetry', missionId] as const,
};

/** searchAreaPolygon is stored as JSON [[lat, lng], ...]; anything else draws no polygon. */
export function parseSearchArea(raw: string | null): Array<[number, number]> {
    if (!raw) return [];
    try {
        const value: unknown = JSON.parse(raw);
        if (!Array.isArray(value)) return [];
        const points = value.filter((p): p is [number, number] =>
            Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1])
            && Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 180);
        return points.length >= 3 ? points : [];
    } catch {
        return [];
    }
}
