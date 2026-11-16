'use client';

import {Pause, Play, RefreshCw, Settings2, Trash2} from 'lucide-react';
import {Badge, Button, Card} from '@/components/ui';
import {formatBytes} from '@/components/infrastructure/runtime/InfraUi';
import {useI18n} from '@/providers/I18nContext';
import {cn} from '@/lib/utils';
import type {StorageDriveNode} from '@/types/storage/storage-pool.types';

interface StorageDriveNodeCardProps {
    node: StorageDriveNode;
    syncing: boolean;
    onSync: (node: StorageDriveNode) => void;
    onEdit: (node: StorageDriveNode) => void;
    onToggleEnabled: (node: StorageDriveNode) => void;
    onRequestRemove: (node: StorageDriveNode) => void;
}

export function StorageDriveNodeCard({
    node,
    syncing,
    onSync,
    onEdit,
    onToggleEnabled,
    onRequestRemove,
}: StorageDriveNodeCardProps) {
    const {t, formatNumber, formatDate} = useI18n();
    const pct = node.usagePercent != null ? Math.min(100, Math.max(0, node.usagePercent)) : 0;
    const nearCap = pct >= node.maxUsagePercent;
    const healthVariant =
        !node.enabled
            ? 'default'
            : node.healthStatus === 'UP'
              ? 'success'
              : node.healthStatus === 'QUOTA_FULL'
                ? 'warning'
                : 'error';

    return (
        <Card
            variant="machined"
            className={cn(!node.enabled && 'opacity-75')}
            innerClassName={cn('flex h-full flex-col justify-between p-4', !node.enabled && 'bg-slate-50/70')}
        >
            <div>
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <strong className="text-sm font-semibold text-on-surface">
                                {node.displayName}
                            </strong>
                            <Badge variant={healthVariant} size="sm">
                                {!node.enabled
                                    ? t('adminInfra.storage.pool.paused')
                                    : t(`adminInfra.storage.pool.health.${node.healthStatus}`)}
                            </Badge>
                            <Badge variant="outline" size="sm">
                                {node.authType === 'OAUTH2' ? 'OAuth 2.0' : 'Service Account'}
                            </Badge>
                        </div>
                        <p className="m-0 mt-0.5 truncate text-xs text-muted tabular-nums">
                            {node.accountEmail ?? node.code} · {t('adminInfra.storage.pool.weightLabel', {weight: node.priorityWeight})}
                        </p>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onSync(node)}
                            disabled={syncing}
                            title={t('adminInfra.storage.pool.syncQuota')}
                            aria-label={t('adminInfra.storage.pool.syncQuota')}
                            className="min-h-8 min-w-8 px-0"
                        >
                            <RefreshCw size={14} className={cn(syncing && 'animate-spin')} />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(node)}
                            title={t('adminInfra.storage.pool.editNode')}
                            aria-label={t('adminInfra.storage.pool.editNode')}
                            className="min-h-8 min-w-8 px-0"
                        >
                            <Settings2 size={14} />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onToggleEnabled(node)}
                            title={node.enabled ? t('adminInfra.storage.pool.pauseNode') : t('adminInfra.storage.pool.resumeNode')}
                            aria-label={node.enabled ? t('adminInfra.storage.pool.pauseNode') : t('adminInfra.storage.pool.resumeNode')}
                            className="min-h-8 min-w-8 px-0"
                        >
                            {node.enabled ? <Pause size={14} /> : <Play size={14} />}
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onRequestRemove(node)}
                            disabled={node.storedObjectCount > 0}
                            title={
                                node.storedObjectCount > 0
                                    ? t('adminInfra.storage.pool.cannotRemoveNonEmpty')
                                    : t('adminInfra.storage.pool.removeNode')
                            }
                            aria-label={t('adminInfra.storage.pool.removeNode')}
                            className="min-h-8 min-w-8 px-0 text-slate-500 hover:text-danger disabled:opacity-35"
                        >
                            <Trash2 size={14} />
                        </Button>
                    </div>
                </div>

                <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-xs text-muted tabular-nums">
                        <span>
                            {formatBytes(node.quotaUsedBytes, formatNumber)} /{' '}
                            {node.quotaLimitBytes
                                ? formatBytes(node.quotaLimitBytes, formatNumber)
                                : t('adminInfra.storage.pool.unlimited')}
                        </span>
                        <span className="font-medium text-on-surface">
                            {node.freeBytes != null
                                ? t('adminInfra.storage.pool.freeLabel', {
                                      free: formatBytes(node.freeBytes, formatNumber),
                                  })
                                : t('adminInfra.storage.pool.unlimited')}
                        </span>
                    </div>
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-surface-container">
                        <div
                            className={cn(
                                'h-full w-full origin-left rounded-full transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
                                nearCap ? 'bg-amber-500' : 'bg-uav-blue',
                            )}
                            style={{transform: `scaleX(${pct / 100})`}}
                        />
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted tabular-nums">
                        <span>
                            UAV-PAS: {formatNumber(node.storedObjectCount)} {t('adminInfra.storage.pool.filesUnit')} (
                            {formatBytes(node.storedBytes, formatNumber)})
                        </span>
                        <span>
                            {t('adminInfra.storage.pool.capAt', {pct: node.maxUsagePercent})}
                            {node.lastCheckedAt ? ` · ${formatDate(node.lastCheckedAt, {timeStyle: 'short'})}` : ''}
                        </span>
                    </div>
                </div>

                {node.lastError && (
                    <p className="m-0 mt-2 rounded-badge bg-red-50 px-2.5 py-1 text-xs text-danger">
                        {node.lastError}
                    </p>
                )}
            </div>

            <div className="mt-3 flex flex-wrap gap-1 border-t border-slate-100 pt-2.5">
                {node.routedModules.split(',').map(tag => {
                    const clean = tag.trim() || 'ALL';
                    return (
                        <span
                            key={clean}
                            className="rounded-badge bg-surface-container-low px-2 py-0.5 text-[11px] font-medium text-muted"
                        >
                            {t(`adminInfra.storage.pool.routeTag.${clean}`)}
                        </span>
                    );
                })}
            </div>
        </Card>
    );
}
