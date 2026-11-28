'use client';

import {useEffect, useState} from 'react';
import {Cloud, FolderTree, HardDrive, Plus} from 'lucide-react';
import {Button, ConfirmDialog} from '@/components/ui';
import {QueryState} from '@/components/data/WorkspaceState';
import {formatBytes, Panel, Stat, StatGrid} from '@/components/infrastructure/runtime/InfraUi';
import {useI18n} from '@/providers/I18nContext';
import {toast} from '@/providers/ToastContext';
import {
    useDeleteDriveNode,
    useStoragePoolOverview,
    useSyncDriveNode,
    useUpdateDriveNode,
} from '@/hooks/useStoragePool';
import type {StorageDriveNode, StoragePoolOverview} from '@/types/storage-pool.types';
import {GoogleDriveNodeModal} from './GoogleDriveNodeModal';
import {StorageDriveNodeCard} from './StorageDriveNodeCard';
import {StoragePolicyFormSection} from './StoragePolicyFormSection';
import {StorageR2MigrationCard} from './StorageR2MigrationCard';

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
    const {t, formatNumber} = useI18n();
    const syncNode = useSyncDriveNode();
    const updateNode = useUpdateDriveNode();
    const deleteNode = useDeleteDriveNode();

    const [modalOpen, setModalOpen] = useState(false);
    const [editingNode, setEditingNode] = useState<StorageDriveNode | null>(null);
    const [removingNode, setRemovingNode] = useState<StorageDriveNode | null>(null);
    const [syncingId, setSyncingId] = useState<number | null>(null);

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
                <StoragePolicyFormSection overview={overview} />
            </Panel>

            <Panel
                id="drive-nodes"
                title={t('adminInfra.storage.pool.nodesPanelTitle', {count: overview.nodes.length})}
                icon={FolderTree}
            >
                <div className="p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="m-0 text-[13px] text-muted">{t('adminInfra.storage.pool.nodesIntro')}</p>
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
                        <div className="uav-bezel">
                            <div className="uav-bezel-core px-5 py-8 text-center">
                                <HardDrive size={26} className="mx-auto text-muted" />
                                <p className="m-0 mt-2 text-sm font-semibold text-on-surface">
                                    {t('adminInfra.storage.pool.emptyTitle')}
                                </p>
                                <p className="mx-auto mb-4 mt-1 max-w-xl text-xs text-muted">
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
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                            {overview.nodes.map(node => (
                                <StorageDriveNodeCard
                                    key={node.id}
                                    node={node}
                                    syncing={syncingId === node.id}
                                    onSync={item => void handleSync(item)}
                                    onEdit={item => {
                                        setEditingNode(item);
                                        setModalOpen(true);
                                    }}
                                    onToggleEnabled={item => void handleToggleEnabled(item)}
                                    onRequestRemove={setRemovingNode}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </Panel>

            <StorageR2MigrationCard overview={overview} activeDrives={activeDrives} />

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
