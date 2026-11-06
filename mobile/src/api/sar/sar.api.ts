import {apiClient, API_ROUTES} from '@/lib/api/client';
import {buildQueryString} from '@/shared/lib/format';
import type {AiDetection, AiTask, SarCockpitMission, SarDispatchResult} from '@/shared/types/sar/sar.types';

export const sarService = {
    missions: (includeClosed = false, signal?: AbortSignal) =>
        apiClient.get<SarCockpitMission[]>(`${API_ROUTES.sar.missions}?${buildQueryString({includeClosed})}`, {signal}),
    detections: (missionId: number, signal?: AbortSignal) =>
        apiClient.get<AiDetection[]>(API_ROUTES.ai.detections(missionId), {signal}),
    tasks: (missionId: number, signal?: AbortSignal) =>
        apiClient.get<AiTask[]>(API_ROUTES.ai.tasks(missionId), {signal}),
    verifyDetection: (detectionId: number, verified: boolean) =>
        apiClient.patch<AiDetection>(API_ROUTES.ai.verifyDetection(detectionId), {verified}),
    dispatchRescue: (missionId: number, payload: Record<string, unknown>) =>
        apiClient.post<SarDispatchResult>(API_ROUTES.sar.dispatchRescue(missionId), payload),
    returnToHome: (missionId: number) =>
        apiClient.post<SarDispatchResult>(API_ROUTES.sar.returnToHome(missionId)),
};
