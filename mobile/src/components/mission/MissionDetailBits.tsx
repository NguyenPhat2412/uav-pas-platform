import React from 'react';
import {StyleSheet, View} from 'react-native';
import {AppText, Card, LoadingState, SectionTitle} from '@/components/ui';
import {Verdict} from '@/components/weather/WeatherCard';
import {useMissionWeather} from '@/hooks/weather/useWeather';
import {useI18n} from '@/providers/I18nContext';
import type {Mission} from '@/shared/types/mission/mission.types';
import {progressStep} from '@/utils/mission/status';
import {colors, spacing} from '@/styles/tokens';

const STEPS = ['draft', 'pending', 'confirmed', 'completed'] as const;

/** Four-step progress bar of a customer mission (draft → pending → confirmed → completed). */
export function MissionProgress({mission}: { mission: Mission }) {
    const {t} = useI18n();
    const step = progressStep(mission.status);
    if (step < 0) return null;
    return (
        <View style={styles.steps} accessibilityLabel={t('progress.label')}>
            {STEPS.map((key, index) => {
                const done = index <= step;
                const label = index === 2 && mission.status === 'IN_PROGRESS' ? t('progress.inProgress') : t(`progress.${key}`);
                return (
                    <View key={key} style={styles.step}>
                        <View style={[styles.stepBar, done && styles.stepBarDone]}/>
                        <AppText variant="caption" style={done ? styles.stepDone : undefined} numberOfLines={1}>{label}</AppText>
                    </View>
                );
            })}
        </View>
    );
}

/** Take-off weather verdict at the mission site; hidden when the mission has no point. */
export function MissionSiteWeather({mission}: { mission: Mission }) {
    const {t} = useI18n();
    const weather = useMissionWeather(mission.id, mission.latitude != null && mission.longitude != null);
    if (mission.latitude == null || mission.longitude == null) return null;
    return (
        <Card>
            <SectionTitle title={t('weather.preflight.title')}/>
            {weather.isPending ? <LoadingState/>
                : weather.data ? (
                    <View style={styles.weather}>
                        <Verdict clearance={weather.data.clearance}/>
                        <AppText variant="small">{t('weather.preflight.score', {score: weather.data.safetyScore})}</AppText>
                        {weather.data.reasonCodes.map(code => (
                            <AppText key={code} variant="small">• {t(`weather.preflight.reasons.${code}`)}</AppText>
                        ))}
                    </View>
                ) : <AppText variant="small">{t('weather.preflight.loadError')}</AppText>}
        </Card>
    );
}

const styles = StyleSheet.create({
    steps: {flexDirection: 'row', gap: spacing.xs, marginVertical: spacing.xs},
    step: {flex: 1, gap: 4, minWidth: 0},
    stepBar: {height: 4, borderRadius: 2, backgroundColor: colors.border},
    stepBarDone: {backgroundColor: colors.primary},
    stepDone: {color: colors.text, fontWeight: '600'},
    weather: {gap: spacing.xs},
});
