import React, {useEffect, useRef, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {Stack} from 'expo-router';
import {ArrowUp, BatteryMedium, CalendarDays, ChevronLeft, ChevronRight, Clock3, Compass, Droplets, Eye, LocateFixed, MapPin, Thermometer, Wind, type LucideIcon} from 'lucide-react-native';
import {AppText, Card, GlassSurface, Screen, SectionTitle} from '@/components/ui';
import {HeaderIconButton} from '@/components/layout/AppHeader';
import {Verdict, WeatherCard} from '@/components/weather/WeatherCard';
import {useForecastTimeline} from '@/hooks/useWeather';
import {useDeviceLocation} from '@/hooks/useDeviceLocation';
import {useI18n} from '@/providers/I18nContext';
import {
    WEATHER_DAY_OFFSETS,
    WEATHER_HOUR_SLOTS,
    WEATHER_MAX_DAY_OFFSET,
    WEATHER_MIN_DAY_OFFSET,
    buildWeatherSlotIso,
    clampDayOffset,
    dateAtDayOffset,
    dayOffsetFromIso,
    hourFromIso,
    isHistoricalWeatherTime,
} from '@/shared/utils/flight-window';
import type {WeatherAssessment} from '@/shared/types/weather.types';
import {colors, font, radius, spacing} from '@/styles/tokens';

type HourMode = 'now' | typeof WEATHER_HOUR_SLOTS[number] | 'custom';

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

function Details({data, onSelectWindow}: { data: WeatherAssessment; onSelectWindow: (startTime: string) => void }) {
    const {t, formatDate, formatNumber} = useI18n();
    const ms = (value: number | null) => (value == null ? '—' : `${formatNumber(value, {maximumFractionDigits: 1})} m/s`);
    const timeKey = data.forecast
        ? 'weather.preflight.forecastAt'
        : isHistoricalWeatherTime(data.evaluatedTime)
            ? 'weather.preflight.historicalAt'
            : 'weather.preflight.currentAt';

    return (
        <>
            <Card>
                <SectionTitle title={t('weather.preflight.title')} action={<Verdict clearance={data.clearance}/>}/>
                <AppText variant="caption" style={styles.metaText}>
                    {t(timeKey, {time: formatDate(data.evaluatedTime, {dateStyle: 'short', timeStyle: 'short'})})}
                </AppText>
                <AppText variant="small">{t('weather.preflight.score', {score: data.safetyScore})} · {t('weather.preflight.limit', {limit: data.effectiveMaxWindMs})}</AppText>
                {data.reasonCodes.map(code => <AppText key={code} variant="small">• {t(`weather.preflight.reasons.${code}`)}</AppText>)}
            </Card>
            {data.clearance !== 'UNAVAILABLE' && (
                <>
                    <Card>
                        <Metric icon={Wind} label={t('weather.preflight.wind10m')} value={ms(data.windSpeed10mMs)}/>
                        <Metric icon={Wind} label={t('weather.preflight.windFlight')} value={`${ms(data.windSpeed80mMs)} / ${ms(data.windSpeed120mMs)}`}/>
                        <Metric icon={Wind} label={t('weather.preflight.gusts')} value={ms(data.windGustsMs)}/>
                        <Metric icon={Compass} label={t('weather.preflight.direction')} value={data.windDirectionDeg == null ? '—' : `${Math.round(data.windDirectionDeg)}°`}>
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
                                <Pressable key={window.startTime} onPress={() => onSelectWindow(window.startTime)}
                                           accessibilityRole="button" style={styles.window}>
                                    <View style={styles.flex}>
                                        <AppText style={styles.windowTime}>{formatDate(window.startTime, {weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'})}</AppText>
                                        <AppText variant="caption" style={styles.useWindow}>{t('weather.preflight.useWindow')} · {t('weather.preflight.windowWind', {wind: window.windSpeed80mMs ?? '—'})}</AppText>
                                    </View>
                                    <Verdict clearance={window.clearance}/>
                                </Pressable>
                            ))}
                    </Card>
                </>
            )}
        </>
    );
}

export function WeatherScreen() {
    const {t, formatDate} = useI18n();
    const location = useDeviceLocation();
    const [baseDate] = useState(() => new Date());
    const [dayOffset, setDayOffset] = useState(0);
    const [hourMode, setHourMode] = useState<HourMode>('now');
    const [customAt, setCustomAt] = useState<string>('');
    const dayScrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);

    useEffect(() => {
        const index = dayOffset - WEATHER_MIN_DAY_OFFSET;
        const targetX = Math.max(0, index * 64 - 116);
        const timer = setTimeout(() => dayScrollRef.current?.scrollTo({x: targetX, animated: true}), 40);
        return () => clearTimeout(timer);
    }, [dayOffset]);

    const explicitAt: string | undefined = hourMode === 'now'
        ? (dayOffset === 0 ? undefined : buildWeatherSlotIso(dayOffset, 9, baseDate))
        : hourMode === 'custom'
            ? (customAt || buildWeatherSlotIso(dayOffset, 9, baseDate))
            : buildWeatherSlotIso(dayOffset, hourMode, baseDate);

    const [selected] = useForecastTimeline(location.point, [explicitAt]);
    const selectedDate = dateAtDayOffset(dayOffset, baseDate);

    const selectDay = (next: number) => {
        const safe = clampDayOffset(next);
        setDayOffset(safe);
        if (hourMode === 'now' && safe !== 0) {
            setHourMode(10);
        } else if (hourMode === 'custom' && customAt.length >= 16) {
            setCustomAt(`${buildWeatherSlotIso(safe, 9, baseDate).slice(0, 10)}T${customAt.slice(11, 16)}`);
        }
    };

    const relativeDayLabel = (offset: number) => {
        if (offset === 0) return t('weather.workspace.today');
        if (offset === -1) return t('weather.workspace.yesterday');
        if (offset === 1) return t('weather.workspace.tomorrowDay');
        return offset < 0
            ? t('weather.workspace.dayOffsetPast', {days: Math.abs(offset)})
            : t('weather.workspace.dayOffsetFuture', {days: offset});
    };

    const applyIsoSlot = (iso: string) => {
        const nextOffset = dayOffsetFromIso(iso, baseDate);
        const parsedHour = hourFromIso(iso);
        const matchedSlot = WEATHER_HOUR_SLOTS.find(slot => slot === parsedHour && iso.endsWith(':00'));
        setDayOffset(nextOffset);
        if (matchedSlot) {
            setHourMode(matchedSlot);
        } else {
            setHourMode('custom');
            setCustomAt(iso.slice(0, 16));
        }
    };

    return (
        <Screen onRefresh={() => void selected.refetch()} refreshing={selected.isRefetching}>
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

            <GlassSurface style={styles.navCard} fallback={styles.navCardFallback}>
                <View style={styles.stepperRow}>
                    <Pressable
                        onPress={() => selectDay(dayOffset - 1)}
                        disabled={dayOffset <= WEATHER_MIN_DAY_OFFSET}
                        accessibilityRole="button"
                        accessibilityLabel={t('weather.workspace.prevDay')}
                        style={[styles.stepButton, dayOffset <= WEATHER_MIN_DAY_OFFSET && styles.disabled]}>
                        <ChevronLeft size={16} color={colors.text}/>
                        <AppText variant="caption" style={styles.stepLabel}>{t('weather.workspace.prevDay')}</AppText>
                    </Pressable>

                    <View style={styles.activeDayBadge}>
                        <CalendarDays size={14} color={colors.primary}/>
                        <AppText variant="caption" numberOfLines={1} style={styles.activeDayText}>
                            {relativeDayLabel(dayOffset)} · {formatDate(selectedDate, {day: '2-digit', month: '2-digit'})}
                        </AppText>
                    </View>

                    <Pressable
                        onPress={() => selectDay(dayOffset + 1)}
                        disabled={dayOffset >= WEATHER_MAX_DAY_OFFSET}
                        accessibilityRole="button"
                        accessibilityLabel={t('weather.workspace.nextDay')}
                        style={[styles.stepButton, dayOffset >= WEATHER_MAX_DAY_OFFSET && styles.disabled]}>
                        <AppText variant="caption" style={styles.stepLabel}>{t('weather.workspace.nextDay')}</AppText>
                        <ChevronRight size={16} color={colors.text}/>
                    </Pressable>
                </View>

                <ScrollView ref={dayScrollRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stripRow}>
                    {WEATHER_DAY_OFFSETS.map(offset => {
                        const day = dateAtDayOffset(offset, baseDate);
                        const active = offset === dayOffset;
                        const topLabel = offset === -1
                            ? t('weather.workspace.yesterday')
                            : offset === 0
                                ? t('weather.workspace.today')
                                : offset === 1
                                    ? t('weather.workspace.tomorrowDay')
                                    : formatDate(day, {weekday: 'short'});
                        return (
                            <Pressable
                                key={offset}
                                onPress={() => selectDay(offset)}
                                accessibilityRole="button"
                                accessibilityState={{selected: active}}
                                style={[styles.dayChip, active && styles.dayChipActive, offset === 0 && !active && styles.dayChipToday]}>
                                <AppText variant="caption" numberOfLines={1} style={[styles.dayChipSub, active && styles.textLight]}>
                                    {topLabel}
                                </AppText>
                                <AppText variant="small" style={[styles.dayChipDate, active && styles.textLight]}>
                                    {formatDate(day, {day: '2-digit', month: '2-digit'})}
                                </AppText>
                            </Pressable>
                        );
                    })}
                </ScrollView>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stripRow}>
                    <View style={styles.hourHeader}>
                        <Clock3 size={13} color={colors.muted}/>
                    </View>
                    <Pressable
                        onPress={() => { setDayOffset(0); setHourMode('now'); }}
                        accessibilityRole="button"
                        accessibilityState={{selected: dayOffset === 0 && hourMode === 'now'}}
                        style={[styles.hourChip, dayOffset === 0 && hourMode === 'now' && styles.hourChipActive]}>
                        <AppText variant="caption" style={[styles.hourChipText, dayOffset === 0 && hourMode === 'now' && styles.hourChipTextActive]}>
                            {t('weather.workspace.times.now')}
                        </AppText>
                    </Pressable>
                    {WEATHER_HOUR_SLOTS.map(slot => {
                        const active = hourMode === slot;
                        return (
                            <Pressable
                                key={slot}
                                onPress={() => setHourMode(slot)}
                                accessibilityRole="button"
                                accessibilityState={{selected: active}}
                                style={[styles.hourChip, active && styles.hourChipActive]}>
                                <AppText variant="caption" style={[styles.hourChipText, active && styles.hourChipTextActive]}>
                                    {`${String(slot).padStart(2, '0')}:00`}
                                </AppText>
                            </Pressable>
                        );
                    })}
                    {hourMode === 'custom' && customAt ? (
                        <View style={[styles.hourChip, styles.hourChipActive]}>
                            <AppText variant="caption" style={styles.hourChipTextActive}>{customAt.slice(11, 16)}</AppText>
                        </View>
                    ) : null}
                </ScrollView>
            </GlassSurface>

            <WeatherCard
                point={location.point}
                title={t('weather.home.title')}
                dayOffset={dayOffset}
                onChangeDayOffset={selectDay}
                explicitAt={explicitAt}
                onSelectSlot={applyIsoSlot}
            />
            {selected.data && <Details data={selected.data} onSelectWindow={applyIsoSlot}/>}
        </Screen>
    );
}

const styles = StyleSheet.create({
    flex: {flex: 1},
    place: {flexDirection: 'row', alignItems: 'center', gap: 4},
    warning: {color: colors.warning},
    navCard: {borderRadius: radius.card, padding: spacing.md, gap: spacing.sm},
    navCardFallback: {borderRadius: radius.card, padding: spacing.md, gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border},
    stepperRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs},
    stepButton: {flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 8, paddingVertical: 6, borderRadius: radius.control, backgroundColor: colors.slateLight},
    stepLabel: {fontWeight: '600', color: colors.text},
    disabled: {opacity: 0.35},
    activeDayBadge: {flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 6, borderRadius: radius.control, backgroundColor: colors.primaryLight},
    activeDayText: {fontWeight: '700', color: colors.primary},
    stripRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
    dayChip: {minWidth: 56, alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6, borderRadius: radius.control, backgroundColor: colors.slateLight},
    dayChipToday: {borderWidth: 1, borderColor: colors.inputBorder},
    dayChipActive: {backgroundColor: colors.primary},
    dayChipSub: {fontSize: 10, fontWeight: '600'},
    dayChipDate: {fontSize: font.caption, fontWeight: '700'},
    textLight: {color: colors.white},
    hourHeader: {paddingRight: 2},
    hourChip: {paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.control, backgroundColor: colors.slateLight},
    hourChipActive: {backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.glassBorderSelected},
    hourChipText: {fontWeight: '600', color: colors.textSecondary},
    hourChipTextActive: {fontWeight: '700', color: colors.primary},
    metaText: {marginBottom: 2},
    metric: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 6},
    metricIcon: {width: 36, height: 36, borderRadius: radius.control, backgroundColor: colors.slateLight, alignItems: 'center', justifyContent: 'center'},
    valueRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    window: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 8},
    windowTime: {fontWeight: '600'},
    useWindow: {color: colors.primary, fontWeight: '600'},
});
