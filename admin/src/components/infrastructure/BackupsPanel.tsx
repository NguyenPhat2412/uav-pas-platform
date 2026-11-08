'use client';

import {Archive, CloudUpload, Terminal} from 'lucide-react';
import {useI18n} from '@/providers/I18nContext';
import {QueryState} from '@/components/data/WorkspaceState';
import type {BackupState, BackupStatus} from '@/types/infrastructure/infrastructure.types';
import {Facts, formatBytes, Note, Panel, Stat, StatGrid, StatusBanner, type Tone} from './InfraUi';
import {useBackupStatus} from '@/hooks/infrastructure/useInfrastructure';

export const backupTone: Record<BackupState, Tone> = {OK: 'good', STALE: 'warn', MISSING: 'bad', NOT_CONFIGURED: 'neutral'};

export function BackupsPanel() {
    const {t, formatDate} = useI18n();
    const query = useBackupStatus(300_000);
    return <div className="space-y-4">
        <QueryState query={query}>{query.data && <Body data={query.data} refreshing={query.isFetching}
                                                       onRefresh={() => void query.refetch()}
                                                       checkedAt={formatDate(query.data.checkedAt, {timeStyle: 'medium'})}/>}</QueryState>
        <Note>{t('adminInfra.backups.note')}</Note>
    </div>;
}

function Body({data, refreshing, onRefresh, checkedAt}: { data: BackupStatus; refreshing: boolean; onRefresh: () => void; checkedAt: string }) {
    const {t, formatDate, formatNumber} = useI18n();
    const date = (value: string | null) => value ? formatDate(value, {dateStyle: 'medium', timeStyle: 'short'}) : '—';
    const tone = backupTone[data.status] ?? 'neutral';
    return <>
        <StatusBanner tone={tone} title={t(`adminInfra.backups.status.${data.status}`)}
                      detail={t(`adminInfra.backups.hint.${data.status}`, {hours: data.staleAfterHours})}
                      onRefresh={onRefresh} refreshing={refreshing} checkedAt={checkedAt}/>
        <section className="border border-slate-200 bg-white">
            <StatGrid>
                <Stat label={t('adminInfra.backups.lastSuccess')} value={date(data.lastSuccessAt)}
                      hint={data.hoursSinceLastSuccess != null ? t('adminInfra.backups.hoursAgo', {hours: data.hoursSinceLastSuccess}) : undefined}
                      warn={tone !== 'good'}/>
                <Stat label={t('adminInfra.backups.fileCount')} value={formatNumber(data.fileCount)}/>
                <Stat label={t('adminInfra.backups.totalSize')} value={formatBytes(data.totalBytes, formatNumber)}/>
                <Stat label={t('adminInfra.backups.staleAfter')} value={t('adminInfra.backups.hours', {hours: data.staleAfterHours})}/>
            </StatGrid>
        </section>

        <Panel id="backup-files" title={t('adminInfra.backups.files')} icon={Archive}>
            {data.files.length === 0
                ? <p className="m-0 px-4 py-3 text-[13px] text-slate-500">{t('adminInfra.backups.noFiles')}</p>
                : <div className="overflow-x-auto">
                    <table className="w-full min-w-[420px] text-left text-[13px]">
                        <thead className="bg-slate-50 text-xs text-slate-500">
                        <tr>
                            <th className="px-4 py-2 font-semibold">{t('adminInfra.backups.colName')}</th>
                            <th className="px-4 py-2 text-right font-semibold">{t('adminInfra.backups.colSize')}</th>
                            <th className="px-4 py-2 font-semibold">{t('adminInfra.backups.colModified')}</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                        {data.files.map(f => <tr key={f.name}>
                            <td className="px-4 py-2 font-mono">{f.name}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{formatBytes(f.sizeBytes, formatNumber)}</td>
                            <td className="px-4 py-2 tabular-nums text-slate-600">{date(f.modifiedAt)}</td>
                        </tr>)}
                        </tbody>
                    </table>
                </div>}
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2">
            <Panel id="offsite" title={t('adminInfra.backups.offsite')} icon={CloudUpload} tone="neutral" badge={t('adminInfra.backups.offsiteUnknown')}>
                <Facts rows={[[t('adminInfra.backups.offsiteTarget'), <code key="o" className="font-mono">{data.offsiteTarget}</code>]]}/>
                <p className="m-0 px-4 pb-3 text-[13px] text-slate-600">{t('adminInfra.backups.offsiteHint')}</p>
            </Panel>
            <Panel id="restore" title={t('adminInfra.backups.restore')} icon={Terminal}>
                <p className="m-0 px-4 py-3 text-[13px] text-slate-600">{t('adminInfra.backups.restoreHint')}</p>
            </Panel>
        </div>
    </>;
}
