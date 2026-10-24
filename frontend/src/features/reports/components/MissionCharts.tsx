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
    {key: 'active', label: 'admin.charts.outcome.active', color: '#2a78d6'},
    {key: 'completed', label: 'admin.charts.outcome.completed', color: '#1baf7a'},
    {key: 'stopped', label: 'admin.charts.outcome.stopped', color: '#eb6834'},
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

    return <div className="report-charts">
        <section className="console-panel report-chart" aria-labelledby="monthly-title">
            <header className="console-panel-header">
                <h2 id="monthly-title">{t('admin.charts.monthlyTitle')}</h2>
                <ul className="chart-legend">{outcomes.map(item => <li key={item.key}>
                    <span style={{background: item.color}} aria-hidden="true"/>{t(item.label)}</li>)}</ul>
            </header>
            <div className="chart-columns" role="img"
                 aria-label={t('admin.charts.monthlyAria', {months: MONTHS})}>
                {months.map(month => <div key={month.key} className="chart-column"
                                          onMouseEnter={() => setHover(month.key)}
                                          onMouseLeave={() => setHover(null)}>
                    {hover === month.key && <div className="chart-tooltip" role="tooltip">
                        <strong>{t('admin.charts.monthTotal', {month: month.label, total: month.total})}</strong>
                        {outcomes.map(item => <span key={item.key}><i style={{background: item.color}}/>{t(item.label)}: {month.counts[item.key]}</span>)}
                    </div>}
                    <div className="chart-stack" style={{height: `${(month.total / peak) * 100}%`}}>
                        {outcomes.map(item => month.counts[item.key] > 0 &&
                            <span key={item.key} style={{flexGrow: month.counts[item.key], background: item.color}}/>)}
                    </div>
                    <small>{month.label}</small>
                </div>)}
            </div>
            <details className="chart-table">
                <summary>{t('admin.charts.viewTable')}</summary>
                <table className="console-table">
                    <thead>
                    <tr>
                        <th>{t('admin.charts.month')}</th>
                        {outcomes.map(item => <th key={item.key}>{t(item.label)}</th>)}
                        <th>{t('admin.charts.total')}</th>
                    </tr>
                    </thead>
                    <tbody>{months.map(month => <tr key={month.key}>
                        <td>{month.label}</td>
                        {outcomes.map(item => <td key={item.key}>{month.counts[item.key]}</td>)}
                        <td>{month.total}</td>
                    </tr>)}</tbody>
                </table>
            </details>
        </section>
        <section className="console-panel report-chart" aria-labelledby="type-title">
            <header className="console-panel-header"><h2 id="type-title">{t('admin.charts.typeTitle')}</h2></header>
            {types.length ? <ul className="chart-bars">{types.map(item => <li key={item.type}>
                <span className="chart-bar-label">{displayLabel(item.type)}</span>
                <span className="chart-bar-track"><span className="chart-bar"
                                                         style={{width: `${(item.count / typePeak) * 100}%`}}/></span>
                <strong>{item.count}</strong>
            </li>)}</ul> : <p className="chart-empty">{t('admin.charts.empty')}</p>}
        </section>
        {truncated && <p className="text-xs text-slate-500">{t('admin.charts.truncated', {shown: list.length, total: missions.data.totalElements})}</p>}
    </div>;
}
