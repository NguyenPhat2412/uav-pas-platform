'use client';

import {Badge, Card} from '@/components/ui';
import {Drawer} from '@/components/data/Drawer';
import {QueryState} from '@/components/data/WorkspaceState';
import {useSettingHistory} from '@/hooks/settings/useSettings';
import {useI18n} from '@/providers/I18nContext';
import type {TypedSetting} from '@/types/settings/platform-settings.types';

/** Catalog keys cannot contain dots, so setting keys are flattened for label lookup. */
export const flatKey = (key: string) => key.replace(/[^A-Za-z0-9]/g, '_');

export function buildSettingHint(
    s: TypedSetting,
    t: (key: string, params?: Record<string, string | number>) => string,
    formatNumber: (value: number) => string,
): string {
    const min = s.minValue != null ? formatNumber(s.minValue) : null;
    const max = s.maxValue != null ? formatNumber(s.maxValue) : null;
    const parts: string[] = [];
    if (s.valueType === 'INTEGER' || s.valueType === 'DECIMAL') {
        parts.push(t(`adminPlatform.settings.hint.${s.valueType}`));
        if (min != null && max != null) parts.push(t('adminPlatform.settings.hint.between', {min, max}));
        else if (min != null) parts.push(t('adminPlatform.settings.hint.atLeast', {min}));
        else if (max != null) parts.push(t('adminPlatform.settings.hint.atMost', {max}));
    } else if (s.valueType === 'STRING') {
        if (s.valuePattern) parts.push(t('adminPlatform.settings.hint.pattern', {pattern: s.valuePattern}));
        if (max != null) parts.push(t('adminPlatform.settings.hint.maxLength', {max}));
    } else if (s.valueType !== 'BOOLEAN' && s.valueType !== 'ENUM') {
        parts.push(t(`adminPlatform.settings.hint.${s.valueType}`));
    }
    const specific = t(`adminPlatform.settings.notes.${flatKey(s.configKey)}`);
    if (!specific.startsWith('adminPlatform.')) parts.push(specific);
    if (s.emptyAllowed) {
        parts.push(t(s.configKey.startsWith('billing.') ? 'adminPlatform.settings.hint.emptyEnv' : 'adminPlatform.settings.hint.emptyHidden'));
    }
    if (s.isPublic) parts.push(t('adminPlatform.settings.hint.public'));
    return parts.join(' · ');
}

export function SettingHistoryDrawer({setting, title, onClose}: {
    setting: TypedSetting;
    title: string;
    onClose: () => void;
}) {
    const {t, formatDate} = useI18n();
    const query = useSettingHistory(setting.configKey);
    const shown = (v: string | null) => (v === null ? '—' : v === '' ? t('adminPlatform.settings.emptyValue') : v);

    return (
        <Drawer title={t('adminPlatform.settings.historyTitle', {name: title})} onClose={onClose}>
            <Badge variant="outline" size="sm" className="w-fit font-mono normal-case">
                {setting.configKey}
            </Badge>
            <QueryState query={query}>
                {query.data && (
                    query.data.length === 0 ? (
                        <p className="text-sm text-slate-500">{t('adminPlatform.settings.historyEmpty')}</p>
                    ) : (
                        <ol className="m-0 list-none space-y-2 p-0">
                            {query.data.map(entry => (
                                <li key={entry.id}>
                                    <Card variant="surface" className="p-3 text-[13px]">
                                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                                            <span>{formatDate(entry.changedAt, {dateStyle: 'medium', timeStyle: 'short'})}</span>
                                            <span>{entry.changedBy ?? '—'}</span>
                                        </div>
                                        <p className="m-0 mt-1 break-words text-slate-900">
                                            <span className="text-slate-500 line-through">{shown(entry.oldValue)}</span>
                                            <span aria-hidden="true"> → </span>
                                            <span className="sr-only">{t('adminPlatform.settings.changedTo')}</span>
                                            <span className="font-semibold">{shown(entry.newValue)}</span>
                                        </p>
                                    </Card>
                                </li>
                            ))}
                        </ol>
                    )
                )}
            </QueryState>
        </Drawer>
    );
}
