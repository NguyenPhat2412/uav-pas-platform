'use client';

import {useState} from 'react';
import {ArrowRightLeft} from 'lucide-react';
import {Alert, Button, FormField, Select} from '@/components/ui';
import {formatBytes, Panel} from '@/components/infrastructure/runtime/InfraUi';
import {useI18n} from '@/providers/I18nContext';
import {toast} from '@/providers/ToastContext';
import {useMigrateR2Batch} from '@/hooks/storage/useStoragePool';
import {buildStorageR2MigrationInput} from '@/forms/storage/storage-pool-form';
import type {
    StorageDriveNode,
    StoragePoolOverview,
    StorageR2MigrationResult,
} from '@/types/storage/storage-pool.types';

export function StorageR2MigrationCard({
    overview,
    activeDrives,
}: {
    overview: StoragePoolOverview;
    activeDrives: StorageDriveNode[];
}) {
    const {t, formatNumber} = useI18n();
    const migrateR2 = useMigrateR2Batch();

    const [batchSize, setBatchSize] = useState<number>(25);
    const [targetNodeId, setTargetNodeId] = useState<string>('auto');
    const [deleteFromR2, setDeleteFromR2] = useState<boolean>(false);
    const [lastMigration, setLastMigration] = useState<StorageR2MigrationResult | null>(null);

    const handleMigrateBatch = async () => {
        try {
            const res = await migrateR2.mutateAsync(
                buildStorageR2MigrationInput({
                    batchSize,
                    deleteFromR2,
                    targetNodeId,
                }),
            );
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

    return (
        <Panel
            id="r2-to-drive-migration"
            title={t('adminInfra.storage.pool.migrationTitle')}
            icon={ArrowRightLeft}
            footer={t('adminInfra.storage.pool.migrationFooter')}
        >
            <div className="space-y-3 p-4">
                <p className="m-0 text-[13px] text-muted tabular-nums">
                    {t('adminInfra.storage.pool.migrationIntro', {
                        count: formatNumber(overview.r2PendingObjectCount),
                        size: formatBytes(overview.r2PendingBytes, formatNumber),
                    })}
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <FormField id="migrate-batch-size" label={t('adminInfra.storage.pool.batchSizeLabel')} required>
                        <Select
                            id="migrate-batch-size"
                            value={String(batchSize)}
                            onChange={e => setBatchSize(Number(e.target.value))}
                            className="h-10 text-[13px] tabular-nums"
                        >
                            {[10, 25, 50, 100].map(n => (
                                <option key={n} value={n}>
                                    {t('adminInfra.storage.pool.batchOption', {count: n})}
                                </option>
                            ))}
                        </Select>
                    </FormField>
                    <FormField id="migrate-target-drive" label={t('adminInfra.storage.pool.targetDriveLabel')} optional>
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
                        <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-on-surface">
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
                    <Alert variant="success" className="py-2 text-xs tabular-nums">
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
    );
}
