import {useMutation, useQueryClient} from '@tanstack/react-query';
import {queryKeys} from '@/shared/lib/query';
import {mediaService, type LocalFile} from '@/api/media/media.api';
import {useAuth} from '@/providers/AuthContext';

/** Uploads a photo or file to a mission (linked as MISSION input), then refreshes the mission's file list. */
export function useMissionUpload(missionId: number) {
    const {user} = useAuth();
    const client = useQueryClient();
    return useMutation({
        mutationFn: (file: LocalFile) => mediaService.uploadToMission(missionId, file),
        onSuccess: () => client.invalidateQueries({queryKey: [...queryKeys.feature(user?.id, 'customer'), 'mission', missionId, 'media']}),
        retry: false,
    });
}

export function useMediaDownload() {
    return useMutation({mutationFn: (mediaId: number) => mediaService.downloadUrl(mediaId), retry: false});
}
