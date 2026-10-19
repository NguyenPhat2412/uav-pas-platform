'use client';
import type { ReactNode } from 'react';
import { Database, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Alert } from "@/components/admin/ui";
import { ApiError } from '@/lib/api.client';
export function EmptyState({ title = 'Chưa có dữ liệu', detail, action }: { title?: string; detail?: string; action?: ReactNode }) {
  return <div className="empty-state"><Database size={26} /><h3>{title}</h3>{detail && <p>{detail}</p>}{action}</div>;
}
export function LoadingRows() {
  return <div role="status" aria-label="Đang tải dữ liệu" className="space-y-3 p-5"><span className="sr-only">Đang tải dữ liệu</span>{[0,1,2,3,4].map(i => <div key={i} className="h-9 animate-pulse rounded bg-slate-100" />)}</div>;
}
export function ErrorNotice({ error }: { error: Error | null | undefined }) {
  return error ? <Alert variant="error">{error instanceof ApiError && error.status === 403 ? 'Bạn không có quyền thực hiện thao tác này.' : error.message}</Alert> : null;
}
export function QueryState({ query, children }: { query: { isPending: boolean; error: Error | null; refetch: () => unknown }; children: ReactNode }) {
  if (query.error) return <div className="space-y-3 py-4"><ErrorNotice error={query.error} /><Button size="sm" variant="outline" onClick={() => void query.refetch()}>Thử lại</Button></div>;
  return query.isPending ? <LoadingRows /> : children;
}
export function PermissionGate({ code, children }: { code: string; children: ReactNode }) {
  const { can, permissionsReady, permissionError, refreshPermissions } = useAuth();
  if (permissionError) return <div className="space-y-3"><ErrorNotice error={permissionError} /><Button size="sm" onClick={() => void refreshPermissions()}>Kiểm tra lại quyền</Button></div>;
  if (!permissionsReady) return <LoadingRows />;
  if (!can(code)) return <div className="permission-state" role="status"><ShieldAlert size={24} /><h3>Không có quyền truy cập</h3><p>Cần quyền {code} để xem nội dung này.</p></div>;
  return children;
}
