'use client';

import Link from 'next/link';
import {FileCheck2, FileUp, Gamepad2, PackageCheck} from 'lucide-react';
import {Button, OptionalMark, RequiredMark} from '@/components/ui';
import {useI18n} from '@/providers/I18nContext';
import type {Mission} from '@/types/mission.types';
import {MEDIA_ACCEPT} from '@/utils/media-policy';

const INPUT_CLASS =
    'h-10 w-full rounded-control border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 outline-none focus:border-primary';

interface ProviderOrderInFlightSectionProps {
    mission: Mission;
    uploading: boolean;
    completing: boolean;
    uploadedNames: string[];
    handoverNote: string;
    equipmentCondition: string;
    onHandoverNoteChange: (value: string) => void;
    onEquipmentConditionChange: (value: string) => void;
    onUploadDeliverable: (file: File) => void;
    onComplete: () => void;
}

export function ProviderOrderInFlightSection({
    mission,
    uploading,
    completing,
    uploadedNames,
    handoverNote,
    equipmentCondition,
    onHandoverNoteChange,
    onEquipmentConditionChange,
    onUploadDeliverable,
    onComplete,
}: ProviderOrderInFlightSectionProps) {
    const {t} = useI18n();

    return (
        <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    <Link
                        href={`/operations/simulation?missionId=${mission.id}${mission.uavId ? `&uavId=${mission.uavId}` : ''}`}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-control bg-slate-900 px-4 text-xs font-semibold whitespace-nowrap text-white hover:bg-slate-800"
                    >
                        <Gamepad2 size={15} aria-hidden="true"/>
                        {t('opsMarketplace.orders.card.openSimulation')}
                    </Link>
                    <label className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-control border border-dashed border-primary bg-uav-red-light/60 px-3.5 text-xs font-semibold whitespace-nowrap text-primary hover:bg-uav-red-light">
                        <FileUp size={15} aria-hidden="true"/>
                        <span>
                            {uploading
                                ? t('opsMarketplace.pilotToday.uploading')
                                : t('opsMarketplace.pilotToday.uploadDeliverable')}
                        </span>
                        <input
                            type="file"
                            accept={MEDIA_ACCEPT}
                            className="sr-only"
                            disabled={uploading}
                            onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) onUploadDeliverable(file);
                                e.target.value = '';
                            }}
                        />
                    </label>
                </div>
                <Link
                    href={`/operations/missions/${mission.id}`}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-control border border-slate-200 bg-white px-3.5 text-xs font-semibold whitespace-nowrap text-slate-700 hover:border-primary hover:text-primary"
                >
                    <FileCheck2 size={15} aria-hidden="true"/>
                    {t('opsMarketplace.orders.card.openDetail')}
                </Link>
            </div>

            {uploadedNames.length > 0 && (
                <div className="text-xs font-semibold text-slate-700">
                    {t('opsMarketplace.pilotToday.uploadedFiles', {count: uploadedNames.length})}:{' '}
                    {uploadedNames.join(', ')}
                </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                    <span>
                        {t('opsMarketplace.orders.card.handoverNote')}
                        <RequiredMark/>
                    </span>
                    <input
                        className={INPUT_CLASS}
                        value={handoverNote}
                        onChange={e => onHandoverNoteChange(e.target.value)}
                        placeholder={t('opsMarketplace.orders.card.handoverPlaceholder')}
                    />
                </label>

                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                    <span>
                        {t('opsMarketplace.orders.card.equipmentCondition')}
                        <OptionalMark/>
                    </span>
                    <input
                        className={INPUT_CLASS}
                        value={equipmentCondition}
                        onChange={e => onEquipmentConditionChange(e.target.value)}
                    />
                </label>
            </div>

            <div className="flex justify-end">
                <Button
                    type="button"
                    disabled={completing}
                    onClick={onComplete}
                    className="min-h-11 whitespace-nowrap"
                >
                    <PackageCheck size={15} className="mr-1.5 inline" aria-hidden="true"/>
                    {t('opsMarketplace.orders.card.completeOrder')}
                </Button>
            </div>
        </div>
    );
}
