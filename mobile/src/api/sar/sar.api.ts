import {apiClient, API_ROUTES} from '@/lib/api/client';
import {buildQueryString} from '@/shared/lib/format';
import type {AiDetection, AiTask, SarCockpitMission, SarDispatchResult, SarFlightPlan} from '@/shared/types/sar/sar.types';

/** Search-and-rescue tactical cockpit endpoints: active missions, AI detections, rescue dispatch, and search patterns. */
export const sarService = {
    /** Lists active (and optionally closed) SAR missions with last-known-position datum and assigned UAV. */
    missions: (includeClosed = false, signal?: AbortSignal) =>
        apiClient.get<SarCockpitMission[]>(`${API_ROUTES.sar.missions}?${buildQueryString({includeClosed})}`, {signal}),
    /** Lists edge/cloud AI vision detections for a SAR mission. */
    detections: (missionId: number, signal?: AbortSignal) =>
        apiClient.get<AiDetection[]>(API_ROUTES.ai.detections(missionId), {signal}),
    /** Lists AI inference tasks and DPU telemetry for a SAR mission. */
    tasks: (missionId: number, signal?: AbortSignal) =>
        apiClient.get<AiTask[]>(API_ROUTES.ai.tasks(missionId), {signal}),
    /** Marks an AI detection as operator-verified or unverified. */
    verifyDetection: (detectionId: number, verified: boolean) =>
        apiClient.patch<AiDetection>(API_ROUTES.ai.verifyDetection(detectionId), {verified}),
    /** Dispatches emergency ground/maritime rescue coordinates for a confirmed target. */
    dispatchRescue: (missionId: number, payload: Record<string, unknown>) =>
        apiClient.post<SarDispatchResult>(API_ROUTES.sar.dispatchRescue(missionId), payload),
    /** Commands the assigned UAV on a SAR mission to immediately return to its home station. */
    returnToHome: (missionId: number) =>
        apiClient.post<SarDispatchResult>(API_ROUTES.sar.returnToHome(missionId)),
    /** Generates an expanding-square or parallel-track SAR flight plan around the LKP datum. */
    flightPlan: (missionId: number, lkpLat: number, lkpLng: number, sweepWidthMeters = 60, maxLegs = 12) =>
        apiClient.post<SarFlightPlan>(API_ROUTES.sar.flightPlan, {missionId, lkpLat, lkpLng, sweepWidthMeters, maxLegs}),
};
