import {useMutation, useQueryClient} from '@tanstack/react-query';
import {queryKeys} from '@/shared/lib/query';
import type {MediaRole} from '@/shared/types/mission/mission.types';
import {mediaService, type LocalFile} from '@/api/media/media.api';
import {useAuth} from '@/providers/AuthContext';

export type MissionUploadPayload = LocalFile | { file: LocalFile; mediaRole?: MediaRole };

/** Uploads a photo or file to a mission (customer input or field handover output/document/flight_data). */
export function useMissionUpload(missionId: number, defaultRole: MediaRole = 'INPUT') {
    const {user} = useAuth();
    const client = useQueryClient();
    return useMutation({
        mutationFn: (input: MissionUploadPayload) => {
            if ('file' in input) {
                return mediaService.uploadToMission(missionId, input.file, input.mediaRole ?? defaultRole);
            }
            return mediaService.uploadToMission(missionId, input, defaultRole);
        },
        onSuccess: () => Promise.all([
            client.invalidateQueries({queryKey: [...queryKeys.feature(user?.id, 'customer'), 'mission', missionId, 'media']}),
            client.invalidateQueries({queryKey: [...queryKeys.feature(user?.id, 'operations'), 'mission', missionId]}),
        ]),
        retry: false,
    });
}

export function useMediaDownload() {
    return useMutation({mutationFn: (mediaId: number) => mediaService.downloadUrl(mediaId), retry: false});
}
