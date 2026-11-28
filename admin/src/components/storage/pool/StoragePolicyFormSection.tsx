'use client';

import {useState} from 'react';
import {Sliders} from 'lucide-react';
import {Button, FormField, Input, Select} from '@/components/ui';
import {useI18n} from '@/providers/I18nContext';
import {toast} from '@/providers/ToastContext';
import {useUpdateStoragePolicy} from '@/hooks/useStoragePool';
import {
    buildStoragePolicyInput,
    STORAGE_BACKEND_MODES,
    STORAGE_STRATEGIES,
} from '@/forms/storage-pool-form';
import type {
    DriveAllocationStrategy,
    StorageBackendMode,
    StoragePoolOverview,
} from '@/types/storage-pool.types';

export function StoragePolicyFormSection({overview}: { overview: StoragePoolOverview }) {
    const {t} = useI18n();
    const updatePolicy = useUpdateStoragePolicy();

    const [primaryBackend, setPrimaryBackend] = useState<StorageBackendMode>(overview.primaryBackend);
    const [strategy, setStrategy] = useState<DriveAllocationStrategy>(overview.allocationStrategy);
    const [fallbackToR2, setFallbackToR2] = useState<boolean>(overview.fallbackToR2);
    const [tieredMb, setTieredMb] = useState<string>(
        String(Math.max(1, Math.round(overview.tieredSmallFileMaxBytes / (1024 * 1024)))),
    );

    const savePolicy = async () => {
        try {
            await updatePolicy.mutateAsync(
                buildStoragePolicyInput({
                    primaryBackend,
                    allocationStrategy: strategy,
                    fallbackToR2,
                    tieredMb,
                }),
            );
            toast.success(t('adminInfra.storage.pool.policySaved'));
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t('adminInfra.storage.pool.actionFailed'));
        }
    };

    return (
        <div className="border-t border-slate-100 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-muted">
                <Sliders size={14} />
                <span>{t('adminInfra.storage.pool.policyHeader')}</span>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <FormField id="pool-primary-backend" label={t('adminInfra.storage.pool.primaryBackendLabel')} required>
                    <Select
                        id="pool-primary-backend"
                        value={primaryBackend}
                        onChange={e => setPrimaryBackend(e.target.value as StorageBackendMode)}
                        className="h-10 text-[13px]"
                    >
                        {STORAGE_BACKEND_MODES.map(mode => (
                            <option key={mode} value={mode}>
                                {t(`adminInfra.storage.pool.mode.${mode}`)}
                            </option>
                        ))}
                    </Select>
                </FormField>
                <FormField id="pool-allocation-strategy" label={t('adminInfra.storage.pool.strategyLabel')} required>
                    <Select
                        id="pool-allocation-strategy"
                        value={strategy}
                        onChange={e => setStrategy(e.target.value as DriveAllocationStrategy)}
                        className="h-10 text-[13px]"
                    >
                        {STORAGE_STRATEGIES.map(item => (
                            <option key={item} value={item}>
                                {t(`adminInfra.storage.pool.strategy.${item}`)}
                            </option>
                        ))}
                    </Select>
                </FormField>
                {primaryBackend === 'HYBRID_TIERED' ? (
                    <FormField id="pool-tiered-mb" label={t('adminInfra.storage.pool.tieredMbLabel')} required>
                        <Input
                            id="pool-tiered-mb"
                            type="number"
                            min={1}
                            max={100}
                            value={tieredMb}
                            onChange={e => setTieredMb(e.target.value)}
                            className="h-10 text-[13px] tabular-nums"
                        />
                    </FormField>
                ) : (
                    <div className="flex items-end pb-1.5">
                        <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-on-surface">
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
                <label className="mt-2.5 inline-flex cursor-pointer items-center gap-2 text-[13px] text-on-surface">
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
    );
}
