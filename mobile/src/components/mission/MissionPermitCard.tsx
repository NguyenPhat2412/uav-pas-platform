import React, {useState} from 'react';
import {Platform, StyleSheet, View} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {CheckCircle2, ExternalLink, FileCheck2, ImagePlus, Pencil, Save, XCircle} from 'lucide-react-native';
import {AppText, Badge, Button, Card, ChipGroup, SectionTitle, TextField} from '@/components/ui';
import {fromLocalIso, toLocalIso} from '@/forms/mission/mission-draft';
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
    MissionMedia,
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

function PermitDatePickerRow({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (nextLocalIso: string) => void;
}) {
    const date = fromLocalIso(value) ?? new Date();
    return (
        <View style={styles.dateRow}>
            <AppText variant="small" style={styles.strong}>{label}</AppText>
            <DateTimePicker
                value={date}
                mode="datetime"
                display={Platform.OS === 'ios' ? 'compact' : 'default'}
                minuteInterval={5}
                accentColor={colors.primary}
                onChange={(_event, selected) => {
                    if (selected) onChange(toLocalIso(selected));
                }}
            />
        </View>
    );
}

export function MissionPermitCard({
    mission,
    onUpsert,
    upsertLoading = false,
    onVerify,
    verifyLoading = false,
    allowVerify = false,
    mediaItems,
    onUploadScan,
    uploadScanLoading = false,
    onOpenScan,
}: {
    mission: Mission;
    onUpsert: (data: MissionPermitUpsertInput, onDone: () => void) => void;
    upsertLoading?: boolean;
    onVerify?: (data: MissionPermitVerifyInput, onDone: () => void) => void;
    verifyLoading?: boolean;
    allowVerify?: boolean;
    mediaItems?: readonly MissionMedia[];
    onUploadScan?: (onUploaded?: (mediaId: number) => void) => void;
    uploadScanLoading?: boolean;
    onOpenScan?: (mediaId: number) => void;
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
        const seeded = permitDraftFromMission(permit, {
            startTime: mission.startTime,
            expectedEndTime: mission.expectedEndTime,
            altitudeAglMeters: mission.flightPlan?.altitudeAglMeters ?? null,
        });
        const now = new Date();
        const fallbackFrom = seeded.validFrom || toLocalIso(now);
        const fallbackUntil = seeded.validUntil || toLocalIso(new Date(now.getTime() + 2 * 3_600_000));
        setDraft({
            ...seeded,
            validFrom: fallbackFrom,
            validUntil: fallbackUntil,
        });
        setEditing(true);
    };

    const submitDraft = () => {
        if (!canSubmitPermitDraft(draft)) return;
        onUpsert(toPermitUpsertPayload(draft), () => setEditing(false));
    };

    const attachedMediaName =
        permit?.permitMediaId != null
            ? mediaItems?.find(item => item.media.id === permit.permitMediaId)?.media.originalName ?? `#${permit.permitMediaId}`
            : null;

    const scanChipOptions = [
        {value: '', label: t('mobile.permit.noScan')},
        ...(mediaItems ?? []).map(item => ({
            value: String(item.media.id),
            label: item.media.originalName,
        })),
    ];

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
                    {attachedMediaName ? (
                        <AppText variant="small">
                            <AppText variant="small" style={styles.strong}>{t('mobile.permit.scanAttachment')}: </AppText>
                            {attachedMediaName}
                        </AppText>
                    ) : null}
                    {permit.verifiedBy ? (
                        <AppText variant="caption">
                            {t('mobile.permit.verifiedBy', {actor: permit.verifiedBy})}
                            {permit.verifiedAt ? ` · ${formatDate(permit.verifiedAt, {dateStyle: 'short', timeStyle: 'short'})}` : ''}
                        </AppText>
                    ) : null}
                    {permit.note ? <AppText variant="small">{permit.note}</AppText> : null}
                    {permit.permitMediaId != null && onOpenScan ? (
                        <Button
                            label={t('mobile.permit.openScan')}
                            icon={ExternalLink}
                            tone="secondary"
                            onPress={() => onOpenScan(permit.permitMediaId!)}
                        />
                    ) : null}
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
                    <PermitDatePickerRow
                        label={t('mobile.permit.validFrom')}
                        value={draft.validFrom}
                        onChange={validFrom => setDraft(prev => ({...prev, validFrom}))}
                    />
                    <PermitDatePickerRow
                        label={t('mobile.permit.validUntil')}
                        value={draft.validUntil}
                        onChange={validUntil => setDraft(prev => ({...prev, validUntil}))}
                    />
                    <TextField
                        label={t('mobile.permit.ceiling')}
                        placeholder="120"
                        keyboardType="numeric"
                        value={draft.maxAltitudeMeters}
                        onChangeText={maxAltitudeMeters => setDraft(prev => ({...prev, maxAltitudeMeters}))}
                    />
                    <View style={styles.scanSection}>
                        <AppText variant="small" style={styles.strong}>{t('mobile.permit.scanAttachment')}</AppText>
                        <ChipGroup
                            options={scanChipOptions}
                            value={draft.permitMediaId}
                            onChange={permitMediaId => setDraft(prev => ({...prev, permitMediaId}))}
                        />
                        {onUploadScan ? (
                            <Button
                                label={t('mobile.permit.uploadScan')}
                                icon={ImagePlus}
                                tone="secondary"
                                loading={uploadScanLoading}
                                onPress={() =>
                                    onUploadScan(mediaId => setDraft(prev => ({...prev, permitMediaId: String(mediaId)})))
                                }
                            />
                        ) : null}
                    </View>
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
    details: {gap: 6},
    strong: {fontWeight: '600', color: colors.text},
    form: {gap: spacing.sm, marginTop: spacing.xs},
    dateRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm},
    scanSection: {gap: spacing.xs},
    verifyBox: {gap: spacing.sm, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border},
    actions: {flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap'},
});
