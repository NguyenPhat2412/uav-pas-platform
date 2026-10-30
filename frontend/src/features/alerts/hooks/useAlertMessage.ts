'use client';

import {useCallback} from 'react';
import {useI18n} from '@/contexts/I18nContext';
import type {PlatformAlert} from '@/features/alerts/api';

/** Renders an alert's message key with its params; translates component/source names in params. */
export function useAlertMessage() {
    const {t} = useI18n();
    return useCallback((alert: PlatformAlert) => {
        const params: Record<string, string | number> = {...alert.params};
        if (typeof params.component === 'string') {
            const key = `admin.health.component.${params.component}`;
            const name = t(key);
            params.component = name === key ? params.component : name;
        }
        if (typeof params.source === 'string') params.source = t(`adminPlatform.alerts.sources.${params.source}`);
        const text = t(alert.messageKey, params);
        return text === alert.messageKey ? alert.code : text;
    }, [t]);
}
