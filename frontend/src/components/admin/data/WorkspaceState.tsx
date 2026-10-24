'use client';
import type { ReactNode } from 'react';
import { Database, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { Button, Alert } from "@/components/admin/ui";
import { ApiError } from '@/lib/api.client';

export function EmptyState({ title, detail, action }: { title?: string; detail?: string; action?: ReactNode }) {
  const { t } = useI18n();
  return <div className="empty-state"><Database size={26} /><h3>{title ?? t('admin.workspace.noData')}</h3>{detail && <p>{detail}</p>}{action}</div>;
}

export function LoadingRows() {
  const { t } = useI18n();
  return <div role="status" aria-label={t('admin.workspace.loadingData')} className="space-y-3 p-5"><span className="sr-only">{t('admin.workspace.loadingData')}</span>{[0,1,2,3,4].map(i => <div key={i} className="h-9 animate-pulse rounded bg-slate-100" />)}</div>;
}

export function ErrorNotice({ error }: { error: Error | null | undefined }) {
  const { t } = useI18n();
  return error ? <Alert variant="error">{error instanceof ApiError && error.status === 403 ? t('admin.workspace.forbiddenAction') : error.message}</Alert> : null;
}

export function QueryState({ query, children }: { query: { isPending: boolean; error: Error | null; refetch: () => unknown }; children: ReactNode }) {
  const { t } = useI18n();
  if (query.error) return <div className="space-y-3 py-4"><ErrorNotice error={query.error} /><Button size="sm" variant="outline" onClick={() => void query.refetch()}>{t('admin.workspace.retry')}</Button></div>;
  return query.isPending ? <LoadingRows /> : children;
}

export function PermissionGate({ code, children }: { code: string; children: ReactNode }) {
  const { can, permissionsReady, permissionError, refreshPermissions } = useAuth();
  const { t } = useI18n();
  if (permissionError) return <div className="space-y-3"><ErrorNotice error={permissionError} /><Button size="sm" onClick={() => void refreshPermissions()}>{t('admin.workspace.recheckPermissions')}</Button></div>;
  if (!permissionsReady) return <LoadingRows />;
  if (!can(code)) return <div className="permission-state" role="status" data-permission={code}><ShieldAlert size={24} /><h3>{t('admin.workspace.noAccessTitle')}</h3><p>{t('admin.workspace.noAccessDetail')}</p></div>;
  return children;
}
