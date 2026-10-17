import { apiClient } from './api.client';
export interface CollectionPage<T> { content: T[]; totalPages: number; totalElements: number; }
/** Read all pages so client-side filters never silently omit later pages. */
export async function collectPages<T extends { id: number }>(read: (page: number, signal?: AbortSignal) => Promise<CollectionPage<T>>, signal?: AbortSignal): Promise<T[]> {
  const first = await read(0, signal);
  const rows = [...first.content];
  for (let page = 1; page < first.totalPages; page++) {
    signal?.throwIfAborted();
    const next = await read(page, signal);
    rows.push(...next.content);
  }
  return [...new Map(rows.map(row => [row.id, row])).values()];
}
export function fetchCollection<T extends { id: number }>(path: string, signal?: AbortSignal) {
  return collectPages<T>((page, abort) => apiClient.get<CollectionPage<T>>(`${path}${path.includes('?') ? '&' : '?'}page=${page}&size=100`, { signal: abort }), signal);
}
