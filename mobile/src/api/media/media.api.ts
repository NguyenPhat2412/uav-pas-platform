import {apiClient, API_ROUTES, uploadToSignedUrl} from '@/lib/api/client';
import type {MediaAsset} from '@/shared/types/resources';
import type {MediaRole, MissionMedia, SignedMediaUrl} from '@/shared/types/mission/mission.types';

/** A photo or document picked on the phone, ready to upload. */
export interface LocalFile {
    uri: string;
    name: string;
    contentType: string;
    size: number;
}

export const mediaService = {
    downloadUrl: (id: number) => apiClient.get<{ url: string; expiresInSeconds: number }>(API_ROUTES.media.downloadUrl(id)),
    /**
     * Presigned mission upload: requests a signed URL linked to the mission, PUTs the local asset, confirms it,
     * and attaches it under `mediaRole` ('INPUT' for customers, 'OUTPUT' | 'DOCUMENT' | 'FLIGHT_DATA' in the field).
     */
    uploadToMission: async (missionId: number, file: LocalFile, mediaRole: MediaRole = 'INPUT') => {
        const signed = await apiClient.post<SignedMediaUrl>(API_ROUTES.missions.mediaUploadUrl(missionId), {
            originalName: file.name, contentType: file.contentType, size: file.size,
            type: file.contentType.startsWith('video/') ? 'VIDEO' : file.contentType.startsWith('image/') ? 'IMAGE' : 'DOCUMENT',
        });
        await uploadToSignedUrl(signed.url, file.uri, file.contentType);
        await apiClient.post<MediaAsset>(API_ROUTES.missions.mediaConfirm(missionId, signed.mediaId));
        return apiClient.post<MissionMedia>(API_ROUTES.missions.media(missionId), {mediaId: signed.mediaId, mediaRole});
    },
};
