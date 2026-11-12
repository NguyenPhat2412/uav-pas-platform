import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {
    CheckCircle2,
    CheckSquare,
    ShieldAlert,
    ShieldCheck,
    Square,
} from 'lucide-react-native';
import {AppText, Badge, Button, Card, SectionTitle} from '@/components/ui';
import {
    canTakeoffMission,
    PREFLIGHT_CHECKLIST_KEYS,
    preflightProgressCount,
    type PreflightChecklistKey,
    type PreflightChecklistState,
} from '@/forms/operations/preflight-checklist';
import {useI18n} from '@/providers/I18nContext';
import {missionFormError} from '@/shared/forms/mission/mission-form';
import type {AirspaceClearance} from '@/shared/types/airspace/airspace.types';
import type {Mission, MissionPreflight} from '@/shared/types/mission/mission.types';
import {colors, radius, spacing} from '@/styles/tokens';

export {OperationsDispatchResourceCard} from './OperationsDispatchResourceCard';

export function opsErrorMessage(error: unknown, t: (key: string) => string): string {
    const code = (error as { code?: string } | null)?.code;
    if (code) {
        const key = `opsMissions.apiErrors.${code}`;
        const translated = t(key);
        if (translated !== key) return translated;
    }
    return missionFormError(error, t);
}

export function AirspaceBadge({clearance}: { clearance: AirspaceClearance }) {
    const {t} = useI18n();
    const labelMap: Record<AirspaceClearance, string> = {
        CLEAR: t('mobile.airspace.clearance.CLEAR'),
        CAUTION: t('mobile.airspace.clearance.CAUTION'),
        PERMIT_REQUIRED: t('mobile.airspace.clearance.PERMIT_REQUIRED'),
        BLOCKED: t('mobile.airspace.clearance.BLOCKED'),
    };
    const isDanger = clearance === 'BLOCKED';
    const isWarn = clearance === 'CAUTION' || clearance === 'PERMIT_REQUIRED';
    return (
        <Badge
            icon={isDanger || isWarn ? ShieldAlert : ShieldCheck}
            label={labelMap[clearance]}
            background={isDanger ? colors.dangerLight : isWarn ? colors.warningLight : colors.slateLight}
            color={isDanger ? colors.danger : isWarn ? colors.warning : colors.slateDark}
        />
    );
}

export function PreflightSafetyCard({
    mission,
    checklist,
    onToggle,
    airspaceClearance,
    preflightRecord,
    canSign,
    signing,
    onSign,
}: {
    mission: Mission;
    checklist: PreflightChecklistState;
    onToggle: (key: PreflightChecklistKey) => void;
    airspaceClearance?: AirspaceClearance | null;
    preflightRecord?: MissionPreflight | null;
    canSign: boolean;
    signing: boolean;
    onSign: () => void;
}) {
    const {t, formatDate} = useI18n();
    const progress = preflightProgressCount(checklist);
    const gate = canTakeoffMission(mission, checklist, airspaceClearance);

    const itemLabels: Record<PreflightChecklistKey, string> = {
        batteryAndPropellersSafe: t('mobile.ops.preflight.items.batteryAndPropellersSafe'),
        gnssRtkLocked: t('mobile.ops.preflight.items.gnssRtkLocked'),
        weatherCleared: t('mobile.ops.preflight.items.weatherCleared'),
        airspaceAndPermitCleared: t('mobile.ops.preflight.items.airspaceAndPermitCleared'),
    };

    const blockerLabels: Record<string, string> = {
        'mobile.ops.preflight.blockers.notReady': t('mobile.ops.preflight.blockers.notReady'),
        'mobile.ops.preflight.blockers.acceptanceRequired': t('mobile.ops.preflight.blockers.acceptanceRequired'),
        'mobile.ops.preflight.blockers.airspaceBlocked': t('mobile.ops.preflight.blockers.airspaceBlocked'),
        'mobile.ops.preflight.blockers.permitUnverified': t('mobile.ops.preflight.blockers.permitUnverified'),
        'mobile.ops.preflight.blockers.checklistIncomplete': t('mobile.ops.preflight.blockers.checklistIncomplete'),
    };

    return (
        <Card>
            <SectionTitle
                title={t('mobile.ops.preflight.title')}
                action={<Badge label={`${progress.checked}/${progress.total}`} background={colors.slateLight} color={colors.slateDark}/>}
            />
            <AppText variant="small">{t('mobile.ops.preflight.subtitle')}</AppText>

            {preflightRecord?.recorded && preflightRecord.signedByUsername && (
                <AppText variant="caption">
                    {t('capabilities.preflight.signedMeta', {
                        user: preflightRecord.signedByUsername,
                        time: preflightRecord.signedAt ? formatDate(preflightRecord.signedAt) : '—',
                    })}
                </AppText>
            )}

            {PREFLIGHT_CHECKLIST_KEYS.map(key => {
                const checked = checklist[key];
                const Icon = checked ? CheckSquare : Square;
                return (
                    <Pressable
                        key={key}
                        onPress={() => onToggle(key)}
                        accessibilityRole="checkbox"
                        accessibilityState={{checked}}
                        style={({pressed}) => [styles.checkRow, pressed && styles.pressed]}>
                        <Icon size={20} color={checked ? colors.primary : colors.slate}/>
                        <AppText style={[styles.flex, checked && styles.checkDone]}>{itemLabels[key]}</AppText>
                    </Pressable>
                );
            })}

            {canSign && (
                <Button
                    label={signing ? t('capabilities.preflight.signing') : t('capabilities.preflight.signButton')}
                    icon={ShieldCheck}
                    tone="secondary"
                    loading={signing}
                    onPress={onSign}
                />
            )}

            <View style={[styles.gateBanner, gate.allowed ? styles.gateReady : styles.gateBlocked]}>
                {gate.allowed ? (
                    <CheckCircle2 size={18} color={colors.slateDark}/>
                ) : (
                    <ShieldAlert size={18} color={colors.warning}/>
                )}
                <AppText variant="small" style={styles.flex}>
                    {gate.allowed
                        ? t('mobile.ops.preflight.readyForTakeoff')
                        : (gate.blockerKey && blockerLabels[gate.blockerKey]) || t('mobile.ops.preflight.blockers.checklistIncomplete')}
                </AppText>
            </View>
        </Card>
    );
}

const styles = StyleSheet.create({
    flex: {flex: 1},
    checkRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
        paddingVertical: spacing.xs,
    },
    checkDone: {fontWeight: '600', color: colors.text},
    gateBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: radius.control,
        marginTop: spacing.xs,
    },
    gateReady: {backgroundColor: colors.slateLight},
    gateBlocked: {backgroundColor: colors.warningLight},
    pressed: {opacity: 0.75},
});
