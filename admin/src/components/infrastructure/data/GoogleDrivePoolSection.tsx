'use client';

import {useEffect, useState} from 'react';
import {
    ArrowRightLeft,
    Cloud,
    FolderTree,
    HardDrive,
    Pause,
    Play,
    Plus,
    RefreshCw,
    Settings2,
    Sliders,
    Trash2,
} from 'lucide-react';
import {Alert, Badge, Button, ConfirmDialog, FormField, Input, Select} from '@/components/ui';
import {QueryState} from '@/components/data/WorkspaceState';
import {formatBytes, Panel, Stat, StatGrid} from '@/components/infrastructure/runtime/InfraUi';
import {useI18n} from '@/providers/I18nContext';
import {toast} from '@/providers/ToastContext';
import {cn} from '@/lib/utils';
import {
    useDeleteDriveNode,
    useMigrateR2Batch,
    useStoragePoolOverview,
    useSyncDriveNode,
    useUpdateDriveNode,
    useUpdateStoragePolicy,
} from '@/hooks/storage/useStoragePool';
import type {
    DriveAllocationStrategy,
    StorageBackendMode,
    StorageDriveNode,
    StoragePoolOverview,
    StorageR2MigrationResult,
} from '@/types/storage/storage-pool.types';
import {GoogleDriveNodeModal} from './GoogleDriveNodeModal';

const BACKEND_MODES: StorageBackendMode[] = ['GOOGLE_DRIVE', 'HYBRID_TIERED', 'R2'];
const STRATEGIES: DriveAllocationStrategy[] = ['MOST_FREE_SPACE', 'MODULE_PRIORITY', 'ROUND_ROBIN'];

export function GoogleDrivePoolSection() {
    const query = useStoragePoolOverview();
    const {t} = useI18n();

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const url = new URL(window.location.href);
        const connected = url.searchParams.get('driveConnected');
        const err = url.searchParams.get('driveError');
        if (connected) {
            toast.success(t('adminInfra.storage.pool.oauthConnectedToast', {account: connected}));
            url.searchParams.delete('driveConnected');
            window.history.replaceState({}, '', url.pathname + url.search);
        } else if (err) {
            toast.error(t('adminInfra.storage.pool.oauthErrorToast', {error: err}));
            url.searchParams.delete('driveError');
            window.history.replaceState({}, '', url.pathname + url.search);
        }
    }, [t]);

    return (
        <QueryState query={query}>
            {query.data && (
                <PoolBody
                    key={`${query.data.primaryBackend}|${query.data.allocationStrategy}|${query.data.fallbackToR2}|${query.data.tieredSmallFileMaxBytes}`}
                    overview={query.data}
                />
            )}
        </QueryState>
    );
}

function PoolBody({overview}: { overview: StoragePoolOverview }) {
    const {t, formatNumber, formatDate} = useI18n();
    const updatePolicy = useUpdateStoragePolicy();
    const syncNode = useSyncDriveNode();
    const updateNode = useUpdateDriveNode();
    const deleteNode = useDeleteDriveNode();
    const migrateR2 = useMigrateR2Batch();

    const [primaryBackend, setPrimaryBackend] = useState<StorageBackendMode>(overview.primaryBackend);
    const [strategy, setStrategy] = useState<DriveAllocationStrategy>(overview.allocationStrategy);
    const [fallbackToR2, setFallbackToR2] = useState<boolean>(overview.fallbackToR2);
    const [tieredMb, setTieredMb] = useState<string>(
        String(Math.max(1, Math.round(overview.tieredSmallFileMaxBytes / (1024 * 1024)))),
    );

    const [modalOpen, setModalOpen] = useState(false);
    const [editingNode, setEditingNode] = useState<StorageDriveNode | null>(null);
    const [removingNode, setRemovingNode] = useState<StorageDriveNode | null>(null);
    const [syncingId, setSyncingId] = useState<number | null>(null);

    const [batchSize, setBatchSize] = useState<number>(25);
    const [targetNodeId, setTargetNodeId] = useState<string>('auto');
    const [deleteFromR2, setDeleteFromR2] = useState<boolean>(false);
    const [lastMigration, setLastMigration] = useState<StorageR2MigrationResult | null>(null);

    const savePolicy = async () => {
        const mb = Math.min(100, Math.max(1, Number(tieredMb) || 5));
        try {
            await updatePolicy.mutateAsync({
                primaryBackend,
                allocationStrategy: strategy,
                fallbackToR2,
                tieredSmallFileMaxBytes: mb * 1024 * 1024,
            });
            toast.success(t('adminInfra.storage.pool.policySaved'));
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t('adminInfra.storage.pool.actionFailed'));
        }
    };

    const handleSync = async (node: StorageDriveNode) => {
        setSyncingId(node.id);
        try {
            await syncNode.mutateAsync(node.id);
            toast.success(t('adminInfra.storage.pool.quotaSynced', {name: node.displayName}));
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t('adminInfra.storage.pool.actionFailed'));
        } finally {
            setSyncingId(null);
        }
    };

    const handleToggleEnabled = async (node: StorageDriveNode) => {
        try {
            await updateNode.mutateAsync({
                id: node.id,
                body: {
                    displayName: node.displayName,
                    enabled: !node.enabled,
                    priorityWeight: node.priorityWeight,
                    maxUsagePercent: node.maxUsagePercent,
                    routedModules: node.routedModules,
                    rootFolderId: node.rootFolderId ?? undefined,
                },
            });
            toast.success(t('adminInfra.storage.pool.nodeUpdated'));
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t('adminInfra.storage.pool.actionFailed'));
        }
    };

    const confirmRemoveNode = async () => {
        if (!removingNode) return;
        const target = removingNode;
        setRemovingNode(null);
        try {
            await deleteNode.mutateAsync(target.id);
            toast.success(t('adminInfra.storage.pool.nodeRemoved', {name: target.displayName}));
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t('adminInfra.storage.pool.actionFailed'));
        }
    };

    const handleMigrateBatch = async () => {
        try {
            const res = await migrateR2.mutateAsync({
                limit: batchSize,
                deleteSourceFromR2: deleteFromR2,
                targetNodeId: targetNodeId === 'auto' ? null : Number(targetNodeId),
            });
            setLastMigration(res);
            toast.success(
                t('adminInfra.storage.pool.migrationDoneToast', {
                    migrated: res.migratedCount,
                    remaining: res.remainingR2Count,
                }),
            );
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t('adminInfra.storage.pool.actionFailed'));
        }
    };

    const activeDrives = overview.nodes.filter(n => n.enabled);

    return (
        <div className="space-y-4">
            <Panel
                id="drive-pool-summary"
                title={t('adminInfra.storage.pool.title')}
                icon={Cloud}
                footer={t('adminInfra.storage.pool.folderStructureHint')}
            >
                <StatGrid>
                    <Stat
                        label={t('adminInfra.storage.pool.statActiveMode')}
                        value={t(`adminInfra.storage.pool.mode.${overview.primaryBackend}`)}
                        hint={t(`adminInfra.storage.pool.strategy.${overview.allocationStrategy}`)}
                    />
                    <Stat
                        label={t('adminInfra.storage.pool.statActiveDrives')}
                        value={`${formatNumber(overview.driveActiveNodeCount)} / ${formatNumber(overview.nodes.length)}`}
                        warn={overview.primaryBackend !== 'R2' && overview.driveActiveNodeCount === 0}
                        hint={
                            overview.driveTotalFreeBytes != null
                                ? t('adminInfra.storage.pool.statFreeHint', {
                                      free: formatBytes(overview.driveTotalFreeBytes, formatNumber),
                                  })
                                : t('adminInfra.storage.pool.statConnectPrompt')
                        }
                    />
                    <Stat
                        label={t('adminInfra.storage.pool.statDriveStored')}
                        value={formatBytes(overview.driveTotalStoredBytes, formatNumber)}
                        hint={t('adminInfra.storage.pool.statObjectCount', {
                            count: formatNumber(overview.driveTotalObjectCount),
                        })}
                    />
                    <Stat
                        label={t('adminInfra.storage.pool.statR2Pending')}
                        value={formatBytes(overview.r2PendingBytes, formatNumber)}
                        hint={t('adminInfra.storage.pool.statObjectCount', {
                            count: formatNumber(overview.r2PendingObjectCount),
                        })}
                    />
                </StatGrid>

                <div className="border-t border-slate-100 p-4">
                    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <Sliders size={14} />
                        <span>{t('adminInfra.storage.pool.policyHeader')}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <FormField id="pool-primary-backend" label={t('adminInfra.storage.pool.primaryBackendLabel')} optional={false}>
                            <Select
                                id="pool-primary-backend"
                                value={primaryBackend}
                                onChange={e => setPrimaryBackend(e.target.value as StorageBackendMode)}
                                className="h-10 text-[13px]"
                            >
                                {BACKEND_MODES.map(mode => (
                                    <option key={mode} value={mode}>
                                        {t(`adminInfra.storage.pool.mode.${mode}`)}
                                    </option>
                                ))}
                            </Select>
                        </FormField>
                        <FormField id="pool-allocation-strategy" label={t('adminInfra.storage.pool.strategyLabel')} optional={false}>
                            <Select
                                id="pool-allocation-strategy"
                                value={strategy}
                                onChange={e => setStrategy(e.target.value as DriveAllocationStrategy)}
                                className="h-10 text-[13px]"
                            >
                                {STRATEGIES.map(item => (
                                    <option key={item} value={item}>
                                        {t(`adminInfra.storage.pool.strategy.${item}`)}
                                    </option>
                                ))}
                            </Select>
                        </FormField>
                        {primaryBackend === 'HYBRID_TIERED' ? (
                            <FormField id="pool-tiered-mb" label={t('adminInfra.storage.pool.tieredMbLabel')} optional={false}>
                                <Input
                                    id="pool-tiered-mb"
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={tieredMb}
                                    onChange={e => setTieredMb(e.target.value)}
                                    className="h-10 text-[13px]"
                                />
                            </FormField>
                        ) : (
                            <div className="flex items-end pb-1.5">
                                <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={fallbackToR2}
                                        onChange={e => setFallbackToR2(e.target.checked)}
                                        className="h-4 w-4 rounded border-slate-300 text-uav-blue"
                                    />
                                    <span>{t('adminInfra.storage.pool.fallbackToR2Label')}</span>
                                </label>
                            </div>
                        )}
                    </div>
                    {primaryBackend === 'HYBRID_TIERED' && (
                        <label className="mt-2.5 inline-flex cursor-pointer items-center gap-2 text-[13px] text-slate-700">
                            <input
                                type="checkbox"
                                checked={fallbackToR2}
                                onChange={e => setFallbackToR2(e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-uav-blue"
                            />
                            <span>{t('adminInfra.storage.pool.fallbackToR2Label')}</span>
                        </label>
                    )}
                    <div className="mt-3 flex justify-end">
                        <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={() => void savePolicy()}
                            disabled={updatePolicy.isPending}
                        >
                            {t('adminInfra.storage.pool.savePolicyBtn')}
                        </Button>
                    </div>
                </div>
            </Panel>

            <Panel
                id="drive-nodes"
                title={t('adminInfra.storage.pool.nodesPanelTitle', {count: overview.nodes.length})}
                icon={FolderTree}
            >
                <div className="p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="m-0 text-[13px] text-slate-600">{t('adminInfra.storage.pool.nodesIntro')}</p>
                        <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={() => {
                                setEditingNode(null);
                                setModalOpen(true);
                            }}
                            leftIcon={<Plus size={15} />}
                        >
                            {t('adminInfra.storage.pool.addDriveBtn')}
                        </Button>
                    </div>

                    {overview.nodes.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/70 px-5 py-8 text-center">
                            <HardDrive size={26} className="mx-auto text-slate-400" />
                            <p className="m-0 mt-2 text-sm font-semibold text-slate-800">
                                {t('adminInfra.storage.pool.emptyTitle')}
                            </p>
                            <p className="mx-auto mb-4 mt-1 max-w-xl text-xs text-slate-500">
                                {t('adminInfra.storage.pool.emptyDetail')}
                            </p>
                            <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                onClick={() => {
                                    setEditingNode(null);
                                    setModalOpen(true);
                                }}
                                leftIcon={<Plus size={15} />}
                            >
                                {t('adminInfra.storage.pool.addFirstDriveBtn')}
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                            {overview.nodes.map(node => {
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
                                    <div
                                        key={node.id}
                                        className={cn(
                                            'flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-3.5',
                                            !node.enabled && 'bg-slate-50/70 opacity-75',
                                        )}
                                    >
                                        <div>
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <strong className="text-[14px] font-bold text-slate-900">
                                                            {node.displayName}
                                                        </strong>
                                                        <Badge variant={healthVariant} size="sm">
                                                            {!node.enabled
                                                                ? t('adminInfra.storage.pool.paused')
                                                                : t(`adminInfra.storage.pool.health.${node.healthStatus}`)}
                                                        </Badge>
                                                        <Badge variant="primary" size="sm">
                                                            {node.authType === 'OAUTH2' ? 'OAuth 2.0' : 'Service Account'}
                                                        </Badge>
                                                    </div>
                                                    <p className="m-0 mt-0.5 truncate text-xs text-slate-500">
                                                        {node.accountEmail ?? node.code} · {t('adminInfra.storage.pool.weightLabel', {weight: node.priorityWeight})}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => void handleSync(node)}
                                                        disabled={syncingId === node.id}
                                                        title={t('adminInfra.storage.pool.syncQuota')}
                                                        aria-label={t('adminInfra.storage.pool.syncQuota')}
                                                        className="h-7 w-7 px-0"
                                                    >
                                                        <RefreshCw
                                                            size={14}
                                                            className={cn(syncingId === node.id && 'animate-spin')}
                                                        />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setEditingNode(node);
                                                            setModalOpen(true);
                                                        }}
                                                        title={t('adminInfra.storage.pool.editNode')}
                                                        aria-label={t('adminInfra.storage.pool.editNode')}
                                                        className="h-7 w-7 px-0"
                                                    >
                                                        <Settings2 size={14} />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => void handleToggleEnabled(node)}
                                                        title={
                                                            node.enabled
                                                                ? t('adminInfra.storage.pool.pauseNode')
                                                                : t('adminInfra.storage.pool.resumeNode')
                                                        }
                                                        aria-label={
                                                            node.enabled
                                                                ? t('adminInfra.storage.pool.pauseNode')
                                                                : t('adminInfra.storage.pool.resumeNode')
                                                        }
                                                        className="h-7 w-7 px-0"
                                                    >
                                                        {node.enabled ? <Pause size={14} /> : <Play size={14} />}
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setRemovingNode(node)}
                                                        disabled={node.storedObjectCount > 0}
                                                        title={
                                                            node.storedObjectCount > 0
                                                                ? t('adminInfra.storage.pool.cannotRemoveNonEmpty')
                                                                : t('adminInfra.storage.pool.removeNode')
                                                        }
                                                        aria-label={t('adminInfra.storage.pool.removeNode')}
                                                        className="h-7 w-7 px-0 text-slate-500 hover:text-red-600 disabled:opacity-35"
                                                    >
                                                        <Trash2 size={14} />
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="mt-3">
                                                <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                                                    <span>
                                                        {formatBytes(node.quotaUsedBytes, formatNumber)} /{' '}
                                                        {node.quotaLimitBytes
                                                            ? formatBytes(node.quotaLimitBytes, formatNumber)
                                                            : t('adminInfra.storage.pool.unlimited')}
                                                    </span>
                                                    <span className="font-medium text-slate-800">
                                                        {node.freeBytes != null
                                                            ? t('adminInfra.storage.pool.freeLabel', {
                                                                  free: formatBytes(node.freeBytes, formatNumber),
                                                              })
                                                            : t('adminInfra.storage.pool.unlimited')}
                                                    </span>
                                                </div>
                                                <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                                    <div
                                                        className={cn(
                                                            'h-full rounded-full transition-all',
                                                            nearCap ? 'bg-amber-500' : 'bg-uav-blue',
                                                        )}
                                                        style={{width: `${pct}%`}}
                                                    />
                                                </div>
                                                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                                                    <span>
                                                        UAV-PAS: {formatNumber(node.storedObjectCount)}{' '}
                                                        {t('adminInfra.storage.pool.filesUnit')} (
                                                        {formatBytes(node.storedBytes, formatNumber)})
                                                    </span>
                                                    <span>
                                                        {t('adminInfra.storage.pool.capAt', {pct: node.maxUsagePercent})}
                                                        {node.lastCheckedAt
                                                            ? ` · ${formatDate(node.lastCheckedAt, {timeStyle: 'short'})}`
                                                            : ''}
                                                    </span>
                                                </div>
                                            </div>

                                            {node.lastError && (
                                                <p className="m-0 mt-2 rounded bg-red-50 px-2 py-1 text-[11.5px] text-red-700">
                                                    {node.lastError}
                                                </p>
                                            )}
                                        </div>

                                        <div className="mt-2.5 flex flex-wrap gap-1 border-t border-slate-100 pt-2">
                                            {node.routedModules.split(',').map(tag => {
                                                const clean = tag.trim() || 'ALL';
                                                return (
                                                    <span
                                                        key={clean}
                                                        className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600"
                                                    >
                                                        {t(`adminInfra.storage.pool.routeTag.${clean}`)}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </Panel>

            <Panel
                id="r2-to-drive-migration"
                title={t('adminInfra.storage.pool.migrationTitle')}
                icon={ArrowRightLeft}
                footer={t('adminInfra.storage.pool.migrationFooter')}
            >
                <div className="space-y-3 p-4">
                    <p className="m-0 text-[13px] text-slate-600">
                        {t('adminInfra.storage.pool.migrationIntro', {
                            count: formatNumber(overview.r2PendingObjectCount),
                            size: formatBytes(overview.r2PendingBytes, formatNumber),
                        })}
                    </p>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <FormField id="migrate-batch-size" label={t('adminInfra.storage.pool.batchSizeLabel')} optional={false}>
                            <Select
                                id="migrate-batch-size"
                                value={String(batchSize)}
                                onChange={e => setBatchSize(Number(e.target.value))}
                                className="h-10 text-[13px]"
                            >
                                {[10, 25, 50, 100].map(n => (
                                    <option key={n} value={n}>
                                        {t('adminInfra.storage.pool.batchOption', {count: n})}
                                    </option>
                                ))}
                            </Select>
                        </FormField>
                        <FormField id="migrate-target-drive" label={t('adminInfra.storage.pool.targetDriveLabel')} optional={false}>
                            <Select
                                id="migrate-target-drive"
                                value={targetNodeId}
                                onChange={e => setTargetNodeId(e.target.value)}
                                className="h-10 text-[13px]"
                            >
                                <option value="auto">{t('adminInfra.storage.pool.targetAuto')}</option>
                                {activeDrives.map(n => (
                                    <option key={n.id} value={String(n.id)}>
                                        {n.displayName} ({n.accountEmail ?? n.code})
                                    </option>
                                ))}
                            </Select>
                        </FormField>
                        <div className="flex items-end pb-1.5">
                            <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={deleteFromR2}
                                    onChange={e => setDeleteFromR2(e.target.checked)}
                                    className="h-4 w-4 rounded border-slate-300 text-uav-blue"
                                />
                                <span>{t('adminInfra.storage.pool.deleteFromR2AfterCheck')}</span>
                            </label>
                        </div>
                    </div>

                    {lastMigration && (
                        <Alert variant="success" className="py-2 text-xs">
                            {t('adminInfra.storage.pool.migrationSummaryBanner', {
                                migrated: formatNumber(lastMigration.migratedCount),
                                size: formatBytes(lastMigration.migratedBytes, formatNumber),
                                failed: formatNumber(lastMigration.failedCount),
                                remaining: formatNumber(lastMigration.remainingR2Count),
                            })}
                        </Alert>
                    )}

                    <div className="flex justify-end">
                        <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={() => void handleMigrateBatch()}
                            disabled={
                                migrateR2.isPending ||
                                activeDrives.length === 0 ||
                                overview.r2PendingObjectCount === 0
                            }
                            leftIcon={<ArrowRightLeft size={14} />}
                        >
                            {migrateR2.isPending
                                ? t('adminInfra.storage.pool.migratingBtn')
                                : t('adminInfra.storage.pool.startMigrationBtn')}
                        </Button>
                    </div>
                </div>
            </Panel>

            {modalOpen && (
                <GoogleDriveNodeModal
                    overview={overview}
                    editing={editingNode}
                    onClose={() => {
                        setModalOpen(false);
                        setEditingNode(null);
                    }}
                />
            )}

            <ConfirmDialog
                open={removingNode != null}
                title={t('adminInfra.storage.pool.removeNode')}
                description={t('adminInfra.storage.pool.confirmRemove', {
                    name: removingNode?.displayName ?? '',
                })}
                confirmLabel={t('adminInfra.storage.pool.removeNode')}
                cancelLabel={t('admin.files.cancel')}
                variant="danger"
                onConfirm={() => void confirmRemoveNode()}
                onCancel={() => setRemovingNode(null)}
            />
        </div>
    );
}
