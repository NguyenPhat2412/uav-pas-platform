'use client';
import {useRef, useState} from 'react';
import {useI18n} from '@/providers/I18nContext';
import {maintenanceService, type MaintenanceService} from '@/api/maintenance/maintenance.api';
import {maintenanceError} from '@/utils/maintenance/errors';

/**
 * Maintenance writes: one at a time, errors shown inline (no toast), lists reloaded after every attempt.
 * `run` hands the request the maintenance service; when the reload fails the view is marked stale and blocked.
 */
export function useMaintenanceAction(refresh: () => Promise<boolean>) {
    const {t} = useI18n();
    const [busy, setBusy] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState(''), [stale, setStale] = useState(false);
    const lock = useRef(false);
    /** `successKey` is a catalog key, translated at render so it follows language changes. */
    const run = async (request: (service: MaintenanceService) => Promise<unknown>, successKey: string, onSuccess?: () => void) => {
        if (lock.current || stale) return;
        lock.current = true;
        setBusy(true);
        setError('');
        setSuccess('');
        let succeeded = false;
        try {
            await request(maintenanceService);
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

export type MaintenanceAction = ReturnType<typeof useMaintenanceAction>;
