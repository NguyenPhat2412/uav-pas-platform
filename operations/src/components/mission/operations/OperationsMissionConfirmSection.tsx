'use client';

import {useState} from 'react';
import {Button, Card, Textarea} from '@/components/ui';
import {canSubmitMissionConfirmation} from '@/forms/mission/operations-mission-form';
import type {useMissionWorkflow} from '@/hooks/mission/useMissionWorkflow';
import {useI18n} from '@/providers/I18nContext';
import type {Mission, MissionConfirmationKind} from '@/types/mission/mission.types';

export interface OperationsMissionConfirmSectionProps {
    missionId: number;
    missions: ReturnType<typeof useMissionWorkflow>;
    confirmation: MissionConfirmationKind;
    disabled: boolean;
    evidence: {
        required: boolean;
        count: number;
        satisfied: boolean;
    };
    evidenceKnown: boolean;
    canFinish: boolean;
    onCancel: () => void;
    onAction: (run: () => Promise<Mission>) => Promise<void>;
}

export function OperationsMissionConfirmSection({
    missionId,
    missions,
    confirmation,
    disabled,
    evidence,
    evidenceKnown,
    canFinish,
    onCancel,
    onAction,
}: OperationsMissionConfirmSectionProps) {
    const {t} = useI18n();
    const [note, setNote] = useState('');
    const [extraNote, setExtraNote] = useState('');

    const noteLabel =
        confirmation === 'complete'
            ? t('opsMissions.detail.note.result')
            : confirmation === 'fail' || confirmation === 'forceFail'
              ? t('opsMissions.detail.note.failureReason')
              : t('opsMissions.detail.note.reason');

    const submitConfirmation = () => {
        if (!canSubmitMissionConfirmation(confirmation, note, extraNote, canFinish)) return;
        const runners = {
            reject: () => missions.reject(missionId, note.trim()),
            conflict: () => missions.reportConflict(missionId, note.trim()),
            complete: () => missions.complete(missionId, note, extraNote),
            cancel: () => missions.cancel(missionId),
            fail: () => missions.fail(missionId, note, extraNote),
            forceFail: () => missions.forceFail(missionId, note, extraNote),
        };
        void onAction(runners[confirmation]);
    };

    return (
        <Card className="bg-background p-4 md:p-5">
            <form
                className="grid gap-3"
                aria-label={t(`opsMissions.detail.confirm.${confirmation}.title`)}
                onSubmit={e => {
                    e.preventDefault();
                    submitConfirmation();
                }}
            >
                <strong>{t(`opsMissions.detail.confirm.${confirmation}.title`)}</strong>

                {confirmation === 'complete' && (
                    <div role="status" className="grid gap-1.5 text-sm text-foreground">
                        <p className="m-0">
                            {evidence.required
                                ? evidenceKnown
                                    ? t('opsMissions.detail.complete.evidenceCount', {count: evidence.count})
                                    : t('opsMissions.detail.complete.evidenceUnknown')
                                : t('opsMissions.detail.complete.evidenceOptional')}
                        </p>
                        {!canFinish && (
                            <a href="#media" className="font-semibold text-primary hover:underline">
                                {t('opsMissions.detail.complete.goToMedia')}
                            </a>
                        )}
                        <p className="m-0 text-sm leading-relaxed text-muted">
                            {t('opsMissions.detail.complete.warning')}
                        </p>
                    </div>
                )}

                {confirmation === 'cancel' ? (
                    <p className="m-0 text-sm leading-relaxed text-muted">
                        {t('opsMissions.detail.cancelWarning')}
                    </p>
                ) : (
                    <>
                        {confirmation === 'fail' && (
                            <p className="m-0 text-sm leading-relaxed text-muted">
                                {t('opsMissions.detail.failWarning')}
                            </p>
                        )}
                        {confirmation === 'forceFail' && (
                            <p className="m-0 text-sm leading-relaxed text-muted">
                                {t('opsMissions.detail.forceFailWarning')}
                            </p>
                        )}

                        <Textarea
                            id="mission-confirm-note"
                            autoFocus
                            required
                            label={noteLabel}
                            helperText={t('opsMissions.detail.note.maxLength', {count: 500})}
                            disabled={disabled}
                            value={note}
                            onChange={e => setNote(e.target.value)}
                        />

                        {(confirmation === 'fail' || confirmation === 'forceFail') && (
                            <Textarea
                                id="mission-confirm-incident"
                                optional={false}
                                label={t('opsMissions.detail.note.incident')}
                                disabled={disabled}
                                value={extraNote}
                                onChange={e => setExtraNote(e.target.value)}
                            />
                        )}

                        {confirmation === 'complete' && (
                            <Textarea
                                id="mission-confirm-equipment-condition"
                                required
                                label={t('opsMissions.detail.note.equipmentCondition')}
                                aria-label={t('opsMissions.detail.note.equipmentCondition')}
                                helperText={t('opsMissions.detail.note.equipmentConditionHint')}
                                disabled={disabled}
                                value={extraNote}
                                onChange={e => setExtraNote(e.target.value)}
                            />
                        )}
                    </>
                )}

                <div className="flex flex-wrap items-center gap-2.5">
                    <Button type="button" variant="outline" disabled={disabled} onClick={onCancel}>
                        {t('opsMissions.detail.backAction')}
                    </Button>
                    <Button
                        type="submit"
                        variant={confirmation === 'fail' || confirmation === 'forceFail' ? 'danger' : 'primary'}
                        disabled={disabled || !canSubmitMissionConfirmation(confirmation, note, extraNote, canFinish)}
                    >
                        {t(`opsMissions.detail.confirm.${confirmation}.submit`)}
                    </Button>
                </div>
            </form>
        </Card>
    );
}
