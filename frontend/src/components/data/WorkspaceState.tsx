'use client';
import type {ReactNode} from 'react';
import {Database, ShieldAlert} from 'lucide-react';
import {useAuth} from '@/contexts/AuthContext';
import {Alert, Button} from '@/components/ui';
import {ApiError} from '@/lib/api.client';
import {useI18n} from '@/contexts/I18nContext';

export function EmptyState({title, detail, action}: {
    title?: string;
    detail?: string;
    action?: ReactNode
}) {
    const {t} = useI18n();
    return <div className="empty-state"><Database size={26}/><h3>{title ?? t('opsShared.state.empty')}</h3>{detail && <p>{detail}</p>}{action}</div>;
}

export function LoadingRows() {
    const {t} = useI18n();
    return <div role="status" aria-label={t('opsShared.state.loadingData')} className="space-y-3 p-5"><span className="sr-only">{t('opsShared.state.loadingData')}</span>{[0, 1, 2, 3, 4].map(i =>
        <div key={i} className="h-9 animate-pulse rounded bg-slate-100"/>)}</div>;
}

// Known server error codes mapped to catalog keys under opsShared.state.errors.
const resourceErrors: Record<string, string> = {
    MISSION_EQUIPMENT_RELEASE_REQUIRED: 'equipmentReleaseRequired',
    INVENTORY_NOT_AVAILABLE: 'inventoryNotAvailable',
    'Equipment is reserved; release reservations before changing station': 'equipmentReserved'
};

export function ErrorNotice({error}: { error: Error | null | undefined }) {
    const {t} = useI18n();
    if (!error) return null;
    const known = Object.prototype.hasOwnProperty.call(resourceErrors, error.message) ? resourceErrors[error.message] : undefined;
    return <Alert
        variant="error">{error instanceof ApiError && error.status === 403 ? t('opsShared.state.forbiddenAction') : known ? t(`opsShared.state.errors.${known}`) : error.message}</Alert>;
}

export function QueryState({query, children}: {
    query: { isPending: boolean; error: Error | null; refetch: () => unknown };
    children: ReactNode
}) {
    if (query.error) return <QueryError error={query.error} onRetry={() => void query.refetch()}/>;
    return query.isPending ? <LoadingRows/> : children;
}

function QueryError({error, onRetry}: { error: Error; onRetry: () => void }) {
    const {t} = useI18n();
    return <div className="space-y-3 py-4"><ErrorNotice error={error}/><Button size="sm" variant="outline"
                                                                               onClick={onRetry}>{t('opsShared.state.retry')}</Button>
    </div>;
}

export function PermissionGate({code, children}: { code: string; children: ReactNode }) {
    const {can, permissionsReady, permissionError, refreshPermissions} = useAuth();
    const {t} = useI18n();
    if (permissionError) return <div className="space-y-3"><ErrorNotice error={permissionError}/><Button size="sm"
                                                                                                         onClick={() => void refreshPermissions()}>{t('opsShared.state.recheckPermissions')}</Button></div>;
    if (!permissionsReady) return <LoadingRows/>;
    if (!can(code)) return <div className="permission-state" role="status" data-permission={code}><ShieldAlert size={24}/><h3>{t('opsShared.state.noAccessTitle')}</h3><p>{t('opsShared.state.noAccessDetail')}</p></div>;
    return children;
}
