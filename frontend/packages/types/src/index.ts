export type ApiError = { status: number; error?: string; code?: string; message?: string; path?: string; timestamp?: string };
export type Page<T> = { content: T[]; totalElements: number; totalPages: number; number: number; size: number };
