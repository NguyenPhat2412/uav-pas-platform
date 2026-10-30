'use client';
import {keepPreviousData, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@/providers/AuthContext';
import {toast} from '@/providers/ToastContext';
import {QUIET, queryKeys, type MutationOptions} from '@/lib/query';
import {filesService} from '@/features/files/api/files.api';
import {cleanupCandidates} from '@/features/files/utils/files';
import type {FileListQuery, StoredFile} from '@/features/files/types/files.types';

type UserId = number | undefined;

const fileKeys = {
    all: (userId: UserId) => queryKeys.of(userId, 'admin-files'),
    summary: (userId: UserId) => queryKeys.of(userId, 'admin-files', 'summary'),
    list: (userId: UserId, query: FileListQuery) => queryKeys.of(userId, 'admin-files', 'list', query),
    cleanup: (userId: UserId) => queryKeys.of(userId, 'admin-files', 'cleanup'),
};

/** The cleanup helper loads at most this many unused and this many pending files (largest first). */
const CLEANUP_BATCH = 100;

export function useFileSummary() {
    const {user} = useAuth();
    return useQuery({queryKey: fileKeys.summary(user?.id), queryFn: ({signal}) => filesService.summary(signal)});
}

export function useFileList(query: FileListQuery) {
    const {user} = useAuth();
    return useQuery({
        queryKey: fileKeys.list(user?.id, query),
        queryFn: ({signal}) => filesService.list(query, signal),
        placeholderData: keepPreviousData,
    });
}

/** Reloads the summary, every list page and the cleanup candidates. */
export function useRefreshFiles() {
    const {user} = useAuth();
    const client = useQueryClient();
    return () => void client.invalidateQueries({queryKey: fileKeys.all(user?.id)});
}

export function useDeleteFile(fileId: string, options?: MutationOptions<void>) {
    return useMutation({...options, mutationFn: () => filesService.remove(fileId)});
}

/** Deletes one file for the cleanup run, which reports each failure in its own list. */
export function useRemoveFile() {
    return useMutation({mutationFn: (fileId: string) => filesService.remove(fileId), meta: QUIET});
}

/** Every deletable UNUSED / PENDING file, largest first, always fetched fresh when the dialog opens. */
export function useCleanupCandidates() {
    const {user} = useAuth();
    return useQuery({
        queryKey: fileKeys.cleanup(user?.id),
        queryFn: async ({signal}) => {
            const base = {page: 0, size: CLEANUP_BATCH, sort: 'sizeBytes', direction: 'desc'} as const;
            const [unused, pending] = await Promise.all([
                filesService.list({...base, status: 'UNUSED'}, signal),
                filesService.list({...base, status: 'PENDING'}, signal),
            ]);
            return {
                files: cleanupCandidates([...unused.content, ...pending.content]),
                total: unused.totalElements + pending.totalElements,
                shown: unused.content.length + pending.content.length,
            };
        },
        staleTime: 0,
        gcTime: 0,
    });
}

/** Opens a file's signed URL in a new tab; the tab opens before the request so popup blockers allow it. */
export function useOpenStoredFile() {
    return async (file: StoredFile, failed: string) => {
        const tab = window.open('about:blank', '_blank');
        if (tab) tab.opener = null;
        try {
            const {url} = await filesService.downloadUrl(file.id);
            if (tab) tab.location.href = url;
            else window.open(url, '_blank', 'noopener,noreferrer');
        } catch (error) {
            tab?.close();
            toast.error(error instanceof Error && error.message ? error.message : failed);
        }
    };
}

