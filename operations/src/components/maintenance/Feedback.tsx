'use client';
import {useEffect, useRef} from 'react';
import {Alert, Button} from '@/components/ui';
import {useI18n} from '@/providers/I18nContext';
import type {MaintenanceAction} from '@/hooks/maintenance/useMaintenanceAction';

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

export function ActionFeedback({action}: { action: MaintenanceAction }) {
    const {t} = useI18n();
    return <><Feedback error={action.error} success={action.success ? t(action.success) : ''}/>{action.busy &&
        <p role="status" className="text-sm text-slate-600">{t('opsAssets.maintenance.saving')}</p>}{action.stale &&
        <Button type="button" disabled={action.busy} variant="outline" onClick={() => void action.retry()}>{t('opsAssets.maintenance.reloadData')}</Button>}</>;
}
