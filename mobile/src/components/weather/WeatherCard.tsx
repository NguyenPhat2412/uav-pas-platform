import React, {ReactNode, useState} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, View} from 'react-native';
import {AlertTriangle, Ban, ChevronLeft, ChevronRight, Eye, HelpCircle, PlaneTakeoff, Umbrella, Wind, type LucideIcon} from 'lucide-react-native';
import {useForecastTimeline} from '@/hooks/weather/useWeather';
import {useI18n} from '@/providers/I18nContext';
import {conditionOf, isDaytime, rainLevel, visibilityLevel, windLevel, type Level} from '@/shared/utils/weather/conditions';
import {
    WEATHER_MAX_DAY_OFFSET,
    WEATHER_MIN_DAY_OFFSET,
    clampDayOffset,
    dateAtDayOffset,
    weatherTimelineForDay,
} from '@/shared/utils/weather/flight-window';
import {skyTheme} from '@/shared/utils/weather/sky-theme';
import type {FlightClearanceLevel, WeatherAssessment} from '@/shared/types/weather/weather.types';
import {SkyGradient, WeatherBackdrop, WeatherIcon} from '@/components/weather/WeatherVisuals';
import {ScaledText} from '@/components/ui';
import {clearanceTone, colors, font, radius, spacing} from '@/styles/tokens';

const VERDICT_ICON: Record<FlightClearanceLevel, LucideIcon> = {GO: PlaneTakeoff, CAUTION: AlertTriangle, NO_GO: Ban, UNAVAILABLE: HelpCircle};
const LEVEL_COLOR: Record<Level, string> = {good: colors.text, fair: colors.warning, poor: colors.danger};
const LEVEL_COLOR_DARK: Record<Level, string> = {good: colors.white, fair: '#fde68a', poor: '#fecaca'};

export function Verdict({clearance}: { clearance: FlightClearanceLevel }) {
    const {t} = useI18n();
    const tone = clearanceTone[clearance];
    const Icon = VERDICT_ICON[clearance];
    return (
        <View style={[styles.verdict, {backgroundColor: tone.background}]}>
            <Icon size={14} color={tone.text}/>
            <ScaledText style={[styles.verdictText, {color: tone.text}]}>{t(`weather.home.verdict.${clearance}`)}</ScaledText>
        </View>
    );
}

function Fact({icon: Icon, label, value, level, dark}: { icon: LucideIcon; label: string; value: string; level: Level | null; dark: boolean }) {
    const color = level ? (dark ? LEVEL_COLOR_DARK : LEVEL_COLOR)[level] : dark ? 'rgba(255,255,255,0.6)' : colors.textSecondary;
    return (
        <View style={[styles.fact, {backgroundColor: dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.6)'}]} accessible accessibilityLabel={`${label}: ${value}`}>
            <Icon size={18} color={dark ? colors.white : colors.slateDark}/>
            <ScaledText style={[styles.factText, {color}]} numberOfLines={2}>{value}</ScaledText>
        </View>
    );
}

/** Sky words, verdict and wind / rain / visibility as levels for one assessment (icons first, few words). */
function Conditions({data, at, dark, compact = false}: { data: WeatherAssessment; at?: string; dark: boolean; compact?: boolean }) {
    const {t} = useI18n();
    const condition = conditionOf(data.weatherCode);
    const night = !isDaytime(at ?? data.evaluatedTime);
    const wind = windLevel(data.windSpeed80mMs ?? data.windSpeed10mMs, data.effectiveMaxWindMs);
    const rain = rainLevel(data.precipitationProbabilityPct, data.precipitationMm);
    const visibility = visibilityLevel(data.visibilityMeters);
    const textColor = dark ? colors.white : colors.text;
    const conditionKey = night && (condition === 'clear' || condition === 'partly') ? `weather.home.conditionsNight.${condition}` : `weather.home.conditions.${condition}`;
    if (compact) {
        return (
            <View style={styles.hero}>
                <WeatherIcon condition={condition} night={night} size={40} color={textColor}/>
                <View style={[styles.heroText, styles.flex]}>
                    {data.temperatureC != null && <ScaledText style={[styles.temperatureCompact, {color: textColor}]}>{Math.round(data.temperatureC)}°</ScaledText>}
                    <ScaledText numberOfLines={1} style={[styles.factText, {color: textColor, textAlign: 'left'}]}>{t(conditionKey)}</ScaledText>
                </View>
                <Verdict clearance={data.clearance}/>
            </View>
        );
    }
    return (
        <View style={styles.conditions}>
            <View style={styles.hero}>
                <WeatherIcon condition={condition} night={night} size={56} color={textColor}/>
                <View style={styles.heroText}>
                    {data.temperatureC != null && <ScaledText style={[styles.temperature, {color: textColor}]}>{Math.round(data.temperatureC)}°</ScaledText>}
                    <ScaledText style={[styles.conditionWord, {color: textColor}]}>{t(conditionKey)}</ScaledText>
                </View>
            </View>
            <Verdict clearance={data.clearance}/>
            <View style={styles.facts}>
                <Fact icon={Wind} label={t('weather.home.wind')} value={wind ? t(`weather.home.levels.wind.${wind}`) : '—'} level={wind} dark={dark}/>
                <Fact icon={Umbrella} label={t('weather.home.rain')} value={rain ? t(`weather.home.levels.rain.${rain}`) : '—'} level={rain} dark={dark}/>
                <Fact icon={Eye} label={t('weather.home.visibility')} value={visibility ? t(`weather.home.levels.visibility.${visibility}`) : '—'} level={visibility} dark={dark}/>
            </View>
        </View>
    );
}

/**
 * Multi-day weather card at a point (-7..+14 days): animated sky behind, take-off verdict, plain levels,
 * quick previous/next day steppers and a strip of hours.
 */
export function WeatherCard({
    point,
    title,
    onOpen,
    children,
    compact = false,
    dayOffset: controlledOffset,
    onChangeDayOffset,
    explicitAt,
    onSelectSlot,
}: {
    point: { lat: number; lng: number };
    title?: string;
    onOpen?: () => void;
    children?: ReactNode;
    compact?: boolean;
    dayOffset?: number;
    onChangeDayOffset?: (next: number) => void;
    explicitAt?: string;
    onSelectSlot?: (iso: string) => void;
}) {
    const {t, formatDate} = useI18n();
    const [baseDate] = useState(() => new Date());
    const [internalOffset, setInternalOffset] = useState(0);
    const dayOffset = controlledOffset ?? internalOffset;

    const setDay = (next: number) => {
        const safe = clampDayOffset(next);
        if (onChangeDayOffset) onChangeDayOffset(safe);
        else setInternalOffset(safe);
    };

    const times = weatherTimelineForDay(dayOffset, baseDate, explicitAt);
    const results = useForecastTimeline(point, times);
    const headline = results[0];
    const data = headline.data;
    const theme = skyTheme(conditionOf(data?.weatherCode), !isDaytime(explicitAt ?? data?.evaluatedTime));
    const dark = data ? theme.dark : false;
    const textColor = dark ? colors.white : colors.text;
    const subColor = dark ? 'rgba(255,255,255,0.75)' : colors.textSecondary;
    const chipBg = dark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.65)';

    const selectedDate = dateAtDayOffset(dayOffset, baseDate);
    const resolvedTitle = dayOffset === 0
        ? (title ?? t('weather.home.title'))
        : dayOffset === -1
            ? t('weather.home.titleYesterday')
            : dayOffset === 1
                ? t('weather.home.titleTomorrow')
                : t('weather.home.titleDate', {date: formatDate(selectedDate, {weekday: 'short', day: '2-digit', month: '2-digit'})});

    const summaryContent = headline.isPending ? (
        <ActivityIndicator color={colors.primary} style={styles.loading}/>
    ) : data ? (
        <Conditions data={data} at={explicitAt} dark={dark} compact={compact}/>
    ) : (
        <ScaledText style={[styles.error, {color: subColor}]}>{t('weather.preflight.loadError')}</ScaledText>
    );

    return (
        <View style={[styles.card, compact && styles.cardCompact]}>
            {data ? <SkyGradient background={theme.background}/> : <View style={[StyleSheet.absoluteFill, {backgroundColor: colors.slateLight}]}/>}
            {data && <WeatherBackdrop effect={theme.effect} dark={dark}/>}

            <View style={styles.header}>
                {onOpen ? (
                    <Pressable onPress={onOpen} style={styles.titleTap} accessibilityRole="button" accessibilityLabel={`${resolvedTitle}. ${t('weather.home.details')}`}>
                        <ScaledText numberOfLines={1} style={[styles.title, {color: textColor}]}>{resolvedTitle}</ScaledText>
                        <ChevronRight size={16} color={subColor}/>
                    </Pressable>
                ) : (
                    <ScaledText numberOfLines={1} style={[styles.title, styles.flex, {color: textColor}]}>{resolvedTitle}</ScaledText>
                )}

                <View style={styles.dayStepper}>
                    <Pressable
                        onPress={() => setDay(dayOffset - 1)}
                        disabled={dayOffset <= WEATHER_MIN_DAY_OFFSET}
                        accessibilityRole="button"
                        accessibilityLabel={t('weather.workspace.prevDay')}
                        style={[styles.stepBtn, {backgroundColor: chipBg}, dayOffset <= WEATHER_MIN_DAY_OFFSET && styles.stepDisabled]}>
                        <ChevronLeft size={15} color={textColor}/>
                    </Pressable>
                    {dayOffset !== 0 && (
                        <Pressable
                            onPress={() => setDay(0)}
                            accessibilityRole="button"
                            accessibilityLabel={t('weather.workspace.today')}
                            style={[styles.todayBtn, {backgroundColor: chipBg}]}>
                            <ScaledText style={[styles.todayBtnText, {color: textColor}]}>{t('weather.workspace.today')}</ScaledText>
                        </Pressable>
                    )}
                    <Pressable
                        onPress={() => setDay(dayOffset + 1)}
                        disabled={dayOffset >= WEATHER_MAX_DAY_OFFSET}
                        accessibilityRole="button"
                        accessibilityLabel={t('weather.workspace.nextDay')}
                        style={[styles.stepBtn, {backgroundColor: chipBg}, dayOffset >= WEATHER_MAX_DAY_OFFSET && styles.stepDisabled]}>
                        <ChevronRight size={15} color={textColor}/>
                    </Pressable>
                </View>
            </View>

            {onOpen ? (
                <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={t('weather.home.details')}>
                    {summaryContent}
                </Pressable>
            ) : summaryContent}

            {data && !compact && (
                <View style={styles.stripWrap}>
                    <ScaledText style={[styles.stripTitle, {color: subColor}]}>
                        {t(dayOffset === 0 && !explicitAt ? 'weather.home.next' : 'weather.home.daySlots')}
                    </ScaledText>
                    <View style={styles.strip}>
                        {results.slice(1).map((result, index) => {
                            const slotIso = times[index + 1]!;
                            const hourData = result.data;
                            const condition = conditionOf(hourData?.weatherCode);
                            const active = explicitAt === slotIso;
                            const tileContent = (
                                <>
                                    <ScaledText style={[styles.hourLabel, {color: subColor}]}>{formatDate(slotIso, {hour: '2-digit', minute: '2-digit'})}</ScaledText>
                                    {hourData ? <WeatherIcon condition={condition} night={!isDaytime(slotIso)} size={22} color={textColor}/>
                                        : <ActivityIndicator size="small" color={subColor}/>}
                                    {hourData?.temperatureC != null && <ScaledText style={[styles.hourTemp, {color: textColor}]}>{Math.round(hourData.temperatureC)}°</ScaledText>}
                                </>
                            );
                            if (onSelectSlot) {
                                return (
                                    <Pressable
                                        key={slotIso}
                                        onPress={() => onSelectSlot(slotIso)}
                                        accessibilityRole="button"
                                        accessibilityState={{selected: active}}
                                        style={[
                                            styles.hour,
                                            {backgroundColor: dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.6)'},
                                            active && styles.hourActive,
                                        ]}>
                                        {tileContent}
                                    </Pressable>
                                );
                            }
                            return (
                                <View key={slotIso} style={[styles.hour, {backgroundColor: dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.6)'}]}>
                                    {tileContent}
                                </View>
                            );
                        })}
                    </View>
                </View>
            )}
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {borderRadius: radius.sheet, overflow: 'hidden', padding: spacing.lg, gap: spacing.md, minHeight: 200},
    cardCompact: {minHeight: 0, gap: spacing.sm},
    flex: {flex: 1},
    temperatureCompact: {fontSize: 28, fontWeight: '400'},
    header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm},
    titleTap: {flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4},
    title: {fontSize: font.small, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 1},
    dayStepper: {flexDirection: 'row', alignItems: 'center', gap: 6},
    stepBtn: {width: 28, height: 28, borderRadius: radius.control, alignItems: 'center', justifyContent: 'center'},
    stepDisabled: {opacity: 0.35},
    todayBtn: {height: 28, paddingHorizontal: 8, borderRadius: radius.control, alignItems: 'center', justifyContent: 'center'},
    todayBtnText: {fontSize: font.caption, fontWeight: '700'},
    loading: {marginVertical: spacing.xl},
    error: {fontSize: font.small, marginVertical: spacing.lg},
    conditions: {gap: spacing.md},
    hero: {flexDirection: 'row', alignItems: 'center', gap: spacing.lg},
    heroText: {gap: 2},
    temperature: {fontSize: 40, fontWeight: '300'},
    conditionWord: {fontSize: font.title, fontWeight: '600'},
    verdict: {flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderRadius: radius.control, paddingHorizontal: 10, paddingVertical: 5},
    verdictText: {fontSize: font.small, fontWeight: '700'},
    facts: {flexDirection: 'row', gap: spacing.sm},
    fact: {flex: 1, alignItems: 'center', gap: 6, borderRadius: radius.card, paddingVertical: spacing.md, paddingHorizontal: spacing.xs},
    factText: {fontSize: font.caption, fontWeight: '600', textAlign: 'center'},
    stripWrap: {gap: spacing.xs},
    stripTitle: {fontSize: font.caption, fontWeight: '600'},
    strip: {flexDirection: 'row', gap: spacing.sm},
    hour: {flex: 1, alignItems: 'center', gap: 4, borderRadius: radius.card, paddingVertical: spacing.sm},
    hourActive: {borderWidth: 1.5, borderColor: colors.primary},
    hourLabel: {fontSize: font.caption},
    hourTemp: {fontSize: font.small, fontWeight: '600'},
});
