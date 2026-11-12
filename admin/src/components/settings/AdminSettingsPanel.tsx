'use client';

import React, {useMemo, useState} from 'react';
import {Cpu, Globe, History, MapPin, Phone, Receipt, Save, Settings2, ShieldCheck} from 'lucide-react';
import {settingLabel} from '@/lib/presentation';
import {AdminPage} from '@/components/layout/AdminPage';
import {QueryState} from '@/components/data/WorkspaceState';
import {Alert, Button, Card, FormField, Input, Select, Switch} from '@/components/ui';
import {AssistantSettingsSection} from '@/components/assistant/AssistantSettingsSection';
import {WeatherProviderSettingsSection} from '@/components/weather/WeatherProviderSettingsSection';
import type {TypedSetting} from '@/types/settings/platform-settings.types';
import {changedSettings, settingEmptyProblem, settingServerError, sortedSettingsToSave, toSettingUpdatePayload} from '@/forms/settings/settings-form';
import {usePlatformSettings, useSaveSetting} from '@/hooks/settings/useSettings';
import {useI18n} from '@/providers/I18nContext';
import {useUnsavedChanges} from '@/hooks/useWorkspaceTabs';
import {buildSettingHint, flatKey, SettingHistoryDrawer} from './SettingHistoryDrawer';

type GroupId = 'SAFETY' | 'OPERATIONS' | 'MAP' | 'AI' | 'BILLING' | 'CONTACT' | 'OTHER';
// Existing group titles keep their admin.settings catalog keys (AI group = KV260 edge processing).
const GROUPS: { id: GroupId; icon: typeof ShieldCheck; tone: string; title: string }[] = [
    {id: 'SAFETY', icon: ShieldCheck, tone: 'text-primary', title: 'admin.settings.safetyGroup'},
    {id: 'OPERATIONS', icon: MapPin, tone: 'text-amber-600', title: 'admin.settings.opsGroup'},
    {id: 'MAP', icon: Globe, tone: 'text-uav-blue', title: 'adminPlatform.settings.groups.MAP'},
    {id: 'AI', icon: Cpu, tone: 'text-uav-blue', title: 'admin.settings.aiGroup'},
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
    const changed = changedSettings(settings, drafts);
    const invalid = changed.filter(s => settingEmptyProblem(s, valueOf(s)) !== null);
    useUnsavedChanges(changed.length > 0);

    const label = (s: TypedSetting) => {
        const key = `adminPlatform.settings.labels.${flatKey(s.configKey)}`;
        const text = t(key);
        return text === key ? settingLabel(s.configKey, s.description ?? undefined) : text;
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
        try {
            for (const item of sortedSettingsToSave(changed, valueOf)) {
                try {
                    await save.mutateAsync(toSettingUpdatePayload(item, valueOf(item)));
                    saved += 1;
                    setDrafts(prev => {
                        const next = {...prev};
                        delete next[item.configKey];
                        return next;
                    });
                } catch (error) {
                    const detail = settingServerError(error, t);
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
            <Card className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="m-0 text-sm text-slate-600">
                    {changed.length ? t('adminPlatform.settings.pending', {count: changed.length}) : t('adminPlatform.settings.noPending')}
                </p>
                <Button type="button" variant="primary" onClick={() => void handleSaveAll()} isLoading={isSaving}
                        loadingText={t('admin.settings.saving')} disabled={query.isPending || changed.length === 0}
                        leftIcon={<Save size={16} aria-hidden="true"/>} className="min-h-[44px] shrink-0 text-xs font-bold">
                    {t('admin.settings.saveAll')}
                </Button>
            </Card>

            {errorMsg && <Alert variant="error" role="alert" className="text-sm">{errorMsg}</Alert>}
            <p className="m-0 text-xs text-slate-500">{t('admin.settings.invoiceNote')}</p>
            {successMsg && <Alert variant="success" role="status" className="text-xs font-semibold">{successMsg}</Alert>}

            <QueryState query={query}>
                {GROUPS.map(group => {
                    const items = settings.filter(s => groupOf(s.category) === group.id);
                    if (!items.length) return null;
                    const Icon = group.icon;
                    return (
                        <Card key={group.id} role="region" aria-labelledby={`settings-group-${group.id}`} className="space-y-4 p-6">
                            <h3 id={`settings-group-${group.id}`} className="flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-900">
                                <Icon size={18} className={group.tone}/> {t(group.title)}
                            </h3>
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                {items.map(s => {
                                    const value = valueOf(s);
                                    const dirty = drafts[s.configKey] !== undefined && drafts[s.configKey] !== s.configValue;
                                    const problem = dirty ? settingEmptyProblem(s, value) : null;
                                    const error = serverErrors[s.configKey] ?? (problem ? t(`adminPlatform.settings.errors.${problem}`) : null);
                                    const id = `setting-${flatKey(s.configKey)}`;
                                    const help = `${id}-help`;
                                    return (
                                        <div key={s.configKey} className="space-y-1.5">
                                            <div className="flex items-center justify-between gap-2">
                                                <label htmlFor={id} className="text-sm font-semibold text-slate-800">{label(s)}</label>
                                                <Button type="button" variant="ghost" size="sm" onClick={() => setHistoryFor(s)}
                                                        leftIcon={<History size={13} aria-hidden="true"/>} className="h-7 px-2 text-xs font-semibold">
                                                    {t('adminPlatform.settings.history')}
                                                </Button>
                                            </div>
                                            <FormField id={id} optional={false} error={error ?? undefined} helperText={
                                                <span id={help}>
                                                    {buildSettingHint(s, t, formatNumber)}
                                                    {s.description && s.description !== label(s)
                                                        ? <span className="block truncate text-[11px] text-slate-400" title={s.description}>{s.description}</span>
                                                        : null}
                                                </span>
                                            }>
                                                <SettingInput setting={s} id={id} labelText={label(s)} describedBy={help} value={value}
                                                              disabled={isSaving} invalid={!!error} onChange={v => handleChange(s.configKey, v)}/>
                                            </FormField>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    );
                })}
            </QueryState>
            {historyFor && <SettingHistoryDrawer setting={historyFor} title={label(historyFor)} onClose={() => setHistoryFor(null)}/>}
        </div>
    );
}

function SettingInput({setting, id, labelText, describedBy, value, disabled, invalid, onChange}: {
    setting: TypedSetting; id: string; labelText: string; describedBy: string;
    value: string; disabled: boolean; invalid: boolean; onChange: (value: string) => void;
}) {
    const {t} = useI18n();
    if (setting.valueType === 'BOOLEAN') {
        return (
            <div className="flex min-h-[44px] items-center">
                <Switch checked={value === 'true'} disabled={disabled} aria-label={labelText}
                        label={value === 'true' ? t('adminPlatform.settings.on') : t('adminPlatform.settings.off')}
                        onCheckedChange={next => onChange(next ? 'true' : 'false')}/>
            </div>
        );
    }
    if (setting.valueType === 'ENUM') {
        return (
            <Select id={id} aria-describedby={describedBy} aria-invalid={invalid} disabled={disabled} value={value}
                    onChange={e => onChange(e.target.value)}
                    className={invalid ? 'border-danger bg-slate-50 text-xs font-semibold' : 'bg-slate-50 text-xs font-semibold'}>
                {!setting.allowedValues.includes(value) && <option value={value}>{value || '—'}</option>}
                {setting.allowedValues.map(option => {
                    const key = `adminPlatform.settings.options.${option}`;
                    const text = t(key);
                    return <option key={option} value={option}>{text === key ? option : text}</option>;
                })}
            </Select>
        );
    }
    const numeric = setting.valueType === 'INTEGER' || setting.valueType === 'DECIMAL';
    const type = numeric ? 'number' : setting.valueType === 'EMAIL' ? 'email' : setting.valueType === 'PHONE' ? 'tel' : setting.valueType === 'URL' ? 'url' : 'text';
    return (
        <Input type={type} id={id} aria-describedby={describedBy} aria-invalid={invalid} disabled={disabled} value={value}
               inputMode={setting.valueType === 'INTEGER' ? 'numeric' : setting.valueType === 'DECIMAL' ? 'decimal' : undefined}
               min={numeric && setting.minValue != null ? setting.minValue : undefined}
               max={numeric && setting.maxValue != null ? setting.maxValue : undefined}
               step={setting.valueType === 'INTEGER' ? 1 : numeric ? 'any' : undefined}
               maxLength={!numeric && setting.valueType === 'STRING' && setting.maxValue != null ? setting.maxValue : 500}
               onChange={e => onChange(e.target.value)}
               className={`bg-slate-50 text-xs font-semibold ${invalid ? 'border-danger' : ''} ${numeric ? 'tabular-nums' : ''}`}/>
    );
}

export default function AdminSettingsPage() {
    return (
        <AdminPage title="admin.pages.settings.title" permission="USER_MANAGE" activeResource="settings">
            <AdminSettingsContent/>
            <section id="weather" className="mb-6 scroll-mt-16"><WeatherProviderSettingsSection/></section>
            <section id="assistant" className="scroll-mt-16"><AssistantSettingsSection/></section>
        </AdminPage>
    );
}
