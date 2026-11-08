'use client';

import {type FormEvent, useState} from 'react';
import Link from 'next/link';
import {KeyRound, RefreshCw, Router, Save, Unplug} from 'lucide-react';
import {KpiCard, MetricStrip} from '@/components/ui';
import {QueryState} from '@/components/data/WorkspaceState';
import {confirmDialog} from '@/providers/ConfirmContext';
import {useI18n} from '@/providers/I18nContext';
import {toast} from '@/providers/ToastContext';
import {useRouterSettings, useRouterStatus, useSaveRouterSettings} from '@/hooks/assistant/useAssistant';
import {
    aiRouterDraftFromSettings,
    aiRouterFieldErrors,
    canSubmitAiRouterSettings,
    resolveAiRouterErrorCode,
    toAiRouterSettingsPayload,
    type AiRouterFormDraft,
} from '@/forms/assistant/assistant-settings-form';
import type {AiRouterSettings, AiRouterStatus} from '@/types/assistant/assistant.types';
import {SuperheroLogo} from '@/components/assistant/SuperheroLogo';
import {OptionalMark, RequiredMark} from '@/components/shared/RequiredMark';
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
    const settings = useRouterSettings();
    const status = useRouterStatus();
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
    const [draft, setDraft] = useState<AiRouterFormDraft>(() => aiRouterDraftFromSettings(settings));
    const set = (patch: Partial<AiRouterFormDraft>) => setDraft(prev => ({...prev, ...patch}));

    const save = useSaveRouterSettings({
        onSuccess: () => {
            set({apiKey: ''});
            toast.success(t('admin.aiRouter.saved'));
        },
        onError: error => {
            const code = resolveAiRouterErrorCode(error);
            toast.error(code ? errorText(code) : error instanceof Error ? error.message : t('admin.aiRouter.saveFailed'));
        },
    });
    const fieldErrors = aiRouterFieldErrors(save.error);
    const renderFieldError = (msg?: string) =>
        msg ? <span className="mt-1 block text-xs font-normal normal-case tracking-normal text-danger">{/^[A-Z0-9_]+$/.test(msg) ? errorText(msg) : msg}</span> : null;

    const submit = (event: FormEvent) => {
        event.preventDefault();
        save.mutate(toAiRouterSettingsPayload(draft, settings.version));
    };
    const disconnect = async () => {
        if (await confirmDialog(t('admin.aiRouter.disconnectConfirm'))) {
            set({enabled: false});
            save.mutate(toAiRouterSettingsPayload(draft, settings.version, true));
        }
    };

    return <form noValidate onSubmit={submit} className="border border-slate-200 bg-white">
        <div className="grid grid-cols-1 gap-px bg-slate-200 lg:grid-cols-2">
            <fieldset className="m-0 space-y-4 border-0 bg-white p-4">
                <legend className="sr-only">{t('admin.aiRouter.connection')}</legend>
                <h3 className="m-0 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-800">
                    <KeyRound size={15} className="text-primary" aria-hidden="true"/>{t('admin.aiRouter.connection')}</h3>
                <label className={label}>{t('admin.aiRouter.baseUrl')}<RequiredMark/>
                    <input aria-required aria-invalid={Boolean(fieldErrors?.baseUrl)} type="url" value={draft.baseUrl} onChange={e => set({baseUrl: e.target.value})} className={cn(field, 'font-mono', fieldErrors?.baseUrl && 'border-danger')}/>
                    {renderFieldError(fieldErrors?.baseUrl) ?? <span className="mt-1 block text-xs font-normal normal-case tracking-normal text-slate-500">{t('admin.aiRouter.baseUrlHint')}</span>}</label>
                <label className={label}>{t('admin.aiRouter.apiKey')}<OptionalMark/>
                    <input type="password" autoComplete="off" aria-invalid={Boolean(fieldErrors?.apiKey)} value={draft.apiKey} onChange={e => set({apiKey: e.target.value})} className={cn(field, 'font-mono', fieldErrors?.apiKey && 'border-danger')}
                           placeholder={settings.apiKeyConfigured ? t('admin.aiRouter.apiKeyStored', {hint: settings.apiKeyHint ?? '••••'}) : t('admin.aiRouter.apiKeyPlaceholder')}/>
                    {renderFieldError(fieldErrors?.apiKey) ?? <span className="mt-1 block text-xs font-normal normal-case tracking-normal text-slate-500">{t('admin.aiRouter.apiKeyHint')}</span>}</label>
                {settings.apiKeyConfigured && <button type="button" onClick={() => void disconnect()} disabled={save.isPending}
                                                      className="rounded-control inline-flex h-8 items-center gap-1.5 border border-rose-200 bg-white px-3 text-xs font-semibold text-primary hover:bg-uav-red-light disabled:opacity-60">
                    <Unplug size={13} aria-hidden="true"/>{t('admin.aiRouter.disconnect')}</button>}
                <label className="flex items-center gap-2.5 border-t border-slate-200 pt-4 text-[13px] font-semibold text-slate-800">
                    <input type="checkbox" checked={draft.enabled} onChange={e => set({enabled: e.target.checked})} className="h-4 w-4 accent-primary"/>
                    {t('admin.aiRouter.enable')}</label>
            </fieldset>

            <fieldset className="m-0 space-y-4 border-0 bg-white p-4">
                <legend className="sr-only">{t('admin.aiRouter.modes')}</legend>
                <h3 className="m-0 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-800">
                    <SuperheroLogo size={18}/>{t('admin.aiRouter.modes')}</h3>
                <datalist id="ai-router-models">{models.map(m => <option key={m} value={m}/>)}</datalist>
                {([
                    [1, draft.mode1Label, (v: string) => set({mode1Label: v}), draft.mode1Model, (v: string) => set({mode1Model: v}), fieldErrors?.mode1Label, fieldErrors?.mode1Model],
                    [2, draft.mode2Label, (v: string) => set({mode2Label: v}), draft.mode2Model, (v: string) => set({mode2Model: v}), fieldErrors?.mode2Label, fieldErrors?.mode2Model],
                ] as const).map(([n, name, setName, model, setModel, labelErr, modelErr]) =>
                    <div key={n} className="grid grid-cols-1 gap-3 border-l-2 border-l-uav-blue pl-3 sm:grid-cols-[160px_minmax(0,1fr)]">
                        <label className={label}>{t('admin.aiRouter.modeName', {n})}<RequiredMark/>
                            <input aria-required aria-invalid={Boolean(labelErr)} value={name} onChange={e => setName(e.target.value)} className={cn(field, labelErr && 'border-danger')}/>
                            {renderFieldError(labelErr)}</label>
                        <label className={label}>{t('admin.aiRouter.modeModel', {n})}<OptionalMark/>
                            <input list="ai-router-models" aria-invalid={Boolean(modelErr)} value={model} onChange={e => setModel(e.target.value)} className={cn(field, 'font-mono', modelErr && 'border-danger')}
                                   placeholder={models[0] ?? 'cc/claude-sonnet-4-5'}/>
                            {renderFieldError(modelErr)}</label>
                    </div>)}
                <p className="m-0 text-xs text-slate-500">{models.length ? t('admin.aiRouter.modelsFromRouter', {count: models.length}) : t('admin.aiRouter.modelsManual')}</p>
                <label className={label}>{t('admin.aiRouter.systemPrompt')}<OptionalMark/>
                    <textarea rows={5} value={draft.systemPrompt} onChange={e => set({systemPrompt: e.target.value})} className={cn(field, 'resize-y leading-relaxed')}/>
                    {renderFieldError(fieldErrors?.systemPrompt)}</label>
            </fieldset>
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/70 px-4 py-3">
            <span className="text-xs text-slate-500">{t('admin.aiRouter.securityNote')}</span>
            <button type="submit" disabled={save.isPending || !canSubmitAiRouterSettings(draft)}
                    className="rounded-control inline-flex h-9 items-center gap-1.5 bg-primary px-4 text-[13px] font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60">
                <Save size={15} aria-hidden="true"/>{save.isPending ? t('admin.aiRouter.saving') : t('admin.aiRouter.save')}</button>
        </footer>
    </form>;
}
