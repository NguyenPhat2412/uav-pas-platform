'use client';

import {type FormEvent, useState} from 'react';
import {CloudSun, KeyRound, Save} from 'lucide-react';
import {Switch} from '@/components/ui';
import {ErrorNotice, QueryState} from '@/components/data/WorkspaceState';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {toast} from '@/providers/ToastContext';
import {cn} from '@/lib/utils';
import {useUpdateWeatherProvider, useWeatherProvider} from '@/hooks/weather/useWeather';
import {
    canSubmitWeatherProvider,
    toWeatherProviderPayload,
    WEATHER_PROVIDERS,
    weatherProviderDraftFromSettings,
    weatherProviderFieldErrors,
    type WeatherProviderFormDraft,
} from '@/forms/weather/weather-provider-form';
import type {WeatherProviderSettings, WeatherProviderType} from '@/types/weather/weather.types';

/**
 * Weather source for flight-safety checks: Open-Meteo (no key) or OpenWeatherMap with a key the
 * server seals with AES-256-GCM, the forecast cache lifetime and whether NO_GO blocks a take-off.
 */
export function WeatherProviderSettingsSection() {
    const {can, permissionsReady} = useAuth();
    const query = useWeatherProvider();
    if (!permissionsReady || !can('USER_PERMISSION_MANAGE')) return null;
    return <QueryState query={query}>{query.data &&
        <ProviderForm key={`${query.data.updatedAt ?? ''}-${query.data.provider}`} settings={query.data}/>}</QueryState>;
}

function ProviderForm({settings}: { settings: WeatherProviderSettings }) {
    const {t, formatDate} = useI18n();
    const [draft, setDraft] = useState<WeatherProviderFormDraft>(() => weatherProviderDraftFromSettings(settings));
    const set = (patch: Partial<WeatherProviderFormDraft>) => setDraft(prev => ({...prev, ...patch}));
    const save = useUpdateWeatherProvider({
        onSuccess: () => {
            set({apiKey: ''});
            toast.success(t('weather.provider.saved'));
        },
    });
    const fieldErrors = weatherProviderFieldErrors(save.error);
    const canSubmit = canSubmitWeatherProvider(draft);
    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (!canSubmit) return;
        save.mutate(toWeatherProviderPayload(draft));
    };
    const removeKey = () => {
        if (window.confirm(t('weather.provider.removeKeyConfirm')))
            save.mutate(toWeatherProviderPayload(draft, {removeKey: true, fallbackTtl: settings.cacheTtlMinutes}));
    };
    const field = 'mt-1 w-full rounded-control border border-border-input bg-card px-3 py-2 text-sm font-normal text-foreground focus:border-primary focus:outline-none';
    return <form noValidate onSubmit={submit} className="space-y-4 rounded-panel border border-border bg-card p-6" aria-labelledby="weather-provider-title">
        <h3 id="weather-provider-title" className="m-0 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-900">
            <CloudSun size={18} className="text-uav-blue" aria-hidden="true"/>{t('weather.provider.title')}</h3>
        <p className="m-0 text-xs leading-relaxed text-muted">{t('weather.provider.intro')}</p>
        <div className="grid gap-4 md:grid-cols-2">
            <label className="text-[13px] font-semibold text-slate-700">{t('weather.provider.source')}
                <select value={draft.provider} onChange={e => set({provider: e.target.value as WeatherProviderType})} className={field}>
                    {WEATHER_PROVIDERS.map(item => <option key={item} value={item}>{t(`weather.preflight.provider.${item}`)}</option>)}
                </select>
                {fieldErrors?.provider && <span className="mt-1 block text-xs font-normal text-danger">{fieldErrors.provider}</span>}
            </label>
            <label className="text-[13px] font-semibold text-slate-700">{t('weather.provider.cacheTtl')}
                <input type="number" step={1} value={draft.cacheTtlMinutes} onChange={e => set({cacheTtlMinutes: e.target.value})}
                       aria-invalid={Boolean(fieldErrors?.cacheTtlMinutes)} className={cn(field, 'tabular-nums', fieldErrors?.cacheTtlMinutes && 'border-danger')}/>
                {fieldErrors?.cacheTtlMinutes && <span className="mt-1 block text-xs font-normal text-danger">{fieldErrors.cacheTtlMinutes}</span>}
            </label>
            <label className="text-[13px] font-semibold text-slate-700 md:col-span-2">
                <span className="inline-flex items-center gap-1.5"><KeyRound size={14} aria-hidden="true"/>{t('weather.provider.apiKey')}</span>
                <input type="password" autoComplete="off" value={draft.apiKey} onChange={e => set({apiKey: e.target.value})} maxLength={256}
                       placeholder={settings.apiKeyConfigured ? t('weather.provider.apiKeyKeep') : t('weather.provider.apiKeyPlaceholder')}
                       aria-invalid={Boolean(fieldErrors?.apiKey)} className={cn(field, 'font-mono', fieldErrors?.apiKey && 'border-danger')}/>
                {fieldErrors?.apiKey
                    ? <span className="mt-1 block text-xs font-normal text-danger">{fieldErrors.apiKey}</span>
                    : <span className="mt-1 block text-xs font-normal text-muted">
                        {settings.apiKeyConfigured ? t('weather.provider.keyStored') : t('weather.provider.keyMissing')}</span>}
            </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-panel bg-slate-50 px-4 py-3">
            <div className="min-w-0">
                <p className="m-0 text-[13px] font-semibold text-slate-800">{t('weather.provider.block')}</p>
                <p className="m-0 text-xs text-muted">{t('weather.provider.blockHint')}</p>
            </div>
            <Switch checked={draft.enforcePreflightBlock} onCheckedChange={next => set({enforcePreflightBlock: next})} aria-label={t('weather.provider.block')}/>
        </div>
        {save.error && !fieldErrors && <ErrorNotice error={save.error}/>}
        <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 text-xs text-muted">{settings.updatedBy
                ? t('weather.provider.updated', {name: settings.updatedBy, time: settings.updatedAt ? formatDate(settings.updatedAt) : '—'})
                : null}</p>
            <div className="flex flex-wrap gap-2">
                {settings.apiKeyConfigured && <button type="button" onClick={removeKey} disabled={save.isPending}
                    className="rounded-control px-3 py-2 text-xs font-bold text-danger hover:bg-red-50 disabled:opacity-60">{t('weather.provider.removeKey')}</button>}
                <button type="submit" disabled={save.isPending || !canSubmit}
                        className="inline-flex items-center gap-1.5 rounded-control bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60">
                    <Save size={14} aria-hidden="true"/>{save.isPending ? t('weather.provider.saving') : t('weather.provider.save')}</button>
            </div>
        </div>
    </form>;
}
