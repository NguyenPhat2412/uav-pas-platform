'use client';

import {type FormEvent, useState} from 'react';
import Link from 'next/link';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {KeyRound, RefreshCw, Router, Save, Unplug} from 'lucide-react';
import {KpiCard, MetricStrip} from '@/components/ui';
import {QueryState} from '@/components/data/WorkspaceState';
import {ApiError} from '@/lib/api';
import {useI18n} from '@/contexts/I18nContext';
import {toast} from '@/contexts/ToastContext';
import {assistantKeys, assistantService} from '@/features/assistant/services/assistant.service';
import type {AiRouterSettings, AiRouterStatus} from '@/features/assistant/types/assistant.types';
import {SuperheroLogo} from '@/features/assistant/components/SuperheroLogo';
import {cn} from '@/lib/utils';

const field = 'mt-1 w-full rounded-control border border-slate-300 bg-white px-3 py-2 text-[13px] font-normal text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';
/** Error codes from the gateway are open-ended (HTTP_502, …); unknown ones fall back to a generic line carrying the code. */
function useErrorText() {
    const {t} = useI18n();
    return (code: string) => {
        const key = `admin.aiRouter.error.${code}`;
        const text = t(key, {code});
        return text === key ? t('admin.aiRouter.error.GENERIC', {code}) : text;
    };
}

const label = 'block text-[12px] font-semibold uppercase tracking-wide text-slate-600';

/** Assistant connection, API key and the two AI modes; lives in the admin System settings page. */
export function AssistantSettingsSection() {
    const settings = useQuery({queryKey: assistantKeys.settings, queryFn: ({signal}) => assistantService.settings(signal)});
    const status = useQuery({queryKey: assistantKeys.status, queryFn: ({signal}) => assistantService.status(signal), retry: false});
    return <div className="space-y-4">
        <StatusStrip status={status.data} loading={status.isFetching} settings={settings.data} onRefresh={() => void status.refetch()}/>
        <QueryState query={settings}>{settings.data &&
            <SettingsForm key={settings.data.version} settings={settings.data} models={status.data?.models ?? []}/>}</QueryState>
    </div>;
}

function StatusStrip({status, loading, settings, onRefresh}: {
    status?: AiRouterStatus; loading: boolean; settings?: AiRouterSettings; onRefresh: () => void;
}) {
    const {t, formatNumber} = useI18n();
    const errorText = useErrorText();
    return <section className="border border-slate-200 bg-white">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-3">
            <h2 className="m-0 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-800">
                <Router size={16} className="text-primary" aria-hidden="true"/>{t('admin.aiRouter.statusTitle')}</h2>
            <div className="flex flex-wrap items-center gap-2">
                <Link href="/admin/ai-router"
                                 className="rounded-control inline-flex h-8 items-center border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                                 {t('admin.aiRouter.openConsole')}</Link>
                <button type="button" onClick={onRefresh} disabled={loading}
                        className="rounded-control inline-flex h-8 items-center gap-1.5 border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                    <RefreshCw size={13} className={cn(loading && 'animate-spin')} aria-hidden="true"/>{t('admin.aiRouter.recheck')}</button>
            </div>
        </header>
        <MetricStrip className="border-0">
            <KpiCard label={t('admin.aiRouter.reachable')} tone={status?.reachable ? 'blue' : 'red'}
                     value={!status ? '—' : status.reachable ? t('admin.aiRouter.online') : t('admin.aiRouter.offline')}
                     meta={status?.latencyMs != null ? t('admin.aiRouter.latency', {ms: formatNumber(status.latencyMs)}) : status?.error ? errorText(status.error) : undefined}/>
            <KpiCard label={t('admin.aiRouter.auth')} tone={status?.authenticated ? 'blue' : 'amber'}
                     value={!status ? '—' : status.authenticated ? t('admin.aiRouter.keyValid') : settings?.apiKeyConfigured ? t('admin.aiRouter.keyInvalid') : t('admin.aiRouter.keyMissing')}
                     meta={settings?.apiKeyHint ? t('admin.aiRouter.keyEndsWith', {hint: settings.apiKeyHint}) : undefined}/>
            <KpiCard label={t('admin.aiRouter.models')} tone="slate" value={status?.authenticated ? formatNumber(status.models.length) : '—'}/>
            <KpiCard label={t('admin.aiRouter.assistant')} tone={settings?.enabled ? 'blue' : 'slate'}
                     value={settings ? t(settings.enabled ? 'admin.aiRouter.on' : 'admin.aiRouter.off') : '—'}
                     meta={settings?.updatedBy ? t('admin.aiRouter.updatedBy', {name: settings.updatedBy}) : undefined}/>
        </MetricStrip>
    </section>;
}

function SettingsForm({settings, models}: { settings: AiRouterSettings; models: string[] }) {
    const {t} = useI18n();
    const errorText = useErrorText();
    const client = useQueryClient();
    const [baseUrl, setBaseUrl] = useState(settings.baseUrl);
    const [apiKey, setApiKey] = useState('');
    const [mode1Label, setMode1Label] = useState(settings.mode1Label);
    const [mode1Model, setMode1Model] = useState(settings.mode1Model ?? '');
    const [mode2Label, setMode2Label] = useState(settings.mode2Label);
    const [mode2Model, setMode2Model] = useState(settings.mode2Model ?? '');
    const [systemPrompt, setSystemPrompt] = useState(settings.systemPrompt ?? '');
    const [enabled, setEnabled] = useState(settings.enabled);

    const save = useMutation({
        mutationFn: (apiKeyChange?: string) => assistantService.save({
            baseUrl: baseUrl.trim(), apiKey: apiKeyChange, mode1Label: mode1Label.trim(), mode1Model: mode1Model.trim() || null,
            mode2Label: mode2Label.trim(), mode2Model: mode2Model.trim() || null, systemPrompt: systemPrompt.trim() || null,
            enabled, expectedVersion: settings.version,
        }),
        onSuccess: next => {
            client.setQueryData(assistantKeys.settings, next);
            void client.invalidateQueries({queryKey: assistantKeys.status});
            void client.invalidateQueries({queryKey: assistantKeys.info});
            setApiKey('');
            toast.success(t('admin.aiRouter.saved'));
        },
        onError: error => {
            const code = error instanceof ApiError ? error.code ?? '' : '';
            if (code === 'AI_ROUTER_SETTINGS_STALE') void client.invalidateQueries({queryKey: assistantKeys.settings});
            toast.error(code ? errorText(code) : error instanceof Error ? error.message : t('admin.aiRouter.saveFailed'));
        },
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        save.mutate(apiKey.trim() ? apiKey.trim() : undefined);
    };
    const disconnect = () => {
        if (window.confirm(t('admin.aiRouter.disconnectConfirm'))) {
            setEnabled(false);
            save.mutate('');
        }
    };

    return <form onSubmit={submit} className="border border-slate-200 bg-white">
        <div className="grid grid-cols-1 gap-px bg-slate-200 lg:grid-cols-2">
            <fieldset className="m-0 space-y-4 border-0 bg-white p-4">
                <legend className="sr-only">{t('admin.aiRouter.connection')}</legend>
                <h3 className="m-0 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-800">
                    <KeyRound size={15} className="text-primary" aria-hidden="true"/>{t('admin.aiRouter.connection')}</h3>
                <label className={label}>{t('admin.aiRouter.baseUrl')}
                    <input required type="url" pattern="https://.+" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} className={cn(field, 'font-mono')}/>
                    <span className="mt-1 block text-xs font-normal normal-case tracking-normal text-slate-500">{t('admin.aiRouter.baseUrlHint')}</span></label>
                <label className={label}>{t('admin.aiRouter.apiKey')}
                    <input type="password" autoComplete="off" value={apiKey} onChange={e => setApiKey(e.target.value)} className={cn(field, 'font-mono')}
                           placeholder={settings.apiKeyConfigured ? t('admin.aiRouter.apiKeyStored', {hint: settings.apiKeyHint ?? '••••'}) : t('admin.aiRouter.apiKeyPlaceholder')}/>
                    <span className="mt-1 block text-xs font-normal normal-case tracking-normal text-slate-500">{t('admin.aiRouter.apiKeyHint')}</span></label>
                {settings.apiKeyConfigured && <button type="button" onClick={disconnect} disabled={save.isPending}
                                                      className="rounded-control inline-flex h-8 items-center gap-1.5 border border-rose-200 bg-white px-3 text-xs font-semibold text-primary hover:bg-uav-red-light disabled:opacity-60">
                    <Unplug size={13} aria-hidden="true"/>{t('admin.aiRouter.disconnect')}</button>}
                <label className="flex items-center gap-2.5 border-t border-slate-200 pt-4 text-[13px] font-semibold text-slate-800">
                    <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="h-4 w-4 accent-primary"/>
                    {t('admin.aiRouter.enable')}</label>
            </fieldset>

            <fieldset className="m-0 space-y-4 border-0 bg-white p-4">
                <legend className="sr-only">{t('admin.aiRouter.modes')}</legend>
                <h3 className="m-0 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-800">
                    <SuperheroLogo size={18}/>{t('admin.aiRouter.modes')}</h3>
                <datalist id="ai-router-models">{models.map(m => <option key={m} value={m}/>)}</datalist>
                {([[1, mode1Label, setMode1Label, mode1Model, setMode1Model], [2, mode2Label, setMode2Label, mode2Model, setMode2Model]] as const).map(([n, name, setName, model, setModel]) =>
                    <div key={n} className="grid grid-cols-1 gap-3 border-l-2 border-l-uav-blue pl-3 sm:grid-cols-[160px_minmax(0,1fr)]">
                        <label className={label}>{t('admin.aiRouter.modeName', {n})}
                            <input required maxLength={40} value={name} onChange={e => setName(e.target.value)} className={field}/></label>
                        <label className={label}>{t('admin.aiRouter.modeModel', {n})}
                            <input list="ai-router-models" maxLength={120} value={model} onChange={e => setModel(e.target.value)} className={cn(field, 'font-mono')}
                                   placeholder={models[0] ?? 'cc/claude-sonnet-4-5'}/></label>
                    </div>)}
                <p className="m-0 text-xs text-slate-500">{models.length ? t('admin.aiRouter.modelsFromRouter', {count: models.length}) : t('admin.aiRouter.modelsManual')}</p>
                <label className={label}>{t('admin.aiRouter.systemPrompt')}
                    <textarea rows={5} maxLength={4000} value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} className={cn(field, 'resize-y leading-relaxed')}/></label>
            </fieldset>
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/70 px-4 py-3">
            <span className="text-xs text-slate-500">{t('admin.aiRouter.securityNote')}</span>
            <button type="submit" disabled={save.isPending}
                    className="rounded-control inline-flex h-9 items-center gap-1.5 bg-primary px-4 text-[13px] font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60">
                <Save size={15} aria-hidden="true"/>{save.isPending ? t('admin.aiRouter.saving') : t('admin.aiRouter.save')}</button>
        </footer>
    </form>;
}
