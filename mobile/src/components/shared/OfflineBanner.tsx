import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {WifiOff} from 'lucide-react-native';
import {useNetworkStatus} from '@/hooks/network/useNetworkStatus';
import {useI18n} from '@/providers/I18nContext';
import {useTextScale} from '@/providers/TextSizeContext';
import {colors, font, radius, spacing} from '@/styles/tokens';

/** Persistent field warning banner displayed automatically whenever cellular / Wi-Fi connectivity drops. */
export function OfflineBanner() {
    const {isOffline} = useNetworkStatus();
    const {t} = useI18n();
    const scale = useTextScale();

    if (!isOffline) return null;

    return (
        <View style={styles.banner} accessibilityRole="alert" accessibilityLiveRegion="assertive">
            <WifiOff size={16} color={colors.warning}/>
            <Text style={[styles.text, scale !== 1 ? {fontSize: Math.round(font.small * scale)} : null]}>
                {t('mobile.status.offlineBanner')}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.warningLight,
        borderColor: colors.warning,
        borderWidth: 1,
        borderRadius: radius.control,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    text: {
        flex: 1,
        fontSize: font.small,
        fontWeight: '600',
        color: colors.warning,
    },
});
