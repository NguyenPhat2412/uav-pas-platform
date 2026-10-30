'use client';

import {type FormEvent, useState} from 'react';
import {CloudSun, KeyRound, Save} from 'lucide-react';
import {Switch} from '@/components/ui';
import {QueryState} from '@/components/data/WorkspaceState';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {toast} from '@/providers/ToastContext';
import {cn} from '@/lib/utils';
import {useUpdateWeatherProvider, useWeatherProvider} from '@/features/weather/hooks/useWeather';
import type {WeatherProviderSettings, WeatherProviderType} from '@/features/weather/types/weather.types';

const PROVIDERS: WeatherProviderType[] = ['OPEN_METEO', 'OPENWEATHERMAP'];

/**
 * Weather source for flight-safety checks: Open-Meteo (no key) or OpenWeatherMap with a key the
 * server seals with AES-256-GCM, the forecast cache lifetime and whether NO_GO blocks a take-off.
 */
export function WeatherProviderSettingsSection() {
    const {can, permissionsReady} = useAuth();
    const query = useWeatherProvider();
    if (!permissionsReady || !can('PERMISSION_MANAGE')) return null;
    return <QueryState query={query}>{query.data &&
        <ProviderForm key={`${query.data.updatedAt ?? ''}-${query.data.provider}`} settings={query.data}/>}</QueryState>;
}

function ProviderForm({settings}: { settings: WeatherProviderSettings }) {
    const {t, formatDate} = useI18n();
    const [provider, setProvider] = useState<WeatherProviderType>(settings.provider);
    const [apiKey, setApiKey] = useState('');
    const [ttl, setTtl] = useState(String(settings.cacheTtlMinutes));
    const [block, setBlock] = useState(settings.enforcePreflightBlock);
    const save = useUpdateWeatherProvider({
        onSuccess: () => {
            setApiKey('');
            toast.success(t('weather.provider.saved'));
        },
    });
    const ttlValue = Number(ttl);
    const ttlValid = Number.isInteger(ttlValue) && ttlValue >= 1 && ttlValue <= 120;
    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (!ttlValid) return;
        save.mutate({provider, apiKey: apiKey.trim() ? apiKey.trim() : undefined, cacheTtlMinutes: ttlValue, enforcePreflightBlock: block});
    };
    const removeKey = () => {
        if (window.confirm(t('weather.provider.removeKeyConfirm')))
            save.mutate({provider, apiKey: '', cacheTtlMinutes: ttlValid ? ttlValue : settings.cacheTtlMinutes, enforcePreflightBlock: block});
    };
    const field = 'mt-1 w-full rounded-control border border-border-input bg-card px-3 py-2 text-sm font-normal text-foreground focus:border-primary focus:outline-none';
    return <form onSubmit={submit} className="space-y-4 rounded-panel border border-border bg-card p-6" aria-labelledby="weather-provider-title">
        <h3 id="weather-provider-title" className="m-0 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-900">
            <CloudSun size={18} className="text-uav-blue" aria-hidden="true"/>{t('weather.provider.title')}</h3>
        <p className="m-0 text-xs leading-relaxed text-muted">{t('weather.provider.intro')}</p>
        <div className="grid gap-4 md:grid-cols-2">
            <label className="text-[13px] font-semibold text-slate-700">{t('weather.provider.source')}
                <select value={provider} onChange={e => setProvider(e.target.value as WeatherProviderType)} className={field}>
                    {PROVIDERS.map(item => <option key={item} value={item}>{t(`weather.preflight.provider.${item}`)}</option>)}
                </select>
            </label>
            <label className="text-[13px] font-semibold text-slate-700">{t('weather.provider.cacheTtl')}
                <input type="number" min={1} max={120} step={1} value={ttl} onChange={e => setTtl(e.target.value)}
                       aria-invalid={!ttlValid} className={cn(field, 'tabular-nums', !ttlValid && 'border-danger')}/>
                {!ttlValid && <span className="mt-1 block text-xs font-normal text-danger">{t('weather.provider.cacheTtlRange')}</span>}
            </label>
            <label className="text-[13px] font-semibold text-slate-700 md:col-span-2">
                <span className="inline-flex items-center gap-1.5"><KeyRound size={14} aria-hidden="true"/>{t('weather.provider.apiKey')}</span>
                <input type="password" autoComplete="off" value={apiKey} onChange={e => setApiKey(e.target.value)} maxLength={256}
                       placeholder={settings.apiKeyConfigured ? t('weather.provider.apiKeyKeep') : t('weather.provider.apiKeyPlaceholder')}
                       className={cn(field, 'font-mono')}/>
                <span className="mt-1 block text-xs font-normal text-muted">
                    {settings.apiKeyConfigured ? t('weather.provider.keyStored') : t('weather.provider.keyMissing')}</span>
            </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-panel bg-slate-50 px-4 py-3">
            <div className="min-w-0">
                <p className="m-0 text-[13px] font-semibold text-slate-800">{t('weather.provider.block')}</p>
                <p className="m-0 text-xs text-muted">{t('weather.provider.blockHint')}</p>
            </div>
            <Switch checked={block} onCheckedChange={setBlock} aria-label={t('weather.provider.block')}/>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 text-xs text-muted">{settings.updatedBy
                ? t('weather.provider.updated', {name: settings.updatedBy, time: settings.updatedAt ? formatDate(settings.updatedAt) : '—'})
                : null}</p>
            <div className="flex flex-wrap gap-2">
                {settings.apiKeyConfigured && <button type="button" onClick={removeKey} disabled={save.isPending}
                    className="rounded-control px-3 py-2 text-xs font-bold text-danger hover:bg-red-50 disabled:opacity-60">{t('weather.provider.removeKey')}</button>}
                <button type="submit" disabled={save.isPending || !ttlValid}
                        className="inline-flex items-center gap-1.5 rounded-control bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60">
                    <Save size={14} aria-hidden="true"/>{save.isPending ? t('weather.provider.saving') : t('weather.provider.save')}</button>
            </div>
        </div>
    </form>;
}
