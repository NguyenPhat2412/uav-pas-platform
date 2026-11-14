import React from 'react';
import {StyleSheet, View} from 'react-native';
import {CalendarClock, ChevronRight, MapPin} from 'lucide-react-native';
import {AppText, Badge, Card} from '@/components/ui';
import {useI18n} from '@/providers/I18nContext';
import {displayLabel} from '@/shared/lib/presentation';
import type {Mission, MissionStatus} from '@/shared/types/mission/mission.types';
import {statusTone, type StatusTone} from '@/utils/mission/status';
import {colors, spacing} from '@/styles/tokens';

const TONE: Record<StatusTone, { background: string; color: string }> = {
    neutral: {background: colors.slateLight, color: colors.textSecondary},
    progress: {background: colors.slateLight, color: colors.slateDark},
    success: {background: colors.slateDark, color: colors.white},
    warning: {background: colors.warningLight, color: colors.warning},
    danger: {background: colors.dangerLight, color: colors.danger},
};

export function MissionStatusBadge({status}: { status: MissionStatus }) {
    const tone = TONE[statusTone(status)];
    return <Badge label={displayLabel(status)} background={tone.background} color={tone.color}/>;
}

/** One mission in a list: code and status, title, then time and place as icon lines. */
export function MissionRow({mission, onPress}: { mission: Pick<Mission, 'code' | 'title' | 'status' | 'startTime' | 'locationName'>; onPress: () => void }) {
    const {formatDate} = useI18n();
    return (
        <Card onPress={onPress} accessibilityLabel={`${mission.code} ${mission.title}`}>
            <View style={styles.top}>
                <AppText variant="caption" style={styles.code}>{mission.code}</AppText>
                <MissionStatusBadge status={mission.status}/>
            </View>
            <View style={styles.titleRow}>
                <AppText variant="title" numberOfLines={2} style={styles.title}>{mission.title}</AppText>
                <ChevronRight size={18} color={colors.muted}/>
            </View>
            <View style={styles.meta}>
                <CalendarClock size={14} color={colors.muted}/>
                <AppText variant="small">{formatDate(mission.startTime, {hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'})}</AppText>
            </View>
            {mission.locationName ? (
                <View style={styles.meta}>
                    <MapPin size={14} color={colors.muted}/>
                    <AppText variant="small" numberOfLines={1} style={styles.flex}>{mission.locationName}</AppText>
                </View>
            ) : null}
        </Card>
    );
}

const styles = StyleSheet.create({
    top: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
    code: {fontWeight: '700', letterSpacing: 0.5},
    titleRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    title: {flex: 1},
    meta: {flexDirection: 'row', alignItems: 'center', gap: 6},
    flex: {flex: 1},
});
