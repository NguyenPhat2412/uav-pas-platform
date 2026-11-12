import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {
    AlertOctagon,
    AlertTriangle,
    CheckCircle2,
    Navigation,
    Play,
    ShieldCheck,
    XCircle,
} from 'lucide-react-native';
import {AppText, Button, Card, SectionTitle, TextField} from '@/components/ui';
import {canSubmitCompletion, canSubmitFailure, canSubmitReasonNote} from '@/forms/operations/field-report-form';
import {useI18n} from '@/providers/I18nContext';
import {colors, spacing} from '@/styles/tokens';

export {OperationsRehearsalSimulationCard} from './OperationsRehearsalSimulationCard';

export function OperationsLifecycleActionsCard({
    controls,
    takeoffAllowed,
    evidence,
    confirmLoading,
    acceptLoading,
    readyLoading,
    startLoading,
    rejectLoading,
    conflictLoading,
    completeLoading,
    failLoading,
    forceFailLoading,
    onConfirm,
    onAccept,
    onReady,
    onStart,
    onReject,
    onConflict,
    onComplete,
    onFail,
    onForceFail,
}: {
    controls: {
        confirm: boolean;
        reject: boolean;
        accept: boolean;
        ready: boolean;
        start: boolean;
        complete: boolean;
        fail: boolean;
        forceFail: boolean;
        conflict: boolean;
    };
    takeoffAllowed: boolean;
    evidence: { required: boolean; count: number; satisfied: boolean };
    confirmLoading: boolean;
    acceptLoading: boolean;
    readyLoading: boolean;
    startLoading: boolean;
    rejectLoading: boolean;
    conflictLoading: boolean;
    completeLoading: boolean;
    failLoading: boolean;
    forceFailLoading: boolean;
    onConfirm: () => void;
    onAccept: () => void;
    onReady: () => void;
    onStart: () => void;
    onReject: (reason: string, onDone: () => void) => void;
    onConflict: (note: string, onDone: () => void) => void;
    onComplete: (completionNote: string, equipmentCondition: string, onDone: () => void) => void;
    onFail: (failureReason: string, failureNotes: string, onDone: () => void) => void;
    onForceFail: (failureReason: string, failureNotes: string, onDone: () => void) => void;
}) {
    const {t} = useI18n();
    const [activeForm, setActiveForm] = useState<'none' | 'reject' | 'conflict' | 'complete' | 'fail' | 'forceFail'>('none');
    const [reasonText, setReasonText] = useState('');
    const [completionNote, setCompletionNote] = useState('');
    const [equipmentCondition, setEquipmentCondition] = useState('');
    const [failureReason, setFailureReason] = useState('');
    const [failureNotes, setFailureNotes] = useState('');

    return (
        <Card>
            <SectionTitle title={t('opsMissions.overview.quickActions.title')}/>

            <View style={styles.actions}>
                {controls.confirm && (
                    <Button
                        label={t('opsMissions.detail.actions.confirm')}
                        icon={CheckCircle2}
                        loading={confirmLoading}
                        onPress={onConfirm}
                        style={styles.flex}
                    />
                )}
                {controls.accept && (
                    <Button
                        label={t('opsMissions.detail.actions.accept')}
                        icon={ShieldCheck}
                        loading={acceptLoading}
                        onPress={onAccept}
                        style={styles.flex}
                    />
                )}
                {controls.ready && (
                    <Button
                        label={t('opsMissions.detail.actions.ready')}
                        icon={Navigation}
                        tone="secondary"
                        loading={readyLoading}
                        onPress={onReady}
                        style={styles.flex}
                    />
                )}
                {controls.start && (
                    <Button
                        label={t('mobile.ops.actions.startFlight')}
                        icon={Play}
                        disabled={!takeoffAllowed}
                        loading={startLoading}
                        onPress={onStart}
                        style={styles.flex}
                    />
                )}
                {controls.complete && (
                    <Button
                        label={t('opsMissions.detail.actions.complete')}
                        icon={CheckCircle2}
                        onPress={() => setActiveForm(activeForm === 'complete' ? 'none' : 'complete')}
                        style={styles.flex}
                    />
                )}
                {controls.fail && (
                    <Button
                        label={t('opsMissions.detail.actions.fail')}
                        icon={AlertOctagon}
                        tone="danger"
                        onPress={() => setActiveForm(activeForm === 'fail' ? 'none' : 'fail')}
                        style={styles.flex}
                    />
                )}
                {controls.forceFail && (
                    <Button
                        label={t('opsMissions.detail.actions.forceFail')}
                        icon={AlertOctagon}
                        tone="danger"
                        onPress={() => setActiveForm(activeForm === 'forceFail' ? 'none' : 'forceFail')}
                        style={styles.flex}
                    />
                )}
                {controls.reject && (
                    <Button
                        label={t('opsMissions.detail.actions.reject')}
                        icon={XCircle}
                        tone="danger"
                        onPress={() => setActiveForm(activeForm === 'reject' ? 'none' : 'reject')}
                        style={styles.flex}
                    />
                )}
                {controls.conflict && (
                    <Button
                        label={t('opsMissions.detail.actions.conflict')}
                        icon={AlertTriangle}
                        tone="ghost"
                        onPress={() => setActiveForm(activeForm === 'conflict' ? 'none' : 'conflict')}
                    />
                )}
            </View>

            {activeForm === 'reject' && controls.reject && (
                <View style={styles.inlineForm}>
                    <TextField label={t('opsMissions.detail.note.reason')} value={reasonText} onChangeText={setReasonText} multiline/>
                    <Button
                        label={t('opsMissions.detail.confirm.reject.submit')}
                        tone="danger"
                        disabled={!canSubmitReasonNote(reasonText)}
                        loading={rejectLoading}
                        onPress={() => onReject(reasonText, () => { setReasonText(''); setActiveForm('none'); })}
                    />
                </View>
            )}

            {activeForm === 'conflict' && controls.conflict && (
                <View style={styles.inlineForm}>
                    <TextField label={t('opsMissions.detail.note.reason')} value={reasonText} onChangeText={setReasonText} multiline/>
                    <Button
                        label={t('opsMissions.detail.confirm.conflict.submit')}
                        disabled={!canSubmitReasonNote(reasonText)}
                        loading={conflictLoading}
                        onPress={() => onConflict(reasonText, () => { setReasonText(''); setActiveForm('none'); })}
                    />
                </View>
            )}

            {activeForm === 'complete' && controls.complete && (
                <View style={styles.inlineForm}>
                    <AppText variant="small">
                        {evidence.required
                            ? t('opsMissions.detail.complete.evidenceCount', {count: evidence.count})
                            : t('opsMissions.detail.complete.evidenceOptional')}
                    </AppText>
                    <TextField label={t('opsMissions.detail.note.result')} value={completionNote} onChangeText={setCompletionNote} multiline/>
                    <TextField
                        label={t('opsMissions.detail.note.equipmentCondition')}
                        hint={t('opsMissions.detail.note.equipmentConditionHint')}
                        value={equipmentCondition}
                        onChangeText={setEquipmentCondition}
                    />
                    <Button
                        label={t('opsMissions.detail.confirm.complete.submit')}
                        icon={CheckCircle2}
                        disabled={!canSubmitCompletion(completionNote, equipmentCondition) || !evidence.satisfied}
                        loading={completeLoading}
                        onPress={() => onComplete(completionNote, equipmentCondition, () => {
                            setCompletionNote('');
                            setEquipmentCondition('');
                            setActiveForm('none');
                        })}
                    />
                </View>
            )}

            {activeForm === 'fail' && controls.fail && (
                <View style={styles.inlineForm}>
                    <TextField label={t('opsMissions.detail.note.failureReason')} value={failureReason} onChangeText={setFailureReason}/>
                    <TextField label={t('opsMissions.detail.note.incident')} value={failureNotes} onChangeText={setFailureNotes} multiline/>
                    <Button
                        label={t('opsMissions.detail.confirm.fail.submit')}
                        tone="danger"
                        disabled={!canSubmitFailure(failureReason, failureNotes)}
                        loading={failLoading}
                        onPress={() => onFail(failureReason, failureNotes, () => {
                            setFailureReason('');
                            setFailureNotes('');
                            setActiveForm('none');
                        })}
                    />
                </View>
            )}

            {activeForm === 'forceFail' && controls.forceFail && (
                <View style={styles.inlineForm}>
                    <AppText variant="small">{t('opsMissions.detail.forceFailWarning')}</AppText>
                    <TextField label={t('opsMissions.detail.note.failureReason')} value={failureReason} onChangeText={setFailureReason}/>
                    <TextField label={t('opsMissions.detail.note.incident')} value={failureNotes} onChangeText={setFailureNotes} multiline/>
                    <Button
                        label={t('opsMissions.detail.confirm.forceFail.submit')}
                        tone="danger"
                        disabled={!canSubmitFailure(failureReason, failureNotes)}
                        loading={forceFailLoading}
                        onPress={() => onForceFail(failureReason, failureNotes, () => {
                            setFailureReason('');
                            setFailureNotes('');
                            setActiveForm('none');
                        })}
                    />
                </View>
            )}
        </Card>
    );
}

const styles = StyleSheet.create({
    flex: {flex: 1},
    actions: {flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap'},
    inlineForm: {
        gap: spacing.sm,
        paddingTop: spacing.sm,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border,
    },
});
