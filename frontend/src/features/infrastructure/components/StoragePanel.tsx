'use client';

import {HardDrive, Images} from 'lucide-react';
import {useI18n} from '@/contexts/I18nContext';
import {QueryState} from '@/components/data/WorkspaceState';
import {infrastructureApi} from '../api';
import type {StorageStatus} from '../types';
import {formatBytes, Note, Panel, Stat, StatGrid, StatusBanner, type Tone, useInfraQuery} from './InfraUi';

const reachTone: Record<StorageStatus['reachable'], Tone> = {UP: 'good', DOWN: 'bad', UNKNOWN: 'neutral'};

export function StoragePanel() {
    const {t} = useI18n();
    const query = useInfraQuery('storage', ({signal}) => infrastructureApi.storage(signal));
    return <div className="space-y-4">
        <QueryState query={query}>{query.data && <Body data={query.data} refreshing={query.isFetching} onRefresh={() => void query.refetch()}/>}</QueryState>
        <Note>{t('adminInfra.storage.note')}</Note>
    </div>;
}

function Body({data, refreshing, onRefresh}: { data: StorageStatus; refreshing: boolean; onRefresh: () => void }) {
    const {t, formatDate, formatNumber} = useI18n();
    const m = data.media;
    const cleanupWarn = m.cleanupOverdue > 0 || m.cleanupRetrying > 0;
    const tone: Tone = data.reachable === 'UP' && (data.usageError || cleanupWarn) ? 'warn' : reachTone[data.reachable] ?? 'neutral';
    return <>
        <StatusBanner tone={tone} title={t(`adminInfra.storage.reachable.${data.reachable}`, {provider: data.provider})}
                      detail={data.usageError ? t('adminInfra.storage.usageError', {error: data.usageError})
                          : cleanupWarn ? t('adminInfra.storage.cleanupWarn') : t('adminInfra.storage.provider', {provider: data.provider})}
                      onRefresh={onRefresh} refreshing={refreshing}
                      checkedAt={data.usageCheckedAt ? formatDate(data.usageCheckedAt, {timeStyle: 'medium'}) : undefined}/>

        <Panel id="bucket" title={t('adminInfra.storage.bucket')} icon={HardDrive}
               footer={data.usageTruncated ? t('adminInfra.storage.truncated') : t('adminInfra.storage.cacheHint')}>
            <StatGrid>
                <Stat label={t('adminInfra.storage.objects')} value={data.objectCount == null ? '—' : formatNumber(data.objectCount)}/>
                <Stat label={t('adminInfra.storage.totalSize')} value={formatBytes(data.totalBytes, formatNumber)}/>
                <Stat label={t('adminInfra.storage.mediaBytes')} value={formatBytes(m.confirmedBytes, formatNumber)}
                      hint={t('adminInfra.storage.mediaBytesHint')}/>
                <Stat label={t('adminInfra.storage.providerLabel')} value={data.provider}/>
            </StatGrid>
        </Panel>

        <Panel id="media" title={t('adminInfra.storage.media')} icon={Images} tone={cleanupWarn ? 'warn' : undefined}
               badge={cleanupWarn ? t('adminInfra.storage.attention') : undefined} footer={t('adminInfra.storage.mediaHint')}>
            <StatGrid>
                <Stat label={t('adminInfra.storage.confirmed')} value={formatNumber(m.confirmed)}/>
                <Stat label={t('adminInfra.storage.awaitingUpload')} value={formatNumber(m.awaitingUpload)}/>
                <Stat label={t('adminInfra.storage.expiredUploads')} value={formatNumber(m.expiredUploads)}/>
                <Stat label={t('adminInfra.storage.purged')} value={formatNumber(m.purged)}/>
                <Stat label={t('adminInfra.storage.pendingCleanup')} value={formatNumber(m.pendingCleanup)}/>
                <Stat label={t('adminInfra.storage.cleanupOverdue')} value={formatNumber(m.cleanupOverdue)} warn={m.cleanupOverdue > 0}/>
                <Stat label={t('adminInfra.storage.cleanupRetrying')} value={formatNumber(m.cleanupRetrying)} warn={m.cleanupRetrying > 0}/>
            </StatGrid>
        </Panel>
    </>;
}
