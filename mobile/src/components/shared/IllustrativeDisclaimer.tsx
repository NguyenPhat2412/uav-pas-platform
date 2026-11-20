import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Info} from 'lucide-react-native';
import {AppText, ScaledText} from '@/components/ui';
import {useI18n} from '@/providers/I18nContext';
import {colors, font, radius, spacing} from '@/styles/tokens';

/**
 * Single compact muted caption badge ("minh hoạ") placed directly beside a price or monetary amount
 * (UI-REVIEW-9-FIXES #1 & README §3).
 */
export function IllustrativeBadge() {
    const {t} = useI18n();
    return (
        <View style={styles.badge}>
            <ScaledText style={styles.badgeText} numberOfLines={1}>
                {t('mobile.shop.illustrativePrice')}
            </ScaledText>
        </View>
    );
}

/**
 * Single subtle footer note placed once at the bottom of a marketplace, order, or wallet screen:
 * "Giá và giao dịch trên nền tảng là minh hoạ phục vụ đồ án."
 */
export function IllustrativeFooterNote() {
    const {t} = useI18n();
    return (
        <View style={styles.footer}>
            <Info size={13} color={colors.muted}/>
            <AppText variant="caption" style={styles.footerText}>
                {t('mobile.overnight.illustrativeFooterNote')}
            </AppText>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        backgroundColor: colors.slateLight,
    },
    badgeText: {
        fontSize: font.caption,
        fontWeight: '500',
        color: colors.muted,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.control,
    },
    footerText: {
        color: colors.muted,
        textAlign: 'center',
        flexShrink: 1,
    },
});
