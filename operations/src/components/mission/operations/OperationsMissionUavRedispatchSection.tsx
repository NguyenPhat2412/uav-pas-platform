'use client';

import {useState} from 'react';
import {Button, Card, CardContent, CardHeader, CardTitle, Select, Textarea} from '@/components/ui';
import {canSubmitUavRedispatch} from '@/forms/mission/operations-mission-form';
import type {useMissionWorkflow} from '@/hooks/mission/useMissionWorkflow';
import {useI18n} from '@/providers/I18nContext';
import type {Mission} from '@/types/mission/mission.types';
import type {Uav} from '@/types/resources';
import type {missionControls} from '@/utils/mission/presentation';

export interface OperationsMissionUavRedispatchSectionProps {
    mission: Mission;
    uavs: Uav[];
    controls: ReturnType<typeof missionControls>;
    missions: ReturnType<typeof useMissionWorkflow>;
    disabled: boolean;
    activeConfirmation: boolean;
    onOpenRedispatch: () => void;
    onAction: (run: () => Promise<Mission>) => Promise<void>;
}

export function OperationsMissionUavRedispatchSection({
    mission,
    uavs,
    controls,
    missions,
    disabled,
    activeConfirmation,
    onOpenRedispatch,
    onAction,
}: OperationsMissionUavRedispatchSectionProps) {
    const {t} = useI18n();
    const [redispatch, setRedispatch] = useState<{
        kind: 'replaceUav' | 'unassignUav';
        expectedCurrentUavId: number;
    } | null>(null);
    const [redispatchReason, setRedispatchReason] = useState('');
    const [replacementUavId, setReplacementUavId] = useState('');

    if (!controls.replaceUav && !controls.unassignUav) return null;

    const effectiveRedispatch = activeConfirmation ? null : redispatch;
    const assignedUav = uavs.find(u => u.id === mission.uavId);
    const replacementUavs = uavs.filter(
        uav =>
            uav.id !== mission.uavId &&
            uav.status === 'AVAILABLE' &&
            (!mission.stationId || !uav.stationId || uav.stationId === mission.stationId),
    );

    const openRedispatch = (kind: 'replaceUav' | 'unassignUav') => {
        if (!mission.uavId || !controls[kind] || disabled) return;
        onOpenRedispatch();
        setRedispatch({kind, expectedCurrentUavId: mission.uavId});
        setRedispatchReason('');
        setReplacementUavId('');
    };

    return (
        <Card className="min-w-0" role="region" aria-labelledby="redispatch-title">
            <CardHeader className="px-5 py-4 md:px-6 md:py-5">
                <CardTitle id="redispatch-title" className="text-lg font-bold text-foreground">
                    {t('opsMissions.detail.uav.title')}
                </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 p-5 md:p-6">
                <p className="m-0 text-sm leading-relaxed text-muted">
                    {t('opsMissions.detail.uav.description')}
                </p>

                {!effectiveRedispatch && (
                    <div className="flex flex-wrap items-center gap-2.5">
                        <Button disabled={disabled} variant="outline" onClick={() => openRedispatch('replaceUav')}>
                            {t('opsMissions.detail.uav.replace')}
                        </Button>
                        <Button disabled={disabled} variant="outline" onClick={() => openRedispatch('unassignUav')}>
                            {t('opsMissions.detail.uav.unassign')}
                        </Button>
                    </div>
                )}

                {effectiveRedispatch && controls[effectiveRedispatch.kind] && (
                    <Card variant="surface" className="mt-1 bg-background p-4 md:p-5">
                        <form
                            className="grid gap-3"
                            aria-label={
                                effectiveRedispatch.kind === 'replaceUav'
                                    ? t('opsMissions.detail.uav.replaceForm')
                                    : t('opsMissions.detail.uav.unassignForm')
                            }
                            onSubmit={event => {
                                event.preventDefault();
                                if (
                                    !canSubmitUavRedispatch(
                                        effectiveRedispatch.kind,
                                        redispatchReason,
                                        replacementUavId,
                                        replacementUavs.map(uav => uav.id),
                                    )
                                ) {
                                    return;
                                }
                                const currentKind = effectiveRedispatch.kind;
                                const expectedId = effectiveRedispatch.expectedCurrentUavId;
                                void onAction(() =>
                                    currentKind === 'replaceUav'
                                        ? missions.replaceUav(
                                              mission.id,
                                              expectedId,
                                              Number(replacementUavId),
                                              redispatchReason,
                                          )
                                        : missions.unassignUav(mission.id, expectedId, redispatchReason),
                                ).finally(() => setRedispatch(null));
                            }}
                        >
                            <strong>
                                {effectiveRedispatch.kind === 'replaceUav'
                                    ? t('opsMissions.detail.uav.confirmReplace')
                                    : t('opsMissions.detail.uav.confirmUnassign')}
                            </strong>
                            <p className="m-0 text-sm leading-relaxed text-muted">
                                {t('opsMissions.detail.uav.current', {
                                    uav: assignedUav?.serialNumber || `#${effectiveRedispatch.expectedCurrentUavId}`,
                                })}{' '}
                                {effectiveRedispatch.kind === 'replaceUav'
                                    ? t('opsMissions.detail.uav.replaceHint')
                                    : t('opsMissions.detail.uav.unassignHint')}
                            </p>

                            {effectiveRedispatch.kind === 'replaceUav' && (
                                <Select
                                    id="redispatch-replacement-uav"
                                    autoFocus
                                    required
                                    label={t('opsMissions.detail.uav.replacement')}
                                    aria-label={t('opsMissions.detail.uav.replacement')}
                                    helperText={!replacementUavs.length ? t('opsMissions.detail.uav.noReplacement') : undefined}
                                    disabled={disabled}
                                    value={replacementUavId}
                                    onChange={e => setReplacementUavId(e.target.value)}
                                >
                                    <option value="">{t('opsMissions.detail.uav.replacementPlaceholder')}</option>
                                    {replacementUavs.map(uav => (
                                        <option key={uav.id} value={uav.id}>
                                            {uav.serialNumber} · {uav.model}
                                        </option>
                                    ))}
                                </Select>
                            )}

                            <Textarea
                                id="redispatch-uav-reason"
                                autoFocus={effectiveRedispatch.kind === 'unassignUav'}
                                required
                                label={t('opsMissions.detail.uav.reason')}
                                helperText={t('opsMissions.detail.uav.reasonHint', {count: 500})}
                                disabled={disabled}
                                value={redispatchReason}
                                onChange={e => setRedispatchReason(e.target.value)}
                            />

                            <div className="flex flex-wrap items-center gap-2.5">
                                <Button type="button" disabled={disabled} variant="outline" onClick={() => setRedispatch(null)}>
                                    {t('opsMissions.detail.uav.keep')}
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={
                                        disabled ||
                                        !canSubmitUavRedispatch(
                                            effectiveRedispatch.kind,
                                            redispatchReason,
                                            replacementUavId,
                                            replacementUavs.map(uav => uav.id),
                                        )
                                    }
                                >
                                    {effectiveRedispatch.kind === 'replaceUav'
                                        ? t('opsMissions.detail.uav.confirmReplace')
                                        : t('opsMissions.detail.uav.confirmUnassign')}
                                </Button>
                            </div>
                        </form>
                    </Card>
                )}
            </CardContent>
        </Card>
    );
}
