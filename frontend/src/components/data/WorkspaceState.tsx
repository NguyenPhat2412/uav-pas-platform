'use client';
import type {ReactNode} from 'react';
import {Database, ShieldAlert} from 'lucide-react';
import {useAuth} from '@/providers/AuthContext';
import {Alert, Button} from '@/components/ui';
import {ApiError} from '@/lib/api';
import {useI18n} from '@/providers/I18nContext';

export function EmptyState({title, detail, action}: {
    title?: string;
    detail?: string;
    action?: ReactNode
}) {
    const {t} = useI18n();
    return (
        <div className="flex flex-col items-center justify-center gap-2 py-12 px-4 text-center text-slate-500">
            <Database size={26} className="text-slate-400"/>
            <h3 className="text-sm font-bold text-slate-800">{title ?? t('opsShared.state.empty')}</h3>
            {detail && <p className="max-w-md text-xs text-slate-500">{detail}</p>}
            {action && <div className="mt-2">{action}</div>}
        </div>
    );
}

export function LoadingRows() {
    const {t} = useI18n();
    return <div role="status" aria-label={t('opsShared.state.loadingData')} className="space-y-3 p-5"><span className="sr-only">{t('opsShared.state.loadingData')}</span>{[0, 1, 2, 3, 4].map(i =>
        <div key={i} className="h-9 animate-pulse rounded-panel bg-slate-100"/>)}</div>;
}

// Known server error codes mapped to catalog keys under opsShared.state.errors.
const resourceErrors: Record<string, string> = {
    MISSION_MEDIA_LOCKED: 'missionMediaLocked',
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
    if (!can(code)) {
        return (
            <div className="flex flex-col items-center justify-center gap-2 rounded-panel border border-amber-200 bg-amber-50/60 p-8 text-center text-slate-700" role="status" data-permission={code}>
                <ShieldAlert size={24} className="text-warning"/>
                <h3 className="text-base font-bold text-slate-900">{t('opsShared.state.noAccessTitle')}</h3>
                <p className="max-w-md text-sm text-slate-600">{t('opsShared.state.noAccessDetail')}</p>
            </div>
        );
    }
    return children;
}
