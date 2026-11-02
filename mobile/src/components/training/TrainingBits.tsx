import React from 'react';
import {StyleSheet, View} from 'react-native';
import {BookOpenText, FileText, GalleryHorizontalEnd, PlayCircle, type LucideIcon} from 'lucide-react-native';
import {AppText} from '@/components/ui';
import type {TrainingLessonType} from '@/shared/types/training/training.types';
import {colors, spacing} from '@/styles/tokens';

export const LESSON_ICONS: Record<TrainingLessonType, LucideIcon> = {
    VIDEO: PlayCircle,
    SLIDES: GalleryHorizontalEnd,
    ARTICLE: BookOpenText,
    DOCUMENT: FileText,
};

/** A course topic in the reader's language; unknown codes (added on the web later) show as written. */
export function categoryLabel(t: (key: string) => string, category: string): string {
    const key = `mobile.training.categories.${category}`;
    const label = t(key);
    return label === key ? category.replace(/_/g, ' ') : label;
}

export function clampPercent(value: number | null | undefined): number {
    return Math.min(Math.max(Math.round(value ?? 0), 0), 100);
}

export function ProgressBar({percent, label}: { percent: number; label?: string }) {
    return (
        <View style={styles.progress}>
            <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{min: 0, max: 100, now: percent}}>
                <View style={[styles.fill, {width: `${percent}%`}]}/>
            </View>
            {label ? <AppText variant="caption">{label}</AppText> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    progress: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    track: {flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.slateLight, overflow: 'hidden'},
    fill: {height: '100%', backgroundColor: colors.primary},
});
