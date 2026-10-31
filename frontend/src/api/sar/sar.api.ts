import {apiClient} from '@/lib/api';
import {API_ROUTES} from '@/lib/api/routes';
import type {AiDetection, AiTask, SarCockpitMission, SarDispatchResult, SarFlightPlan} from '@/types/sar/sar.types';

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
