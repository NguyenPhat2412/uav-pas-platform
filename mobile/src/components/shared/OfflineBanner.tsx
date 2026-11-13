import React from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';
import {ServerOff, WifiOff, Wrench} from 'lucide-react-native';
import {useNetworkStatus} from '@/hooks/network/useNetworkStatus';
import {useI18n} from '@/providers/I18nContext';
import {useTextScale} from '@/providers/TextSizeContext';
import {colors, font, radius, spacing} from '@/styles/tokens';

/** Compact offline/maintenance chip shown only if the user dismissed ConnectionLostScreen to inspect cached data. */
export function OfflineBanner() {
    const {isOffline, reason, dismissed, reopen} = useNetworkStatus();
    const {t} = useI18n();
    const scale = useTextScale();

    if (!isOffline || !dismissed) return null;

    const StatusIcon = reason === 'maintenance' ? Wrench : reason === 'server' ? ServerOff : WifiOff;
    const label = reason === 'maintenance'
        ? t('errorPage.maintenancePill')
        : reason === 'server'
            ? t('errorPage.serverPill')
            : t('mobile.status.offlineBanner');

    return (
        <Pressable
            onPress={reopen}
            accessibilityRole="button"
            accessibilityLiveRegion="assertive"
            style={styles.banner}>
            <StatusIcon size={16} color={colors.danger}/>
            <Text numberOfLines={1} style={[styles.text, scale !== 1 ? {fontSize: Math.round(font.small * scale)} : null]}>
                {label}
            </Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.dangerLight,
        borderColor: colors.danger,
        borderWidth: 1,
        borderRadius: radius.control,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    text: {
        flex: 1,
        fontSize: font.small,
        fontWeight: '600',
        color: colors.danger,
    },
});
