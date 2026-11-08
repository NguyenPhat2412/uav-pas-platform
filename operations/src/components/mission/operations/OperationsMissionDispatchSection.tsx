'use client';

import {useState} from 'react';
import {ResourceRedispatch} from '@/components/mission/ResourceRedispatch';
import {OperationsMissionUavRedispatchSection} from '@/components/mission/operations/OperationsMissionUavRedispatchSection';
import {Button, Card, CardContent, CardHeader, CardTitle, FormField, Input, Select} from '@/components/ui';
import {isValidEquipmentQuantity} from '@/forms/mission/operations-mission-form';
import type {useMissionWorkflow} from '@/hooks/mission/useMissionWorkflow';
import {useI18n} from '@/providers/I18nContext';
import type {DispatchResources, Mission} from '@/types/mission/mission.types';
import type {Equipment, Operator, Station, Uav} from '@/types/resources';
import type {missionControls} from '@/utils/mission/presentation';
import {reservationQuantity} from '@/utils/mission/workflows';

export interface OperationsMissionDispatchSectionProps {
    mission: Mission;
    dispatch: DispatchResources | null;
    stations: Station[];
    uavs: Uav[];
    equipment: Equipment[];
    operators: Operator[];
    controls: ReturnType<typeof missionControls>;
    missions: ReturnType<typeof useMissionWorkflow>;
    disabled: boolean;
    activeConfirmation: boolean;
    onOpenRedispatch: () => void;
    onAction: (run: () => Promise<Mission>) => Promise<void>;
}

export function OperationsMissionDispatchSection({
    mission,
    dispatch,
    stations,
    uavs,
    equipment,
    operators,
    controls,
    missions,
    disabled,
    activeConfirmation,
    onOpenRedispatch,
    onAction,
}: OperationsMissionDispatchSectionProps) {
    const {t} = useI18n();
    const [resourceIds, setResourceIds] = useState({station: '', uav: '', operator: '', equipment: ''});
    const [quantity, setQuantity] = useState('1');

    const selectedEquipment = equipment.find(e => String(e.id) === resourceIds.equipment);
    const validQuantity = isValidEquipmentQuantity(quantity, selectedEquipment?.availableQuantity ?? 0);

    const resources = [
        {
            key: 'station' as const,
            label: t('opsMissions.detail.resources.station'),
            placeholder: t('opsMissions.detail.resources.stationPlaceholder'),
            submitLabel: t('opsMissions.detail.resources.assignStation'),
            options: stations.filter(s => s.status === 'ACTIVE').map(s => ({id: s.id, label: `${s.name} · ${s.code}`})),
            run: () => missions.assignStation(mission.id, Number(resourceIds.station)),
        },
        {
            key: 'uav' as const,
            label: t('opsMissions.detail.resources.uav'),
            placeholder: t('opsMissions.detail.resources.uavPlaceholder'),
            submitLabel: t('opsMissions.detail.resources.assignUav'),
            options: uavs
                .filter(u => u.status === 'AVAILABLE' && (!mission.stationId || !u.stationId || u.stationId === mission.stationId))
                .map(u => ({id: u.id, label: `${u.serialNumber} · ${u.model}`})),
            run: () => missions.assignUav(mission.id, Number(resourceIds.uav)),
        },
        {
            key: 'operator' as const,
            label: t('opsMissions.detail.resources.operator'),
            placeholder: t('opsMissions.detail.resources.operatorPlaceholder'),
            submitLabel: t('opsMissions.detail.resources.assignOperator'),
            options: operators.filter(o => o.status === 'ACTIVE').map(o => ({id: o.id, label: o.fullName || o.username})),
            run: () => missions.assignOperator(mission.id, Number(resourceIds.operator)),
        },
        {
            key: 'equipment' as const,
            label: t('opsMissions.detail.resources.equipment'),
            placeholder: t('opsMissions.detail.resources.equipmentPlaceholder'),
            submitLabel: t('opsMissions.detail.resources.reserveEquipment'),
            options: equipment
                .filter(
                    e =>
                        e.status === 'ACTIVE' &&
                        e.availableQuantity > 0 &&
                        (!mission.stationId || !e.stationId || e.stationId === mission.stationId),
                )
                .map(e => ({
                    id: e.id,
                    label: t('opsMissions.detail.resources.equipmentOption', {name: e.name, count: e.availableQuantity}),
                })),
            run: () => missions.reserveEquipment(mission.id, Number(resourceIds.equipment), reservationQuantity(quantity)),
        },
    ];

    return (
        <>
            {resources.some(r => controls[r.key]) && (
                <Card className="min-w-0">
                    <CardHeader className="px-5 py-4 md:px-6 md:py-5">
                        <CardTitle className="text-lg font-bold text-foreground">
                            {t('opsMissions.detail.resources.title')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 md:p-6">
                        {resources
                            .filter(r => controls[r.key])
                            .map(r => (
                                <div key={r.key} className="grid gap-2">
                                    <FormField id={`resource-${r.key}`} label={r.label} optional={false}>
                                        <div className="flex gap-2">
                                            <Select
                                                id={`resource-${r.key}`}
                                                aria-label={r.label}
                                                disabled={disabled}
                                                value={resourceIds[r.key]}
                                                onChange={e => {
                                                    setResourceIds(v => ({...v, [r.key]: e.target.value}));
                                                    if (r.key === 'equipment') setQuantity('1');
                                                }}
                                                className="flex-1"
                                            >
                                                <option value="">{r.placeholder}</option>
                                                {r.options.map(o => (
                                                    <option key={o.id} value={o.id}>
                                                        {o.label}
                                                    </option>
                                                ))}
                                            </Select>
                                            <Button
                                                variant="outline"
                                                aria-label={r.submitLabel}
                                                disabled={
                                                    disabled ||
                                                    !r.options.some(o => String(o.id) === resourceIds[r.key]) ||
                                                    (r.key === 'equipment' && !validQuantity)
                                                }
                                                onClick={() => void onAction(r.run)}
                                            >
                                                {r.key === 'equipment'
                                                    ? t('opsMissions.detail.resources.reserve')
                                                    : t('opsMissions.detail.resources.assign')}
                                            </Button>
                                        </div>
                                    </FormField>
                                    {r.key === 'equipment' && (
                                        <Input
                                            id="resource-equipment-quantity"
                                            type="number"
                                            inputMode="numeric"
                                            step={1}
                                            optional={false}
                                            label={t('opsMissions.detail.resources.quantity')}
                                            aria-label={t('opsMissions.detail.resources.quantity')}
                                            helperText={
                                                selectedEquipment
                                                    ? t('opsMissions.detail.resources.available', {
                                                          count: selectedEquipment.availableQuantity,
                                                      })
                                                    : t('opsMissions.detail.resources.selectEquipmentFirst')
                                            }
                                            disabled={disabled || !selectedEquipment}
                                            value={quantity}
                                            onChange={e => setQuantity(e.target.value)}
                                            className="h-11 text-sm"
                                        />
                                    )}
                                </div>
                            ))}
                    </CardContent>
                </Card>
            )}

            <OperationsMissionUavRedispatchSection
                mission={mission}
                uavs={uavs}
                controls={controls}
                missions={missions}
                disabled={disabled}
                activeConfirmation={activeConfirmation}
                onOpenRedispatch={onOpenRedispatch}
                onAction={onAction}
            />

            {dispatch && (
                <ResourceRedispatch
                    snapshot={dispatch}
                    stations={stations}
                    operators={operators}
                    equipment={equipment}
                    disabled={disabled}
                    allowed={{
                        operator: controls.redispatchOperator,
                        station: controls.redispatchStation,
                        equipment: controls.redispatchEquipment,
                    }}
                    action={onAction}
                />
            )}
        </>
    );
}
