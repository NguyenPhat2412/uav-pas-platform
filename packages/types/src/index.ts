export type ApiError = { status:number; error?:string; message?:string; path?:string };
export type Page<T> = { content:T[]; totalElements:number; totalPages:number; number:number; size:number };
