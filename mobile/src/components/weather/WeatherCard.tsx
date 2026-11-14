import React, {ReactNode, useState} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, View} from 'react-native';
import {AlertTriangle, Ban, ChevronRight, Eye, HelpCircle, PlaneTakeoff, Umbrella, Wind, type LucideIcon} from 'lucide-react-native';
import {useForecastTimeline} from '@/hooks/weather/useWeather';
import {useI18n} from '@/providers/I18nContext';
import {conditionOf, isDaytime, rainLevel, visibilityLevel, windLevel, type Level} from '@/shared/utils/weather/conditions';
import {skyTheme} from '@/shared/utils/weather/sky-theme';
import type {FlightClearanceLevel, WeatherAssessment} from '@/shared/types/weather/weather.types';
import {nextHours} from '@/utils/weather/gradient';
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
 * "Today's weather" at a point: the animated sky behind, the take-off verdict, plain levels and a strip of the next
 * hours (same requests and cache as the web home widget). onOpen shows a "details" chevron. compact keeps one row
 * (icon, temperature, take-off verdict) for the home screen; the full card lives on the weather tab.
 */
export function WeatherCard({point, title, onOpen, children, compact = false}: {
    point: { lat: number; lng: number };
    title: string;
    onOpen?: () => void;
    children?: ReactNode;
    compact?: boolean;
}) {
    const {t, formatDate} = useI18n();
    const [times] = useState(() => nextHours(new Date()));
    const results = useForecastTimeline(point, times);
    const now = results[0];
    const data = now.data;
    const theme = skyTheme(conditionOf(data?.weatherCode), !isDaytime(data?.evaluatedTime));
    const dark = data ? theme.dark : false;
    const textColor = dark ? colors.white : colors.text;
    const subColor = dark ? 'rgba(255,255,255,0.75)' : colors.textSecondary;

    const body = (
        <View style={[styles.card, compact && styles.cardCompact]}>
            {data ? <SkyGradient background={theme.background}/> : <View style={[StyleSheet.absoluteFill, {backgroundColor: colors.slateLight}]}/>}
            {data && <WeatherBackdrop effect={theme.effect} dark={dark}/>}
            <View style={styles.header}>
                <ScaledText style={[styles.title, {color: textColor}]}>{title}</ScaledText>
                {onOpen && <ChevronRight size={18} color={subColor}/>}
            </View>
            {now.isPending ? <ActivityIndicator color={colors.primary} style={styles.loading}/>
                : data ? <Conditions data={data} dark={dark} compact={compact}/>
                    : <ScaledText style={[styles.error, {color: subColor}]}>{t('weather.preflight.loadError')}</ScaledText>}
            {data && !compact && (
                <View style={styles.stripWrap}>
                    <ScaledText style={[styles.stripTitle, {color: subColor}]}>{t('weather.home.next')}</ScaledText>
                    <View style={styles.strip}>
                        {results.slice(1).map((result, index) => {
                            const at = times[index + 1]!;
                            const hourData = result.data;
                            const condition = conditionOf(hourData?.weatherCode);
                            return (
                                <View key={at} style={[styles.hour, {backgroundColor: dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.6)'}]}>
                                    <ScaledText style={[styles.hourLabel, {color: subColor}]}>{formatDate(at, {hour: '2-digit', minute: '2-digit'})}</ScaledText>
                                    {hourData ? <WeatherIcon condition={condition} night={!isDaytime(at)} size={22} color={textColor}/>
                                        : <ActivityIndicator size="small" color={subColor}/>}
                                    {hourData?.temperatureC != null && <ScaledText style={[styles.hourTemp, {color: textColor}]}>{Math.round(hourData.temperatureC)}°</ScaledText>}
                                </View>
                            );
                        })}
                    </View>
                </View>
            )}
            {children}
        </View>
    );

    if (!onOpen) return body;
    return <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`${title}. ${t('weather.home.details')}`}>{body}</Pressable>;
}

const styles = StyleSheet.create({
    card: {borderRadius: radius.sheet, overflow: 'hidden', padding: spacing.lg, gap: spacing.md, minHeight: 200},
    cardCompact: {minHeight: 0, gap: spacing.sm},
    flex: {flex: 1},
    temperatureCompact: {fontSize: 28, fontWeight: '400'},
    header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
    title: {fontSize: font.small, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5},
    loading: {marginVertical: spacing.xl},
    error: {fontSize: font.small, marginVertical: spacing.lg},
    conditions: {gap: spacing.md},
    hero: {flexDirection: 'row', alignItems: 'center', gap: spacing.lg},
    heroText: {gap: 2},
    temperature: {fontSize: 40, fontWeight: '300'},
    conditionWord: {fontSize: font.title, fontWeight: '600'},
    verdict: {flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderRadius: radius.control, paddingHorizontal: 10, paddingVertical: 5},
    verdictText: {fontSize: font.small, fontWeight: '700'},
    // Three equal tiles, icon over a short level word, centred so nothing is cut on a narrow phone.
    facts: {flexDirection: 'row', gap: spacing.sm},
    fact: {flex: 1, alignItems: 'center', gap: 6, borderRadius: radius.card, paddingVertical: spacing.md, paddingHorizontal: spacing.xs},
    factText: {fontSize: font.caption, fontWeight: '600', textAlign: 'center'},
    stripWrap: {gap: spacing.xs},
    stripTitle: {fontSize: font.caption, fontWeight: '600'},
    // The next hours share the card's width equally.
    strip: {flexDirection: 'row', gap: spacing.sm},
    hour: {flex: 1, alignItems: 'center', gap: 4, borderRadius: radius.card, paddingVertical: spacing.sm},
    hourLabel: {fontSize: font.caption},
    hourTemp: {fontSize: font.small, fontWeight: '600'},
});
