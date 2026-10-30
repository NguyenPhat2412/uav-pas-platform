'use client';

import {AlertOctagon, AlertTriangle, Info, ShieldCheck} from 'lucide-react';
import {useI18n} from '@/providers/I18nContext';
import {cn} from '@/lib/utils';
import type {SecurityWarning, WarningSeverity} from '@/features/security/types/security.types';

const severityStyle: Record<WarningSeverity, { box: string; text: string; icon: typeof Info }> = {
    CRITICAL: {box: 'border-l-red-600 bg-red-50', text: 'text-red-800', icon: AlertOctagon},
    WARNING: {box: 'border-l-amber-500 bg-amber-50', text: 'text-amber-900', icon: AlertTriangle},
    INFO: {box: 'border-l-slate-400 bg-slate-50', text: 'text-slate-700', icon: Info},
};

const severityOrder: Record<WarningSeverity, number> = {CRITICAL: 0, WARNING: 1, INFO: 2};

/** Findings sorted by severity; each code has its own title and fix text in the catalog. */
export function WarningList({warnings, okKey}: { warnings: SecurityWarning[]; okKey: string }) {
    const {t} = useI18n();
    if (!warnings.length) return <section role="status" className="flex items-center gap-3 border border-l-4 border-slate-200 border-l-uav-blue bg-white px-4 py-3">
        <ShieldCheck size={20} className="text-uav-blue" aria-hidden="true"/>
        <p className="m-0 text-[13px] font-semibold text-slate-800">{t(okKey)}</p>
    </section>;
    const sorted = [...warnings].sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3));
    const critical = warnings.filter(w => w.severity === 'CRITICAL').length;
    return <section aria-labelledby="security-findings" className="space-y-2">
        <h2 id="security-findings" className="m-0 text-[14px] font-bold text-slate-900">
            {t('adminSecurity.warnings.title', {count: warnings.length})}
            {critical > 0 && <span className="ml-2 bg-red-600 px-1.5 py-0.5 text-[11px] font-bold uppercase text-white">{t('adminSecurity.warnings.criticalCount', {count: critical})}</span>}
        </h2>
        <ul className="m-0 list-none space-y-2 p-0">{sorted.map(w => {
            const s = severityStyle[w.severity] ?? severityStyle.INFO;
            const Icon = s.icon;
            return <li key={`${w.code}-${w.subject}`} className={cn('flex gap-3 border border-l-4 border-slate-200 px-4 py-3', s.box)}>
                <Icon size={18} className={cn('mt-0.5 flex-none', s.text)} aria-hidden="true"/>
                <div className="min-w-0">
                    <p className={cn('m-0 text-[13px] font-bold', s.text)}>
                        <span className="sr-only">{t(`adminSecurity.severity.${w.severity}`)}: </span>
                        {t(`adminSecurity.warnings.codes.${w.code}.title`)}</p>
                    <p className="m-0 mt-0.5 text-[12.5px] text-slate-700">{t(`adminSecurity.warnings.codes.${w.code}.fix`)}</p>
                    <code className="mt-1 inline-block text-[11.5px] text-slate-500">{w.subject}</code>
                </div>
            </li>;
        })}</ul>
    </section>;
}

export function Flag({on, onKey = 'adminSecurity.common.on', offKey = 'adminSecurity.common.off', danger}: {
    on: boolean; onKey?: string; offKey?: string; danger?: 'on' | 'off'
}) {
    const {t} = useI18n();
    const bad = danger === (on ? 'on' : 'off');
    return <span className={cn('inline-flex items-center px-1.5 py-0.5 text-[11.5px] font-semibold',
        bad ? 'bg-red-100 text-red-800' : on ? 'bg-uav-blue-light text-uav-blue' : 'bg-slate-100 text-slate-600')}>{t(on ? onKey : offKey)}</span>;
}
