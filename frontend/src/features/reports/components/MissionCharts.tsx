'use client';

import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {useAuth} from '@/contexts/AuthContext';
import {displayLabel} from '@/components/shared/presentation';
import {adminService} from '@/lib/api/admin';
import type {Mission, MissionStatus} from '@/types/customer';
import {useI18n} from '@/contexts/I18nContext';

const MONTHS = 6;

// Categorical slots in fixed order; validated for CVD separation (contrast relief = table view below).
const outcomes = [
    {key: 'active', label: 'admin.charts.outcome.active', color: 'var(--toast-info-border)'},
    {key: 'completed', label: 'admin.charts.outcome.completed', color: 'var(--success)'},
    {key: 'stopped', label: 'admin.charts.outcome.stopped', color: 'var(--warning)'},
] as const;
type Outcome = typeof outcomes[number]['key'];

function outcomeOf(status: MissionStatus): Outcome {
    if (status === 'COMPLETED') return 'completed';
    if (status === 'FAILED' || status === 'CANCELLED' || status === 'REJECTED') return 'stopped';
    return 'active';
}

function lastMonths(count: number) {
    const now = new Date();
    return Array.from({length: count}, (_, index) => {
        const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1);
        return {
            key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
            month: date.getMonth() + 1,
            year: String(date.getFullYear()).slice(2)
        };
    });
}

function monthlyOutcomes(missions: Mission[]) {
    return lastMonths(MONTHS).map(month => {
        const counts: Record<Outcome, number> = {active: 0, completed: 0, stopped: 0};
        for (const mission of missions) {
            if ((mission.requestedDate || mission.startTime || '').slice(0, 7) === month.key) counts[outcomeOf(mission.status)]++;
        }
        return {...month, counts, total: counts.active + counts.completed + counts.stopped};
    });
}

function typeCounts(missions: Mission[]) {
    const counts = new Map<string, number>();
    for (const mission of missions) counts.set(mission.missionType, (counts.get(mission.missionType) ?? 0) + 1);
    return [...counts.entries()].map(([type, count]) => ({type, count})).sort((a, b) => b.count - a.count);
}

export function MissionCharts() {
    const {user, can, permissionsReady} = useAuth();
    const missions = useQuery({
        queryKey: ['session', user?.id, 'admin-report-missions'],
        queryFn: ({signal}) => adminService.reportMissions(signal),
        enabled: permissionsReady && can('MISSION_VIEW_ALL')
    });
    const [hover, setHover] = useState<string | null>(null);
    const {t} = useI18n();
    if (!can('MISSION_VIEW_ALL')) return null;
    if (missions.isPending) return <p role="status" className="text-sm text-slate-500">{t('admin.charts.loading')}</p>;
    if (missions.isError) return <p role="alert" className="text-sm text-slate-500">{t('admin.charts.loadError')}</p>;

    const list = missions.data.content;
    const months = monthlyOutcomes(list).map(month => ({...month, label: t('admin.charts.monthLabel', {month: month.month, year: month.year})}));
    const types = typeCounts(list);
    const peak = Math.max(1, ...months.map(month => month.total));
    const typePeak = Math.max(1, ...types.map(item => item.count));
    const truncated = missions.data.totalElements > list.length;

    return <div className="grid grid-cols-1 gap-px border border-slate-200 bg-slate-200 [&>*]:border-0 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="min-w-0 rounded-none border border-border bg-card pb-4" aria-labelledby="monthly-title">
            <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-4">
                <h2 id="monthly-title" className="text-[15px] font-bold tracking-tight text-foreground">{t('admin.charts.monthlyTitle')}</h2>
                <ul className="m-0 flex list-none flex-wrap gap-x-3.5 gap-y-1.5 p-0 text-xs text-muted">{outcomes.map(item => <li key={item.key} className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-none" style={{background: item.color}} aria-hidden="true"/>{t(item.label)}</li>)}</ul>
            </header>
            <div className="flex h-[220px] items-stretch gap-3 border-b border-border px-5 pt-3" role="img"
                 aria-label={t('admin.charts.monthlyAria', {months: MONTHS})}>
                {months.map(month => <div key={month.key} className="relative flex flex-1 flex-col items-center justify-end gap-1.5 pb-1.5"
                                          onMouseEnter={() => setHover(month.key)}
                                          onMouseLeave={() => setHover(null)}>
                    {hover === month.key && <div className="pointer-events-none absolute bottom-[calc(100%-40px)] z-10 grid min-w-[150px] gap-0.5 rounded-none border border-border bg-card px-2.5 py-2 text-xs text-foreground shadow-lg" role="tooltip">
                        <strong>{t('admin.charts.monthTotal', {month: month.label, total: month.total})}</strong>
                        {outcomes.map(item => <span key={item.key} className="flex items-center gap-1.5 text-muted"><i className="inline-block h-2.5 w-2.5 rounded-none" style={{background: item.color}}/>{t(item.label)}: {month.counts[item.key]}</span>)}
                    </div>}
                    <div className="flex min-h-0 w-[min(36px,100%)] flex-col-reverse gap-0.5 overflow-hidden rounded-t-none" style={{height: `${(month.total / peak) * 100}%`}}>
                        {outcomes.map(item => month.counts[item.key] > 0 &&
                            <span key={item.key} className="min-h-[2px]" style={{flexGrow: month.counts[item.key], background: item.color}}/>)}
                    </div>
                    <small className="text-[11px] text-muted">{month.label}</small>
                </div>)}
            </div>
            <details className="px-5 pt-3 text-[13px]">
                <summary className="cursor-pointer text-muted hover:text-foreground">{t('admin.charts.viewTable')}</summary>
                <table className="mt-2 w-full min-w-[560px] border-separate border-spacing-0 text-sm">
                    <thead>
                    <tr>
                        <th className="border-b border-border bg-slate-50 px-4 py-2.5 text-left text-xs font-semibold text-slate-500">{t('admin.charts.month')}</th>
                        {outcomes.map(item => <th key={item.key} className="border-b border-border bg-slate-50 px-4 py-2.5 text-left text-xs font-semibold text-slate-500">{t(item.label)}</th>)}
                        <th className="border-b border-border bg-slate-50 px-4 py-2.5 text-left text-xs font-semibold text-slate-500">{t('admin.charts.total')}</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-border">{months.map(month => <tr key={month.key} className="transition-colors hover:bg-background">
                        <td className="px-4 py-2.5 text-foreground">{month.label}</td>
                        {outcomes.map(item => <td key={item.key} className="px-4 py-2.5 text-foreground">{month.counts[item.key]}</td>)}
                        <td className="px-4 py-2.5 text-foreground">{month.total}</td>
                    </tr>)}</tbody>
                </table>
            </details>
        </section>
        <section className="min-w-0 rounded-none border border-border bg-card pb-4" aria-labelledby="type-title">
            <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-4"><h2 id="type-title" className="text-[15px] font-bold tracking-tight text-foreground">{t('admin.charts.typeTitle')}</h2></header>
            {types.length ? <ul className="m-0 grid list-none gap-3 px-5 pt-3">{types.map(item => <li key={item.type} className="grid grid-cols-[minmax(90px,140px)_1fr_auto] items-center gap-2.5 text-[13px]">
                <span className="truncate text-muted">{displayLabel(item.type)}</span>
                <span className="h-2.5 rounded-none bg-border"><span className="block h-full min-w-[4px] rounded-none bg-blue-600"
                                                         style={{width: `${(item.count / typePeak) * 100}%`}}/></span>
                <strong>{item.count}</strong>
            </li>)}</ul> : <p className="m-0 px-5 py-3 text-[13px] text-muted">{t('admin.charts.empty')}</p>}
        </section>
        {truncated && <p className="col-span-full m-0 text-xs text-slate-500">{t('admin.charts.truncated', {shown: list.length, total: missions.data.totalElements})}</p>}
    </div>;
}
