'use client';

import React from 'react';
import {FastForward, Play} from 'lucide-react';
import {Alert, Button, Card, CardContent, FormField, Select} from '@/components/ui';
import {useI18n} from '@/providers/I18nContext';

export interface SimulationTargetCardProps {
    fleet: ReadonlyArray<{id: number; serialNumber: string; model: string}>;
    isLoadingUavs: boolean;
    uavId: number | null;
    onSelectUav: (id: number) => void;
    canViewMissions: boolean;
    missions: ReadonlyArray<{id: number; code: string; title: string}>;
    selectedMissionId: number | '';
    onSelectMission: (id: number | '') => void;
    onRehearseMission: () => void;
    canFly: boolean;
    busy: boolean;
}

/**
 * Sidebar target selector: picks the simulated aircraft from the fleet and optionally launches a one-click
 * rehearsal from an existing operational mission plan.
 */
export function SimulationTargetCard({
    fleet,
    isLoadingUavs,
    uavId,
    onSelectUav,
    canViewMissions,
    missions,
    selectedMissionId,
    onSelectMission,
    onRehearseMission,
    canFly,
    busy,
}: SimulationTargetCardProps) {
    const {t} = useI18n();

    return (
        <>
            <Card>
                <CardContent className="p-4">
                    <FormField
                        id="sim-uav"
                        label="UAV"
                        optional={false}
                        labelClassName="text-[11px] font-bold uppercase tracking-wider text-slate-500"
                    >
                        <Select
                            id="sim-uav"
                            value={uavId ?? ''}
                            onChange={e => onSelectUav(Number(e.target.value))}
                            className="h-9 text-sm"
                        >
                            {fleet.map(u => (
                                <option key={u.id} value={u.id}>
                                    {u.serialNumber} · {u.model}
                                </option>
                            ))}
                        </Select>
                    </FormField>
                    {!isLoadingUavs && !fleet.length && (
                        <Alert variant="warning" className="mt-3 px-3 py-2 text-xs">
                            {t('simulation.noUav')}
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {canViewMissions && missions.length > 0 && (
                <Card>
                    <CardContent className="space-y-2.5 p-4">
                        <FormField
                            id="sim-mission-rehearse"
                            optional={false}
                            label={
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                    <FastForward size={13} className="text-uav-blue" aria-hidden="true"/>
                                    {t('simulation.rehearseTitle')}
                                </span>
                            }
                        >
                            <Select
                                id="sim-mission-rehearse"
                                value={selectedMissionId}
                                onChange={e => onSelectMission(e.target.value ? Number(e.target.value) : '')}
                                className="h-9 text-xs"
                            >
                                <option value="">{t('simulation.rehearseSelectPlaceholder')}</option>
                                {missions.map(m => (
                                    <option key={m.id} value={m.id}>
                                        {m.code} · {m.title}
                                    </option>
                                ))}
                            </Select>
                        </FormField>
                        <Button
                            type="button"
                            size="sm"
                            variant="primary"
                            onClick={onRehearseMission}
                            disabled={!canFly || selectedMissionId === '' || busy}
                            leftIcon={<Play size={14} aria-hidden="true"/>}
                            className="w-full bg-uav-blue text-xs font-bold hover:bg-uav-blue-hover"
                        >
                            {t('simulation.rehearseAction')}
                        </Button>
                    </CardContent>
                </Card>
            )}
        </>
    );
}
