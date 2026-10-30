'use client';

import React, {useMemo, useState} from 'react';
import {CheckCircle2, Cpu, Globe, History, MapPin, Phone, Receipt, Save, Settings2, ShieldCheck} from 'lucide-react';
import {settingLabel} from '@/components/shared/presentation';
import {AdminPage} from '@/components/layout/AdminPage';
import {Drawer} from '@/components/data/Drawer';
import {QueryState} from '@/components/data/WorkspaceState';
import {Switch} from '@/components/ui';
import {AssistantSettingsSection} from '@/features/assistant/components/AssistantSettingsSection';
import {WeatherProviderSettingsSection} from '@/features/weather/components/WeatherProviderSettingsSection';
import type {TypedSetting} from '@/features/settings/api/platform-settings.api';
import {usePlatformSettings, useSaveSetting, useSettingHistory} from '@/features/settings/hooks/useSettings';
import {useI18n} from '@/providers/I18nContext';
import {ApiError} from '@/lib/api';

type GroupId = 'SAFETY' | 'OPERATIONS' | 'MAP' | 'AI' | 'BILLING' | 'CONTACT' | 'OTHER';
// Existing group titles keep their admin.settings catalog keys (AI group = KV260 edge processing).
const GROUPS: { id: GroupId; icon: typeof ShieldCheck; tone: string; title: string }[] = [
    {id: 'SAFETY', icon: ShieldCheck, tone: 'text-primary', title: 'admin.settings.safetyGroup'},
    {id: 'OPERATIONS', icon: MapPin, tone: 'text-amber-600', title: 'admin.settings.opsGroup'},
    {id: 'MAP', icon: Globe, tone: 'text-uav-blue', title: 'adminPlatform.settings.groups.MAP'},
    {id: 'AI', icon: Cpu, tone: 'text-indigo-600', title: 'admin.settings.aiGroup'},
    {id: 'BILLING', icon: Receipt, tone: 'text-uav-blue', title: 'adminPlatform.settings.groups.BILLING'},
    {id: 'CONTACT', icon: Phone, tone: 'text-sky-700', title: 'adminPlatform.settings.groups.CONTACT'},
    {id: 'OTHER', icon: Settings2, tone: 'text-slate-600', title: 'adminPlatform.settings.groups.OTHER'},
];

function groupOf(category: string): GroupId {
    const c = (category || '').toUpperCase();
    if (c === 'AI' || c === 'AI_EDGE') return 'AI';
    if (c === 'SAFETY' || c === 'OPERATIONS' || c === 'MAP' || c === 'BILLING' || c === 'CONTACT') return c;
    return 'OTHER';
}

/** Catalog keys cannot contain dots, so setting keys are flattened for label lookup. */
const flatKey = (key: string) => key.replace(/[^A-Za-z0-9]/g, '_');

/** Mirrors the server rule so mistakes show before saving; the server stays authoritative. */
export function clientCheck(s: TypedSetting, raw: string): string | null {
    const value = raw.trim();
    if (!value) return s.emptyAllowed ? null : 'required';
    const inRange = (n: number) => (s.minValue == null || n >= s.minValue) && (s.maxValue == null || n <= s.maxValue);
    switch (s.valueType) {
        case 'INTEGER':
            if (!/^[+-]?\d+$/.test(value)) return 'integer';
            return inRange(Number(value)) ? null : 'range';
        case 'DECIMAL':
            if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(value)) return 'decimal';
            return inRange(Number(value)) ? null : 'range';
        case 'BOOLEAN':
            return value === 'true' || value === 'false' ? null : 'boolean';
        case 'ENUM':
            return s.allowedValues.includes(value) ? null : 'choice';
        case 'PHONE': {
            const digits = value.replace(/\D/g, '').length;
            return /^\+?[0-9][0-9 .()-]{4,22}[0-9]$/.test(value) && digits >= 3 && digits <= 15 ? null : 'phone';
        }
        case 'EMAIL':
            return /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,190}\.[A-Za-z]{2,24}$/.test(value) && !value.includes('..') ? null : 'email';
        case 'URL':
            try {
                const url = new URL(value);
                return url.protocol === 'https:' || url.protocol === 'http:' ? null : 'url';
            } catch {
                return 'url';
            }
        default: {
            const length = [...value].length;
            if ((s.minValue != null && length < s.minValue) || (s.maxValue != null && length > s.maxValue)) return 'length';
            if (s.valuePattern) {
                try {
                    if (!new RegExp(`^(?:${s.valuePattern})$`).test(value)) return 'format';
                } catch {
                    return null;
                }
            }
            return null;
        }
    }
}

function AdminSettingsContent() {
    const {t, formatNumber} = useI18n();
    const query = usePlatformSettings();
    const {save, refresh} = useSaveSetting();
    const [drafts, setDrafts] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
    const [historyFor, setHistoryFor] = useState<TypedSetting | null>(null);

    const settings = useMemo(() => query.data ?? [], [query.data]);
    const valueOf = (s: TypedSetting) => drafts[s.configKey] ?? s.configValue;
    const changed = settings.filter(s => drafts[s.configKey] !== undefined && drafts[s.configKey] !== s.configValue);
    const invalid = changed.filter(s => clientCheck(s, valueOf(s)) !== null);

    const label = (s: TypedSetting) => {
        const key = `adminPlatform.settings.labels.${flatKey(s.configKey)}`;
        const text = t(key);
        return text === key ? settingLabel(s.configKey, s.description ?? undefined) : text;
    };

    const hint = (s: TypedSetting) => {
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
        if (s.emptyAllowed) parts.push(t(s.configKey.startsWith('billing.') ? 'adminPlatform.settings.hint.emptyEnv' : 'adminPlatform.settings.hint.emptyHidden'));
        if (s.isPublic) parts.push(t('adminPlatform.settings.hint.public'));
        return parts.join(' · ');
    };

    const handleChange = (key: string, value: string) => {
        setDrafts(prev => ({...prev, [key]: value}));
        setServerErrors(prev => {
            const next = {...prev};
            delete next[key];
            return next;
        });
        setSuccessMsg(null);
    };

    const handleSaveAll = async () => {
        if (invalid.length) {
            setErrorMsg(t('adminPlatform.settings.fixErrors', {count: invalid.length}));
            return;
        }
        setIsSaving(true);
        setErrorMsg(null);
        setSuccessMsg(null);
        let saved = 0;
        // Disable first, persist an explicit price next, and enable only after the price is saved.
        const order = (item: TypedSetting) => item.configKey === 'billing.auto_generate_invoice' ? (valueOf(item) === 'false' ? 0 : 3) : item.configKey === 'billing.hourly_rate_vnd' ? 1 : 2;
        try {
            for (const item of [...changed].sort((a, b) => order(a) - order(b))) {
                try {
                    await save.mutateAsync({key: item.configKey, value: valueOf(item).trim()});
                    saved += 1;
                    setDrafts(prev => {
                        const next = {...prev};
                        delete next[item.configKey];
                        return next;
                    });
                } catch (error) {
                    const detail = error instanceof ApiError ? error.message : t('admin.settings.checkAndRetry');
                    setServerErrors(prev => ({...prev, [item.configKey]: detail}));
                    throw new Error(`${label(item)}: ${detail}`);
                }
            }
            setSuccessMsg(saved ? t('admin.settings.saved') : t('admin.settings.noChanges'));
        } catch (error) {
            setErrorMsg(t('admin.settings.partialSave', {detail: error instanceof Error ? error.message : t('admin.settings.checkAndRetry')}));
        } finally {
            setIsSaving(false);
            if (saved) await refresh();
        }
    };

    return (
        <div className="space-y-6 pb-12">
            <div className="flex flex-col gap-3 rounded-panel border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="m-0 text-sm text-slate-600">
                    {changed.length ? t('adminPlatform.settings.pending', {count: changed.length}) : t('adminPlatform.settings.noPending')}
                </p>
                <button
                    type="button"
                    onClick={handleSaveAll}
                    disabled={isSaving || query.isPending || changed.length === 0}
                    className="flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-control bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <Save size={16}/>
                    {isSaving ? t('admin.settings.saving') : t('admin.settings.saveAll')}
                </button>
            </div>

            {errorMsg && <p role="alert" className="text-sm text-red-700">{errorMsg}</p>}
            <p className="m-0 text-xs text-slate-500">{t('admin.settings.invoiceNote')}</p>
            {successMsg && (
                <div role="status" className="flex items-center gap-2 rounded-panel border border-blue-200 bg-uav-blue-light px-4 py-3 text-xs font-semibold text-uav-blue">
                    <CheckCircle2 size={16} className="shrink-0 text-uav-blue"/>
                    <span>{successMsg}</span>
                </div>
            )}

            <QueryState query={query}>
                {GROUPS.map(group => {
                    const items = settings.filter(s => groupOf(s.category) === group.id);
                    if (!items.length) return null;
                    const Icon = group.icon;
                    return (
                        <section key={group.id} aria-labelledby={`settings-group-${group.id}`} className="space-y-4 rounded-panel border border-border bg-card p-6">
                            <h3 id={`settings-group-${group.id}`} className="flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-900">
                                <Icon size={18} className={group.tone}/> {t(group.title)}
                            </h3>
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                {items.map(s => {
                                    const value = valueOf(s);
                                    const dirty = drafts[s.configKey] !== undefined && drafts[s.configKey] !== s.configValue;
                                    const problem = dirty ? clientCheck(s, value) : null;
                                    const error = serverErrors[s.configKey] ?? (problem ? t(`adminPlatform.settings.errors.${problem}`) : null);
                                    const id = `setting-${flatKey(s.configKey)}`;
                                    const help = `${id}-help`;
                                    return (
                                        <div key={s.configKey} className="space-y-1.5">
                                            <div className="flex items-center justify-between gap-2">
                                                <label htmlFor={id} className="text-sm font-semibold text-slate-800">{label(s)}</label>
                                                <button type="button" onClick={() => setHistoryFor(s)}
                                                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                                                    <History size={13} aria-hidden="true"/>{t('adminPlatform.settings.history')}
                                                </button>
                                            </div>
                                            <SettingInput setting={s} id={id} labelText={label(s)} describedBy={help} value={value} disabled={isSaving}
                                                          invalid={!!error} onChange={v => handleChange(s.configKey, v)}/>
                                            <p id={help} className="m-0 text-xs text-slate-500">
                                                {hint(s)}
                                                {s.description && s.description !== label(s)
                                                    ? <span className="block truncate text-[11px] text-slate-400" title={s.description}>{s.description}</span> : null}
                                            </p>
                                            {error && <p className="m-0 text-xs font-semibold text-red-700" role="alert">{error}</p>}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    );
                })}
            </QueryState>
            {historyFor && <SettingHistoryDrawer setting={historyFor} title={label(historyFor)} onClose={() => setHistoryFor(null)}/>}
        </div>
    );
}

function SettingInput({setting, id, labelText, describedBy, value, disabled, invalid, onChange}: {
    setting: TypedSetting;
    id: string;
    labelText: string;
    describedBy: string;
    value: string;
    disabled: boolean;
    invalid: boolean;
    onChange: (value: string) => void;
}) {
    const {t} = useI18n();
    const base = `min-h-[44px] w-full rounded-control border bg-slate-50 p-2.5 text-xs font-semibold text-slate-900 focus:border-primary focus:outline-none ${invalid ? 'border-red-400' : 'border-border-input'}`;
    if (setting.valueType === 'BOOLEAN') {
        return <div className="flex min-h-[44px] items-center">
            <Switch checked={value === 'true'} disabled={disabled} aria-label={labelText}
                    label={value === 'true' ? t('adminPlatform.settings.on') : t('adminPlatform.settings.off')}
                    onCheckedChange={next => onChange(next ? 'true' : 'false')}/>
        </div>;
    }
    if (setting.valueType === 'ENUM') {
        return <select id={id} aria-describedby={describedBy} aria-invalid={invalid} disabled={disabled} value={value}
                       onChange={e => onChange(e.target.value)} className={base}>
            {!setting.allowedValues.includes(value) && <option value={value}>{value || '—'}</option>}
            {setting.allowedValues.map(option => {
                const key = `adminPlatform.settings.options.${option}`;
                const text = t(key);
                return <option key={option} value={option}>{text === key ? option : text}</option>;
            })}
        </select>;
    }
    const numeric = setting.valueType === 'INTEGER' || setting.valueType === 'DECIMAL';
    const type = numeric ? 'number' : setting.valueType === 'EMAIL' ? 'email' : setting.valueType === 'PHONE' ? 'tel' : setting.valueType === 'URL' ? 'url' : 'text';
    return <input
        type={type}
        id={id}
        aria-describedby={describedBy}
        aria-invalid={invalid}
        disabled={disabled}
        value={value}
        inputMode={setting.valueType === 'INTEGER' ? 'numeric' : setting.valueType === 'DECIMAL' ? 'decimal' : undefined}
        min={numeric && setting.minValue != null ? setting.minValue : undefined}
        max={numeric && setting.maxValue != null ? setting.maxValue : undefined}
        step={setting.valueType === 'INTEGER' ? 1 : numeric ? 'any' : undefined}
        maxLength={!numeric && setting.valueType === 'STRING' && setting.maxValue != null ? setting.maxValue : 500}
        onChange={e => onChange(e.target.value)}
        className={`${base} ${numeric ? 'tabular-nums' : ''}`}
    />;
}

function SettingHistoryDrawer({setting, title, onClose}: { setting: TypedSetting; title: string; onClose: () => void }) {
    const {t, formatDate} = useI18n();
    const query = useSettingHistory(setting.configKey);
    const shown = (v: string | null) => (v === null ? '—' : v === '' ? t('adminPlatform.settings.emptyValue') : v);
    return <Drawer title={t('adminPlatform.settings.historyTitle', {name: title})} onClose={onClose}>
        <p className="m-0 font-mono text-xs text-slate-500">{setting.configKey}</p>
        <QueryState query={query}>
            {query.data && (query.data.length === 0
                ? <p className="text-sm text-slate-500">{t('adminPlatform.settings.historyEmpty')}</p>
                : <ol className="m-0 list-none space-y-2 p-0">
                    {query.data.map(entry => (
                        <li key={entry.id} className="rounded-panel border border-slate-100 bg-slate-50/70 p-3 text-[13px]">
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
                        </li>
                    ))}
                </ol>)}
        </QueryState>
    </Drawer>;
}

export default function AdminSettingsPage() {
    return (
        <AdminPage
            title="admin.pages.settings.title"
            permission="USER_MANAGE"
            activeResource="settings"
        >
            <AdminSettingsContent/>
            <section id="weather" className="mb-6 scroll-mt-16">
                <WeatherProviderSettingsSection/>
            </section>
            <section id="assistant" className="scroll-mt-16">
                <AssistantSettingsSection/>
            </section>
        </AdminPage>
    );
}
