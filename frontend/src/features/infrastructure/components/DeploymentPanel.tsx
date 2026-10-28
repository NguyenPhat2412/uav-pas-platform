'use client';

import {GitCommitHorizontal, History, Lock, Server} from 'lucide-react';
import {useI18n} from '@/contexts/I18nContext';
import {QueryState} from '@/components/data/WorkspaceState';
import {infrastructureApi} from '../api';
import type {DeploymentInfo, TlsCertificateInfo} from '../types';
import {Facts, formatDuration, Note, Panel, StatusBanner, type Tone, useInfraQuery} from './InfraUi';

export function tlsTone(tls: TlsCertificateInfo): Tone {
    if (tls.status === 'EXPIRED') return 'bad';
    if (tls.status === 'EXPIRING' || (tls.status === 'OK' && tls.trusted === false)) return 'warn';
    if (tls.status === 'OK') return 'good';
    return 'neutral';
}

export function DeploymentPanel() {
    const {t, formatDate} = useI18n();
    const query = useInfraQuery('deployment', ({signal}) => infrastructureApi.deployment(signal));
    return <div className="space-y-4">
        <QueryState query={query}>{query.data && <Body data={query.data} refreshing={query.isFetching}
                                                       onRefresh={() => void query.refetch()}
                                                       checkedAt={formatDate(query.data.serverTime, {timeStyle: 'medium'})}/>}</QueryState>
        <Note>{t('adminInfra.deployment.note')}</Note>
    </div>;
}

function Body({data, refreshing, onRefresh, checkedAt}: { data: DeploymentInfo; refreshing: boolean; onRefresh: () => void; checkedAt: string }) {
    const {t, formatDate, formatNumber} = useI18n();
    const date = (value: string | null) => value ? formatDate(value, {dateStyle: 'medium', timeStyle: 'short'}) : '—';
    const unknownBuild = data.gitCommit === 'unknown';
    const failed = data.migrations.filter(m => !m.success);
    const tone = tlsTone(data.tls);
    return <>
        <StatusBanner tone={failed.length ? 'bad' : unknownBuild ? 'neutral' : 'good'}
                      title={t('adminInfra.deployment.banner', {version: data.version})}
                      detail={failed.length ? t('adminInfra.deployment.failedMigrations', {count: failed.length})
                          : t('adminInfra.deployment.bannerDetail', {commit: data.gitCommit, flyway: data.flywayVersion ?? '—'})}
                      onRefresh={onRefresh} refreshing={refreshing} checkedAt={checkedAt}/>

        <div className="grid gap-4 lg:grid-cols-2">
            <Panel id="build" title={t('adminInfra.deployment.build')} icon={GitCommitHorizontal}
                   footer={unknownBuild ? t('adminInfra.deployment.unknownBuildHint') : undefined}>
                <Facts rows={[
                    [t('adminInfra.deployment.version'), data.version],
                    [t('adminInfra.deployment.commit'), <code key="c" className="font-mono">{data.gitCommit}</code>, data.gitCommit.endsWith('-dirty')],
                    [t('adminInfra.deployment.buildTime'), isIso(data.buildTime) ? date(data.buildTime) : data.buildTime],
                    [t('adminInfra.deployment.profiles'), data.activeProfiles.length ? data.activeProfiles.join(', ') : t('adminInfra.deployment.defaultProfile')],
                ]}/>
            </Panel>
            <Panel id="runtime" title={t('adminInfra.deployment.runtime')} icon={Server}>
                <Facts rows={[
                    [t('adminInfra.deployment.java'), `${data.javaVersion} (${data.javaVendor})`],
                    [t('adminInfra.deployment.startedAt'), date(data.startedAt)],
                    [t('adminInfra.deployment.uptime'), formatDuration(data.uptimeSeconds, t)],
                    [t('adminInfra.deployment.timeZone'), data.timeZone],
                    [t('adminInfra.deployment.publicUrl'), data.publicUrl ?? t('adminInfra.common.notConfigured')],
                ]}/>
            </Panel>
        </div>

        <Panel id="tls" title={t('adminInfra.tls.title')} icon={Lock} tone={tone} badge={t(`adminInfra.tls.status.${data.tls.status}`)}
               footer={t(`adminInfra.tls.hint.${data.tls.status}`)}>
            <Facts rows={[
                [t('adminInfra.tls.notAfter'), date(data.tls.notAfter)],
                [t('adminInfra.tls.daysLeft'), data.tls.daysLeft == null ? '—' : formatNumber(data.tls.daysLeft), tone === 'warn' || tone === 'bad'],
                [t('adminInfra.tls.issuer'), data.tls.issuer ?? '—'],
                [t('adminInfra.tls.trusted'), data.tls.trusted == null ? '—' : t(data.tls.trusted ? 'adminInfra.common.yes' : 'adminInfra.common.no'), data.tls.trusted === false],
                [t('adminInfra.tls.checkedAt'), date(data.tls.checkedAt)],
                ...(data.tls.errorClass ? [[t('adminInfra.common.error'), data.tls.errorClass, true] as [string, string, boolean]] : []),
            ]}/>
        </Panel>

        <Panel id="migrations" title={t('adminInfra.deployment.migrations', {count: data.migrations.length})} icon={History}>
            {data.migrations.length === 0
                ? <p className="m-0 px-4 py-3 text-[13px] text-slate-500">{t('adminInfra.deployment.noMigrations')}</p>
                : <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] text-left text-[13px]">
                        <thead className="bg-slate-50 text-xs text-slate-500">
                        <tr>
                            <th className="px-4 py-2 font-semibold">{t('adminInfra.deployment.colVersion')}</th>
                            <th className="px-4 py-2 font-semibold">{t('adminInfra.deployment.colDescription')}</th>
                            <th className="px-4 py-2 font-semibold">{t('adminInfra.deployment.colInstalled')}</th>
                            <th className="px-4 py-2 text-right font-semibold">{t('adminInfra.deployment.colDuration')}</th>
                            <th className="px-4 py-2 font-semibold">{t('adminInfra.deployment.colResult')}</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                        {data.migrations.map((m, i) => <tr key={`${m.version}-${i}`}>
                            <td className="px-4 py-2 font-mono tabular-nums">{m.version ?? '—'}</td>
                            <td className="px-4 py-2 text-slate-700">{m.description}</td>
                            <td className="px-4 py-2 tabular-nums text-slate-600">{date(m.installedOn)}</td>
                            <td className="px-4 py-2 text-right tabular-nums text-slate-600">{m.executionTimeMs == null ? '—' : `${formatNumber(m.executionTimeMs)} ms`}</td>
                            <td className={m.success ? 'px-4 py-2 text-uav-blue' : 'px-4 py-2 font-semibold text-red-700'}>
                                {t(m.success ? 'adminInfra.deployment.ok' : 'adminInfra.deployment.failed')}</td>
                        </tr>)}
                        </tbody>
                    </table>
                </div>}
        </Panel>
    </>;
}

function isIso(value: string) {
    return /^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(Date.parse(value));
}
