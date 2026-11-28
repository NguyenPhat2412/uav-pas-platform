import React from 'react';
import {Platform, Pressable, StyleSheet, View} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {CloudSun} from 'lucide-react-native';
import {AppText, Card, FieldLabel, ScaledText} from '@/components/ui';
import {fromLocalIso} from '@/forms/mission-draft';
import {useI18n} from '@/providers/I18nContext';
import {colors, font, radius, spacing} from '@/styles/tokens';

export interface RecommendedFlightWindow {
    startTime: string;
    safetyScore: number;
}

function DateField({
    label,
    value,
    onChange,
    error,
}: {
    label: string;
    value: string;
    onChange: (date: Date) => void;
    error?: string;
}) {
    const date = fromLocalIso(value) ?? new Date();
    return (
        <View style={styles.dateField}>
            <View style={styles.dateRow}>
                <FieldLabel label={label} required/>
                <View style={styles.pickerAlign}>
                    <DateTimePicker
                        value={date}
                        mode="datetime"
                        display={Platform.OS === 'ios' ? 'compact' : 'default'}
                        minuteInterval={5}
                        accentColor={colors.primary}
                        onChange={(_event, next) => next && onChange(next)}
                    />
                </View>
            </View>
            {error ? <AppText variant="caption" style={styles.error}>{error}</AppText> : null}
        </View>
    );
}

/**
 * Flight schedule pickers + weather-recommended safe flight window chips for Step 2 of booking.
 */
export function MissionScheduleWeatherCard({
    startTime,
    expectedEndTime,
    startError,
    endError,
    recommendedWindows,
    onChangeStart,
    onChangeEnd,
    onSelectWindow,
}: {
    startTime: string;
    expectedEndTime: string;
    startError?: string;
    endError?: string;
    recommendedWindows: RecommendedFlightWindow[];
    onChangeStart: (date: Date) => void;
    onChangeEnd: (date: Date) => void;
    onSelectWindow: (windowStartIso: string) => void;
}) {
    const {t, formatDate} = useI18n();

    return (
        <Card>
            <DateField
                label={t('missionForm.start')}
                value={startTime}
                onChange={onChangeStart}
                error={startError}
            />
            <DateField
                label={t('missionForm.expectedEnd')}
                value={expectedEndTime}
                onChange={onChangeEnd}
                error={endError}
            />
            <AppText variant="caption">{t('missionForm.timeHint')}</AppText>

            {recommendedWindows.length > 0 && (
                <View style={styles.windowsSection}>
                    <View style={styles.windowsHeader}>
                        <CloudSun size={15} color={colors.slateDark}/>
                        <AppText variant="small" style={styles.dateLabel}>
                            {t('mobile.missions.safeWindowsTitle')}
                        </AppText>
                    </View>
                    <View style={styles.windowsRow}>
                        {recommendedWindows.map(win => {
                            const selected = startTime.slice(0, 16) === win.startTime.slice(0, 16);
                            return (
                                <Pressable
                                    key={win.startTime}
                                    accessibilityRole="button"
                                    accessibilityState={{selected}}
                                    onPress={() => onSelectWindow(win.startTime)}
                                    style={({pressed}) => [
                                        styles.windowChip,
                                        selected && styles.windowChipActive,
                                        pressed && styles.pressed,
                                    ]}>
                                    <ScaledText
                                        style={[
                                            styles.windowChipText,
                                            selected && styles.windowChipTextActive,
                                        ]}>
                                        {formatDate(win.startTime, {dateStyle: 'short', timeStyle: 'short'})} · {win.safetyScore}%
                                    </ScaledText>
                                </Pressable>
                            );
                        })}
                    </View>
                </View>
            )}
        </Card>
    );
}

const styles = StyleSheet.create({
    error: {color: colors.danger},
    dateField: {gap: spacing.xs},
    dateRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm},
    dateLabel: {fontWeight: '600', color: colors.text},
    pickerAlign: {marginLeft: 'auto'},
    windowsSection: {gap: spacing.xs, paddingTop: spacing.xs, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border},
    windowsHeader: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
    windowsRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
    windowChip: {minHeight: 36, justifyContent: 'center', borderRadius: radius.control, borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: spacing.sm},
    windowChipActive: {backgroundColor: colors.slateDark, borderColor: colors.slateDark},
    windowChipText: {fontSize: font.caption, fontWeight: '600', color: colors.text},
    windowChipTextActive: {color: colors.white},
    pressed: {opacity: 0.75},
});
