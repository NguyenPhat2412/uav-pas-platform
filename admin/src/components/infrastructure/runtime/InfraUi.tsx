'use client';

import {AlertTriangle, CheckCircle2, CircleHelp, CircleSlash, RefreshCw, XCircle, type LucideIcon} from 'lucide-react';
import {useI18n} from '@/providers/I18nContext';
import {cn} from '@/lib/utils';

export type Tone = 'good' | 'warn' | 'bad' | 'neutral' | 'off';

const toneStyle: Record<Tone, { stripe: string; text: string; icon: LucideIcon }> = {
    good: {stripe: 'border-l-uav-blue', text: 'text-uav-blue', icon: CheckCircle2},
    warn: {stripe: 'border-l-amber-500', text: 'text-amber-700', icon: AlertTriangle},
    bad: {stripe: 'border-l-red-600', text: 'text-red-700', icon: XCircle},
    neutral: {stripe: 'border-l-slate-400', text: 'text-slate-500', icon: CircleHelp},
    off: {stripe: 'border-l-slate-300', text: 'text-slate-500', icon: CircleSlash},
};

export function StatusBanner({tone, title, detail, onRefresh, refreshing, checkedAt}: {
    tone: Tone; title: string; detail?: React.ReactNode; onRefresh?: () => void; refreshing?: boolean; checkedAt?: string;
}) {
    const {t} = useI18n();
    const s = toneStyle[tone];
    const Icon = s.icon;
    return <section className={cn('flex flex-wrap items-center gap-4 border border-l-4 border-slate-200 bg-white px-5 py-4', s.stripe)} role="status">
        <Icon size={28} className={s.text} aria-hidden="true"/>
        <div className="min-w-0 flex-1">
            <h2 className={cn('m-0 text-lg font-bold', s.text)}>{title}</h2>
            {detail && <p className="m-0 text-[13px] text-slate-600">{detail}</p>}
        </div>
        {(onRefresh || checkedAt) && <div className="flex items-center gap-3 text-xs text-slate-500">
            {checkedAt && <span>{t('adminInfra.common.checkedAt', {time: checkedAt})}</span>}
            {onRefresh && <button type="button" onClick={onRefresh} disabled={refreshing}
                                  className="inline-flex h-9 items-center gap-1.5 border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                <RefreshCw size={14} className={cn(refreshing && 'animate-spin')} aria-hidden="true"/>{t('adminInfra.common.refresh')}</button>}
        </div>}
    </section>;
}

export function Panel({id, title, icon: Icon, tone, badge, children, footer}: {
    id: string; title: string; icon: LucideIcon; tone?: Tone; badge?: string; children: React.ReactNode; footer?: React.ReactNode;
}) {
    const s = tone ? toneStyle[tone] : undefined;
    const BadgeIcon = s?.icon;
    return <section className={cn('border border-slate-200 bg-white', s && 'border-l-4', s?.stripe)} aria-labelledby={`infra-${id}`}>
        <header className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
            <Icon size={17} className="text-slate-500" aria-hidden="true"/>
            <h3 id={`infra-${id}`} className="m-0 flex-1 text-[14px] font-bold text-slate-900">{title}</h3>
            {badge && s && BadgeIcon && <span className={cn('inline-flex items-center gap-1 text-xs font-semibold', s.text)}>
                <BadgeIcon size={14} aria-hidden="true"/>{badge}</span>}
        </header>
        {children}
        {footer && <p className="m-0 border-t border-slate-100 px-4 py-2.5 text-xs text-slate-600">{footer}</p>}
    </section>;
}

export function Facts({rows}: { rows: [string, React.ReactNode, boolean?][] }) {
    return <dl className="m-0 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1.5 px-4 py-3 text-[13px]">
        {rows.map(([label, value, warn]) => <div key={label} className="contents">
            <dt className="text-slate-500">{label}</dt>
            <dd className={cn('m-0 break-all text-right tabular-nums text-slate-900', warn && 'font-semibold text-amber-700')}>{value ?? '—'}</dd>
        </div>)}
    </dl>;
}

export function StatGrid({children}: { children: React.ReactNode }) {
    return <div className="grid gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-4">{children}</div>;
}

export function Stat({label, value, hint, warn}: { label: string; value: React.ReactNode; hint?: React.ReactNode; warn?: boolean }) {
    return <div className="bg-white px-4 py-3">
        <span className="block text-xs text-slate-500">{label}</span>
        <strong className={cn('mt-0.5 block text-[15px] tabular-nums text-slate-900', warn && 'text-amber-700')}>{value}</strong>
        {hint && <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>}
    </div>;
}

export function Note({children}: { children: React.ReactNode }) {
    return <p className="text-xs text-slate-500">{children}</p>;
}

export function formatBytes(bytes: number | null | undefined, formatNumber: (n: number, o?: Intl.NumberFormatOptions) => string) {
    if (bytes == null) return '—';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes, unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit++;
    }
    return `${formatNumber(value, {maximumFractionDigits: unit === 0 ? 0 : 1})} ${units[unit]}`;
}

export function formatDuration(seconds: number, t: (key: string, params?: Record<string, string | number>) => string) {
    const days = Math.floor(seconds / 86400), hours = Math.floor(seconds % 86400 / 3600), minutes = Math.floor(seconds % 3600 / 60);
    return days ? t('adminInfra.common.durationDays', {days, hours}) : t('adminInfra.common.durationHours', {hours, minutes});
}
