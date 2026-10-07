'use client';
import type { ReactNode } from 'react';
import { Alert, Button, Spinner } from '@/components/ui';
import { ApiError } from '@/lib/api.client';

export function ErrorNotice({ error }: { error: Error | null }) {
  if (!error) return null;
  return <Alert variant="error">{error instanceof ApiError && error.status === 403 ? 'Bạn không có quyền thực hiện thao tác này.' : error.message}</Alert>;
}
export function ResourceState({ query, children }: { query: { isPending: boolean; error: Error | null; refetch: () => unknown }; children: ReactNode }) {
  if (query.error) return <div className="space-y-3"><ErrorNotice error={query.error} /><Button variant="outline" onClick={() => void query.refetch()}>Thử lại</Button></div>;
  if (query.isPending) return <div className="flex min-h-32 items-center justify-center"><Spinner label="Đang tải dữ liệu" /></div>;
  return children;
}
export function DataTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return <div className="overflow-x-auto rounded-lg border border-slate-200"><table className="console-table min-w-[680px]"><thead className="sticky top-0 z-10 bg-white"><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>) : <tr><td colSpan={headers.length} className="px-4 py-10 text-center text-secondary">Chưa có dữ liệu</td></tr>}</tbody></table></div>;
}
export function Pagination({ page, pages, onPage }: { page: number; pages?: number; onPage: (page: number) => void }) {
  if (!pages || pages <= 1) return null;
  return <div className="flex items-center justify-end gap-3"><Button size="sm" variant="outline" disabled={page === 0} onClick={() => onPage(page - 1)}>Trước</Button><span className="text-sm">{page + 1} / {pages}</span><Button size="sm" variant="outline" disabled={page + 1 >= pages} onClick={() => onPage(page + 1)}>Sau</Button></div>;
}
export function Detail({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <section aria-label={title} className="space-y-4 rounded-xl border border-blue-200 bg-blue-50/30 p-5"><div className="flex items-center justify-between gap-4"><h2 className="text-lg font-semibold">{title}</h2><Button size="sm" variant="outline" onClick={onClose}>Đóng chi tiết</Button></div>{children}</section>;
}
export const selectClass = 'h-11 min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-sm';
