'use client';
import {useEffect, useRef, useState} from 'react';
import {Alert, Button} from '@/components/ui';
import {ApiError} from '@/lib/api';
import {useI18n} from '@/contexts/I18nContext';

import type {Translate} from '@/types';

const errorCodes = new Set([
    'MAINTENANCE_VERSION_CHANGED',
    'MAINTENANCE_ACTIVE_ORDER_EXISTS',
    'MAINTENANCE_UAV_HAS_ACTIVE_ORDER',
    'MAINTENANCE_SCHEDULE_HAS_ACTIVE_ORDER',
    'MAINTENANCE_ORDER_INVALID_STATUS',
    'MAINTENANCE_ORDER_INVALID_STATE',
    'MAINTENANCE_UAV_STATE_CHANGED',
    'MAINTENANCE_SCHEDULE_UAV_MISMATCH',
    'MAINTENANCE_ORDER_TERMINAL',
    'UAV_HAS_ACTIVE_MISSION',
    'UAV_NOT_AVAILABLE',
    'MAINTENANCE_UAV_BUSY',
    'MAINTENANCE_SCHEDULE_PAUSED',
]);

export function maintenanceError(error: unknown, t: Translate) {
    if (error instanceof ApiError) {
        if (error.status === 403) return t('opsAssets.maintenance.errors.forbidden');
        if (error.status === 404) return t('opsAssets.maintenance.errors.notFound');
        if (errorCodes.has(error.message)) return t(`opsAssets.maintenance.errors.${error.message}`);
        if (error.status === 409) return t('opsAssets.maintenance.errors.conflict');
        if (error.status === 400) return t('opsAssets.maintenance.errors.badRequest');
        return t('opsAssets.maintenance.errors.unconfirmed');
    }
    return error instanceof Error ? error.message : t('opsAssets.maintenance.errors.generic');
}

export function Feedback({error, success}: { error?: string; success?: string }) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (error) {
            ref.current?.focus();
            ref.current?.scrollIntoView({block: 'nearest', behavior: 'smooth'});
        }
    }, [error]);
    return <>{error && <div ref={ref} tabIndex={-1}><Alert variant="error">{error}</Alert></div>}{success &&
        <Alert variant="success" role="status">{success}</Alert>}</>;
}

export function useMaintenanceAction(refresh: () => Promise<boolean>) {
    const {t} = useI18n();
    const [busy, setBusy] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState(''), [stale, setStale] = useState(false);
    const lock = useRef(false);
    /** `successKey` is a catalog key, translated at render so it follows language changes. */
    const run = async (request: () => Promise<unknown>, successKey: string, onSuccess?: () => void) => {
        if (lock.current || stale) return;
        lock.current = true;
        setBusy(true);
        setError('');
        setSuccess('');
        let succeeded = false;
        try {
            await request();
            succeeded = true;
            setSuccess(successKey);
        } catch (failure) {
            setError(maintenanceError(failure, t));
        } finally {
            try {
                const fresh = await refresh();
                setStale(!fresh);
                if (!fresh) setError(t('opsAssets.maintenance.errors.staleReload'));
            } catch {
                setStale(true);
                setError(t('opsAssets.maintenance.errors.staleReload'));
            }
            lock.current = false;
            setBusy(false);
        }
        if (succeeded) onSuccess?.();
    };
    const retry = async () => {
        if (lock.current) return;
        lock.current = true;
        setBusy(true);
        try {
            const fresh = await refresh();
            setStale(!fresh);
            if (fresh) setError('');
        } catch {
            setStale(true);
            setError(t('opsAssets.maintenance.errors.staleRetry'));
        } finally {
            setBusy(false);
            lock.current = false;
        }
    };
    return {busy, error, success, stale, blocked: busy || stale, run, setError, retry};
}

export function ActionFeedback({action}: { action: ReturnType<typeof useMaintenanceAction> }) {
    const {t} = useI18n();
    return <><Feedback error={action.error} success={action.success ? t(action.success) : ''}/>{action.busy &&
        <p role="status" className="text-sm text-slate-600">{t('opsAssets.maintenance.saving')}</p>}{action.stale &&
        <Button type="button" disabled={action.busy} variant="outline" onClick={() => void action.retry()}>{t('opsAssets.maintenance.reloadData')}</Button>}</>;
}
