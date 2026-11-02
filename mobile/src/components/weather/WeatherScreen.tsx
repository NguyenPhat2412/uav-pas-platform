import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Stack} from 'expo-router';
import {ArrowUp, BatteryMedium, Compass, Droplets, Eye, LocateFixed, MapPin, Thermometer, Wind, type LucideIcon} from 'lucide-react-native';
import {AppText, Card, Screen, SectionTitle} from '@/components/ui';
import {HeaderIconButton} from '@/components/layout/AppHeader';
import {Verdict, WeatherCard} from '@/components/weather/WeatherCard';
import {useForecastTimeline} from '@/hooks/weather/useWeather';
import {useDeviceLocation} from '@/hooks/location/useDeviceLocation';
import {useI18n} from '@/providers/I18nContext';
import type {WeatherAssessment} from '@/shared/types/weather/weather.types';
import {colors, radius, spacing} from '@/styles/tokens';

const NOW = [undefined] as const;

function Metric({icon: Icon, label, value, children}: { icon: LucideIcon; label: string; value: string; children?: React.ReactNode }) {
    return (
        <View style={styles.metric} accessible accessibilityLabel={`${label}: ${value}`}>
            <View style={styles.metricIcon}><Icon size={18} color={colors.slateDark}/></View>
            <View style={styles.flex}>
                <AppText variant="caption">{label}</AppText>
                <View style={styles.valueRow}>
                    <AppText variant="title">{value}</AppText>
                    {children}
                </View>
            </View>
        </View>
    );
}

function Details({data}: { data: WeatherAssessment }) {
    const {t, formatDate, formatNumber} = useI18n();
    const ms = (value: number | null) => (value == null ? '—' : `${formatNumber(value, {maximumFractionDigits: 1})} m/s`);
    return (
        <>
            <Card>
                <SectionTitle title={t('weather.preflight.title')} action={<Verdict clearance={data.clearance}/>}/>
                <AppText variant="small">{t('weather.preflight.score', {score: data.safetyScore})} · {t('weather.preflight.limit', {limit: data.effectiveMaxWindMs})}</AppText>
                {data.reasonCodes.map(code => <AppText key={code} variant="small">• {t(`weather.preflight.reasons.${code}`)}</AppText>)}
            </Card>
            <Card>
                <Metric icon={Wind} label={t('weather.preflight.wind10m')} value={ms(data.windSpeed10mMs)}/>
                <Metric icon={Wind} label={t('weather.preflight.windFlight')} value={`${ms(data.windSpeed80mMs)} / ${ms(data.windSpeed120mMs)}`}/>
                <Metric icon={Wind} label={t('weather.preflight.gusts')} value={ms(data.windGustsMs)}/>
                <Metric icon={Compass} label={t('weather.preflight.direction')} value={data.windDirectionDeg == null ? '—' : `${Math.round(data.windDirectionDeg)}°`}>
                    {/* The arrow points where the wind blows to (meteorological direction is where it comes from). */}
                    {data.windDirectionDeg != null && <View style={{transform: [{rotate: `${data.windDirectionDeg + 180}deg`}]}}><ArrowUp size={16} color={colors.slate}/></View>}
                </Metric>
                <Metric icon={Thermometer} label={t('weather.preflight.temperature')}
                        value={`${data.temperatureC == null ? '—' : Math.round(data.temperatureC) + '°C'} · ${data.humidityPct == null ? '—' : Math.round(data.humidityPct) + '%'}`}/>
                <Metric icon={Droplets} label={t('weather.preflight.rain')}
                        value={`${data.precipitationMm == null ? '—' : formatNumber(data.precipitationMm) + ' mm'} · ${data.precipitationProbabilityPct == null ? '—' : data.precipitationProbabilityPct + '%'}`}/>
                <Metric icon={Eye} label={t('weather.preflight.visibility')} value={data.visibilityMeters == null ? '—' : `${formatNumber(Math.round(data.visibilityMeters / 100) / 10)} km`}/>
                <Metric icon={Compass} label={t('weather.preflight.kp')} value={data.kpIndex == null ? '—' : formatNumber(data.kpIndex, {maximumFractionDigits: 1})}/>
                <Metric icon={BatteryMedium} label={t('weather.preflight.battery')} value={`×${formatNumber(data.batteryDrainMultiplier, {maximumFractionDigits: 2})}`}/>
            </Card>
            <Card>
                <SectionTitle title={t('weather.preflight.windows')}/>
                {data.recommendedWindows.length === 0 ? <AppText variant="small">{t('weather.preflight.noWindows')}</AppText>
                    : data.recommendedWindows.map(window => (
                        <View key={window.startTime} style={styles.window}>
                            <AppText style={styles.flex}>{formatDate(window.startTime, {weekday: 'short', hour: '2-digit', minute: '2-digit'})}</AppText>
                            <AppText variant="small">{t('weather.preflight.windowWind', {wind: window.windSpeed80mMs ?? '—'})}</AppText>
                            <Verdict clearance={window.clearance}/>
                        </View>
                    ))}
            </Card>
        </>
    );
}

export function WeatherScreen() {
    const {t} = useI18n();
    const location = useDeviceLocation();
    // Same cache entry as the card's "now" query: no second request.
    const [now] = useForecastTimeline(location.point, NOW);

    return (
        <Screen onRefresh={() => void now.refetch()} refreshing={now.isRefetching}>
            {/* Title and the place on two short lines, the locate button on the right: no separate location row. */}
            <Stack.Screen options={{
                headerTitle: () => (
                    <View>
                        <AppText variant="title" numberOfLines={1}>{t('nav.weather')}</AppText>
                        <View style={styles.place}>
                            <MapPin size={12} color={colors.muted}/>
                            <AppText variant="caption" numberOfLines={1}>
                                {location.source === 'device' ? t('weather.workspace.myLocation') : t('weather.workspace.presets.home')}
                            </AppText>
                        </View>
                    </View>
                ),
                headerRight: () => <HeaderIconButton icon={LocateFixed} label={t('weather.workspace.myLocation')} loading={location.locating}
                                                     onPress={() => void location.locate()}/>,
            }}/>
            {location.denied ? <AppText variant="caption" style={styles.warning}>{t('weather.workspace.locateDenied')}</AppText> : null}
            <WeatherCard point={location.point} title={t('weather.home.title')}/>
            {now.data && <Details data={now.data}/>}
        </Screen>
    );
}

const styles = StyleSheet.create({
    flex: {flex: 1},
    place: {flexDirection: 'row', alignItems: 'center', gap: 4},
    warning: {color: colors.warning},
    metric: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 6},
    metricIcon: {width: 36, height: 36, borderRadius: radius.control, backgroundColor: colors.slateLight, alignItems: 'center', justifyContent: 'center'},
    valueRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    window: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6},
});
