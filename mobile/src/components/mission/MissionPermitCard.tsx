import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {CheckCircle2, FileCheck2, Pencil, Save, XCircle} from 'lucide-react-native';
import {AppText, Badge, Button, Card, SectionTitle, TextField} from '@/components/ui';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {
    canEditMissionPermit,
    canSubmitPermitDraft,
    canVerifyMissionPermit,
    effectivePermitStatus,
    permitDraftFromMission,
    toPermitUpsertPayload,
    toPermitVerifyPayload,
    type PermitDraft,
} from '@/shared/forms/mission/permit-form';
import type {
    FlightPermitStatus,
    Mission,
    MissionPermitUpsertInput,
    MissionPermitVerifyInput,
} from '@/shared/types/mission/mission.types';
import {colors, spacing} from '@/styles/tokens';

function permitStatusTone(status: FlightPermitStatus): { background: string; color: string } {
    switch (status) {
        case 'VERIFIED':
            return {background: colors.slateDark, color: colors.white};
        case 'SUBMITTED':
        case 'PENDING':
            return {background: colors.warningLight, color: colors.warning};
        case 'REJECTED':
            return {background: colors.dangerLight, color: colors.danger};
        default:
            return {background: colors.slateLight, color: colors.textSecondary};
    }
}

export function PermitStatusBadge({status}: { status: FlightPermitStatus }) {
    const {t} = useI18n();
    const tone = permitStatusTone(status);
    const labelMap: Record<FlightPermitStatus, string> = {
        NOT_REQUIRED: t('mobile.permit.status.NOT_REQUIRED'),
        PENDING: t('mobile.permit.status.PENDING'),
        SUBMITTED: t('mobile.permit.status.SUBMITTED'),
        VERIFIED: t('mobile.permit.status.VERIFIED'),
        REJECTED: t('mobile.permit.status.REJECTED'),
    };
    return <Badge label={labelMap[status]} background={tone.background} color={tone.color}/>;
}

export function MissionPermitCard({
    mission,
    onUpsert,
    upsertLoading = false,
    onVerify,
    verifyLoading = false,
    allowVerify = false,
}: {
    mission: Mission;
    onUpsert: (data: MissionPermitUpsertInput, onDone: () => void) => void;
    upsertLoading?: boolean;
    onVerify?: (data: MissionPermitVerifyInput, onDone: () => void) => void;
    verifyLoading?: boolean;
    allowVerify?: boolean;
}) {
    const {t, formatDate} = useI18n();
    const {user, can} = useAuth();
    const permit = mission.permit;
    const status = effectivePermitStatus(permit);
    const editable = canEditMissionPermit(mission, user?.id, can('MISSION_CONFIRM'), can('USER_MANAGE'));
    const verifiable = allowVerify && !!onVerify && canVerifyMissionPermit(mission, can('MISSION_CONFIRM'));

    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState<PermitDraft>(() =>
        permitDraftFromMission(permit, {
            startTime: mission.startTime,
            expectedEndTime: mission.expectedEndTime,
            altitudeAglMeters: mission.flightPlan?.altitudeAglMeters ?? null,
        }),
    );
    const [verifyNote, setVerifyNote] = useState('');

    const startEdit = () => {
        setDraft(
            permitDraftFromMission(permit, {
                startTime: mission.startTime,
                expectedEndTime: mission.expectedEndTime,
                altitudeAglMeters: mission.flightPlan?.altitudeAglMeters ?? null,
            }),
        );
        setEditing(true);
    };

    const submitDraft = () => {
        if (!canSubmitPermitDraft(draft)) return;
        onUpsert(toPermitUpsertPayload(draft), () => setEditing(false));
    };

    return (
        <Card>
            <SectionTitle title={t('mobile.permit.title')} action={<PermitStatusBadge status={status}/>}/>

            {permit?.permitNumber ? (
                <View style={styles.details}>
                    <AppText variant="small">
                        <AppText variant="small" style={styles.strong}>{t('mobile.permit.number')}: </AppText>
                        {permit.permitNumber}
                    </AppText>
                    {permit.permitAuthority ? (
                        <AppText variant="small">
                            <AppText variant="small" style={styles.strong}>{t('mobile.permit.authority')}: </AppText>
                            {permit.permitAuthority}
                        </AppText>
                    ) : null}
                    {permit.validFrom && permit.validUntil ? (
                        <AppText variant="small">
                            <AppText variant="small" style={styles.strong}>{t('mobile.permit.validity')}: </AppText>
                            {formatDate(permit.validFrom, {dateStyle: 'short', timeStyle: 'short'})} →{' '}
                            {formatDate(permit.validUntil, {dateStyle: 'short', timeStyle: 'short'})}
                        </AppText>
                    ) : null}
                    {permit.maxAltitudeMeters != null ? (
                        <AppText variant="small">
                            <AppText variant="small" style={styles.strong}>{t('mobile.permit.ceiling')}: </AppText>
                            {permit.maxAltitudeMeters} m AGL
                        </AppText>
                    ) : null}
                    {permit.verifiedBy ? (
                        <AppText variant="caption">
                            {t('mobile.permit.verifiedBy', {actor: permit.verifiedBy})}
                            {permit.verifiedAt ? ` · ${formatDate(permit.verifiedAt, {dateStyle: 'short', timeStyle: 'short'})}` : ''}
                        </AppText>
                    ) : null}
                    {permit.note ? <AppText variant="small">{permit.note}</AppText> : null}
                </View>
            ) : (
                <AppText variant="small">{t('mobile.permit.emptyHint')}</AppText>
            )}

            {editable && !editing && (
                <Button
                    label={permit?.permitNumber ? t('mobile.permit.updateAction') : t('mobile.permit.submitAction')}
                    icon={permit?.permitNumber ? Pencil : FileCheck2}
                    tone="secondary"
                    onPress={startEdit}
                />
            )}

            {editable && editing && (
                <View style={styles.form}>
                    <TextField
                        label={t('mobile.permit.number')}
                        value={draft.permitNumber}
                        onChangeText={permitNumber => setDraft(prev => ({...prev, permitNumber}))}
                        autoCapitalize="characters"
                    />
                    <TextField
                        label={t('mobile.permit.authority')}
                        value={draft.permitAuthority}
                        onChangeText={permitAuthority => setDraft(prev => ({...prev, permitAuthority}))}
                    />
                    <TextField
                        label={t('mobile.permit.validFrom')}
                        placeholder="YYYY-MM-DDTHH:mm"
                        value={draft.validFrom}
                        onChangeText={validFrom => setDraft(prev => ({...prev, validFrom}))}
                        autoCapitalize="none"
                    />
                    <TextField
                        label={t('mobile.permit.validUntil')}
                        placeholder="YYYY-MM-DDTHH:mm"
                        value={draft.validUntil}
                        onChangeText={validUntil => setDraft(prev => ({...prev, validUntil}))}
                        autoCapitalize="none"
                    />
                    <TextField
                        label={t('mobile.permit.ceiling')}
                        placeholder="120"
                        keyboardType="numeric"
                        value={draft.maxAltitudeMeters}
                        onChangeText={maxAltitudeMeters => setDraft(prev => ({...prev, maxAltitudeMeters}))}
                    />
                    <TextField
                        label={t('mobile.permit.note')}
                        value={draft.note}
                        onChangeText={note => setDraft(prev => ({...prev, note}))}
                        multiline
                    />
                    <View style={styles.actions}>
                        <Button
                            label={t('mobile.permit.saveAction')}
                            icon={Save}
                            loading={upsertLoading}
                            disabled={!canSubmitPermitDraft(draft)}
                            onPress={submitDraft}
                            style={styles.flex}
                        />
                        <Button label={t('common.cancel')} tone="ghost" onPress={() => setEditing(false)}/>
                    </View>
                </View>
            )}

            {verifiable && !editing && (
                <View style={styles.verifyBox}>
                    <TextField
                        label={t('mobile.permit.verifyNoteLabel')}
                        value={verifyNote}
                        onChangeText={setVerifyNote}
                    />
                    <View style={styles.actions}>
                        <Button
                            label={t('mobile.permit.approveAction')}
                            icon={CheckCircle2}
                            loading={verifyLoading}
                            onPress={() => onVerify?.(toPermitVerifyPayload(true, verifyNote), () => setVerifyNote(''))}
                            style={styles.flex}
                        />
                        <Button
                            label={t('mobile.permit.rejectAction')}
                            icon={XCircle}
                            tone="danger"
                            loading={verifyLoading}
                            onPress={() => onVerify?.(toPermitVerifyPayload(false, verifyNote), () => setVerifyNote(''))}
                            style={styles.flex}
                        />
                    </View>
                </View>
            )}
        </Card>
    );
}

const styles = StyleSheet.create({
    flex: {flex: 1},
    details: {gap: 4},
    strong: {fontWeight: '600', color: colors.text},
    form: {gap: spacing.sm, marginTop: spacing.xs},
    verifyBox: {gap: spacing.sm, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border},
    actions: {flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap'},
});
