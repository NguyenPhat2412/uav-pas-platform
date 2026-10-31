'use client';
import {useMutation, useQueries, useQuery} from '@tanstack/react-query';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {queryKeys, type MutationOptions} from '@/lib/query';
import {useOperationMutation} from '@/hooks/useOperationMutation';
import {mediaService, type MediaUploadOptions} from '@/api/media/media.api';
import {mediaKeys} from '@/hooks/media/query-keys';
import type {ExifMetadata} from '@/types/mission/mission.types';

// Signed URLs expire; refresh well before a typical 15-minute validity window.
const SIGNED_URL_STALE_MS = 4 * 60 * 1000;

export function useMedia(page = 0) {
    const {user, can} = useAuth();
    return useQuery({
        queryKey: queryKeys.list(user?.id, 'media', page),
        queryFn: ({signal}) => mediaService.listMedia(page, signal),
        enabled: can('MEDIA_READ')
    });
}

/** Signed download URL of one stored file; nothing is requested while `mediaId` is empty. */
export function useMediaDownloadUrl(mediaId: number | null | undefined) {
    const {user} = useAuth();
    return useQuery({
        queryKey: mediaKeys.downloadUrl(user?.id, mediaId),
        queryFn: ({signal}) => mediaService.downloadUrl(mediaId!, signal),
        enabled: mediaId != null,
        staleTime: SIGNED_URL_STALE_MS,
    });
}

/** Signed download URLs for several files, in the order given. */
export function useMediaDownloadUrls(mediaIds: number[]) {
    const {user} = useAuth();
    return useQueries({
        queries: mediaIds.map(id => ({
            queryKey: mediaKeys.downloadUrl(user?.id, id),
            queryFn: ({signal}: { signal: AbortSignal }) => mediaService.downloadUrl(id, signal),
            staleTime: SIGNED_URL_STALE_MS,
        })),
    });
}

/** A fresh signed URL on demand, e.g. when the user clicks "download". */
export function useMediaDownloadLink(options?: MutationOptions<{ url: string; expiresInSeconds: number }, number>) {
    return useMutation({...options, mutationFn: (mediaId: number) => mediaService.downloadUrl(mediaId)});
}

/**
 * Capture metadata read in the browser from a signed URL (EXIF, GPS and DJI XMP gimbal tags).
 * Needs the storage bucket to allow cross-origin reads; resolves null when the file carries none.
 */
export function useImageExif(url: string, mediaId: number) {
    const {user} = useAuth();
    return useQuery({
        queryKey: mediaKeys.exif(user?.id, mediaId),
        queryFn: async () => {
            const exifr = (await import('exifr')).default;
            return (await exifr.parse(url, {tiff: true, exif: true, gps: true, xmp: true})) as ExifMetadata | undefined ?? null;
        },
        staleTime: Infinity,
    });
}

export type MediaUploadInput = MediaUploadOptions & { file: File };

/** Media library writes; each refreshes the library and the audit trail. */
export function useMediaMutations() {
    const {t} = useI18n();
    return {
        upload: useOperationMutation(({file, ...options}: MediaUploadInput) => {
            const {existing} = options;
            if (existing && (existing.size !== file.size || existing.contentType !== file.type)) throw new Error(t('opsAssets.media.reuploadMismatch'));
            return mediaService.upload(file, options);
        }, ['media', 'audit']),
        confirm: useOperationMutation(mediaService.confirmMedia, ['media', 'audit']),
        remove: useOperationMutation(mediaService.deleteMedia, ['media', 'audit']),
        open: useOperationMutation((id: number) => mediaService.downloadUrl(id), ['audit']),
    };
}
