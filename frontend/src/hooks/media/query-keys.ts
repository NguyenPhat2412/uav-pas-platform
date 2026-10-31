import {queryKeys} from '@/lib/query';

type UserId = number | undefined;

export const mediaKeys = {
    downloadUrl: (userId: UserId, mediaId: number | null | undefined) => queryKeys.of(userId, 'media', 'download-url', mediaId),
    exif: (userId: UserId, mediaId: number) => queryKeys.of(userId, 'media', 'exif', mediaId),
};
