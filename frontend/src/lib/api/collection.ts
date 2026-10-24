import {apiClient} from "@/lib/api";

export interface CollectionPage<T> {
    content: T[];
    totalPages: number;
    totalElements: number;
}

const MAX_PAGES_TO_COLLECT = 8;

/** Read pages concurrently in parallel chunks so client-side filters never block on sequential network roundtrips. */
export async function collectPages<T extends {
    id: number
}>(read: (page: number, signal?: AbortSignal) => Promise<CollectionPage<T>>, signal?: AbortSignal): Promise<T[]> {
    const first = await read(0, signal);
    const rows = [...first.content];
    if (first.totalPages <= 1) {
        return rows;
    }

    const pagesToFetch = Math.min(first.totalPages, MAX_PAGES_TO_COLLECT);
    const remainingPageIndices: number[] = [];
    for (let p = 1; p < pagesToFetch; p++) {
        remainingPageIndices.push(p);
    }

    // Fetch in parallel chunks of 4 to maximize throughput without exceeding browser socket limit
    const CHUNK_SIZE = 4;
    for (let i = 0; i < remainingPageIndices.length; i += CHUNK_SIZE) {
        signal?.throwIfAborted();
        const chunk = remainingPageIndices.slice(i, i + CHUNK_SIZE);
        const chunkResults = await Promise.all(chunk.map(p => read(p, signal)));
        for (const res of chunkResults) {
            rows.push(...res.content);
        }
    }

    return [...new Map(rows.map(row => [row.id, row])).values()];
}

export async function fetchCollection<T extends { id: number }>(path: string, signal?: AbortSignal): Promise<T[]> {
    return collectPages<T>((page, abort) => apiClient.get<CollectionPage<T>>(`${path}${path.includes('?') ? '&' : '?'}page=${page}&size=100`, {signal: abort}), signal);
}
