'use client';

import {Database, Gauge, Table2} from 'lucide-react';
import {useI18n} from '@/providers/I18nContext';
import {QueryState} from '@/components/data/WorkspaceState';
import {cn} from '@/lib/utils';
import type {DatabaseStatus} from '../types/infrastructure.types';
import {formatBytes, Note, Panel, Stat, StatGrid} from './InfraUi';
import {useDatabaseStatus} from '@/features/infrastructure/hooks/useInfrastructure';

export function DatabasePanel() {
    const {t} = useI18n();
    const query = useDatabaseStatus();
    return <div className="space-y-4">
        <QueryState query={query}>{query.data && <Body data={query.data}/>}</QueryState>
        <Note>{t('adminInfra.database.note')}</Note>
    </div>;
}

function Body({data}: { data: DatabaseStatus }) {
    const {t, formatNumber} = useI18n();
    const c = data.connections;
    const usage = c.max ? Math.round(c.total / c.max * 100) : 0;
    const poolBusy = data.pool && data.pool.threadsAwaiting > 0;
    return <>
        <Panel id="connections" title={t('adminInfra.database.connections')} icon={Database}>
            <StatGrid>
                <Stat label={t('adminInfra.database.active')} value={formatNumber(c.active)}/>
                <Stat label={t('adminInfra.database.idle')} value={formatNumber(c.idle)}/>
                <Stat label={t('adminInfra.database.idleInTransaction')} value={formatNumber(c.idleInTransaction)} warn={c.idleInTransaction > 0}/>
                <Stat label={t('adminInfra.database.usage')} value={`${c.total} / ${c.max}`} warn={usage >= 80}/>
            </StatGrid>
            <div className="px-4 pb-3"><span className="block h-1.5 bg-slate-100"><span
                className={cn('block h-1.5', usage >= 90 ? 'bg-red-600' : usage >= 80 ? 'bg-amber-500' : 'bg-slate-500')}
                style={{width: `${Math.min(usage, 100)}%`}}/></span></div>
        </Panel>

        <Panel id="pool" title={t('adminInfra.database.pool')} icon={Gauge} footer={data.pool ? t('adminInfra.database.poolHint') : t('adminInfra.database.poolUnavailable')}>
            {data.pool && <StatGrid>
                <Stat label={t('adminInfra.database.poolActive')} value={`${data.pool.active} / ${data.pool.maximumPoolSize}`}/>
                <Stat label={t('adminInfra.database.poolIdle')} value={formatNumber(data.pool.idle)}/>
                <Stat label={t('adminInfra.database.poolTotal')} value={formatNumber(data.pool.total)}/>
                <Stat label={t('adminInfra.database.poolWaiting')} value={formatNumber(data.pool.threadsAwaiting)} warn={!!poolBusy}/>
            </StatGrid>}
        </Panel>

        <Panel id="tables" title={t('adminInfra.database.tables')} icon={Table2} footer={t('adminInfra.database.rowsHint')}>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-[13px]">
                    <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr>
                        <th className="px-4 py-2 font-semibold">{t('adminInfra.database.colTable')}</th>
                        <th className="px-4 py-2 text-right font-semibold">{t('adminInfra.database.colSize')}</th>
                        <th className="px-4 py-2 text-right font-semibold">{t('adminInfra.database.colRows')}</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                    {data.largestTables.map(row => <tr key={row.name}>
                        <td className="px-4 py-2 font-mono">{row.name}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{formatBytes(row.totalBytes, formatNumber)}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-slate-600">{formatNumber(row.rowEstimate)}</td>
                    </tr>)}
                    </tbody>
                </table>
            </div>
        </Panel>
    </>;
}
