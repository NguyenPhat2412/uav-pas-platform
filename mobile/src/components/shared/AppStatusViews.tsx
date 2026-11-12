import React, {useEffect} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {AlertTriangle, WifiOff} from 'lucide-react-native';
import {AppText, Button} from '@/components/ui';
import {BrandMark, AppLogo} from '@/components/shared/BrandMark';
import {useI18n, useTranslateOutsideProvider} from '@/providers/I18nContext';
import {errorReference} from '@/shared/utils/errors/runtime-error';
import {colors, radius, spacing} from '@/styles/tokens';

/** Start-up screen while the Keychain session is checked: continues the native splash, then the wordmark. */
export function AppSplash() {
    return (
        <View style={styles.splash} accessibilityLabel="UAV PAS" accessibilityRole="progressbar">
            <AppLogo size={140}/>
            <BrandMark logo={false}/>
            <ActivityIndicator color={colors.primary}/>
        </View>
    );
}

/** A saved session exists but the API did not answer (offline, server busy): keep it and let the user retry. */
export function AppUnreachable({onRetry, onSignOut}: { onRetry: () => void; onSignOut: () => void }) {
    const {t} = useI18n();
    return (
        <View style={styles.center}>
            <WifiOff size={36} color={colors.slate}/>
            <AppText variant="title">{t('mobile.status.offlineTitle')}</AppText>
            <AppText variant="small" style={styles.text}>{t('mobile.status.offlineHint')}</AppText>
            <Button label={t('common.retry')} onPress={onRetry}/>
            <Button tone="ghost" label={t('common.logout')} onPress={onSignOut}/>
        </View>
    );
}

/**
 * Shown by expo-router's ErrorBoundary when a screen crashes: a plain message, a reference code to report (the same
 * code the web portal computes for the same error) and a retry. Technical text only in development builds.
 */
export function AppErrorView({error, retry}: { error: Error; retry: () => void }) {
    const t = useTranslateOutsideProvider();
    const reference = errorReference(error);
    useEffect(() => {
        console.error(`[UAV-PAS] mobile screen error ${reference}`, error);
    }, [error, reference]);
    return (
        <View style={styles.center}>
            <AlertTriangle size={36} color={colors.danger}/>
            <AppText variant="title">{t('errorPage.title')}</AppText>
            <AppText variant="small" style={styles.text}>{t('errorPage.detail')}</AppText>
            <View style={styles.reference}>
                <AppText variant="caption">{t('errorPage.reference')}</AppText>
                <AppText variant="title" style={styles.code}>{reference}</AppText>
            </View>
            {__DEV__ ? <AppText variant="caption" style={styles.text}>{error.message}</AppText> : null}
            <Button label={t('errorPage.retry')} onPress={retry}/>
        </View>
    );
}

const styles = StyleSheet.create({
    center: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl, backgroundColor: colors.canvas},
    splash: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xl, backgroundColor: colors.white},
    text: {textAlign: 'center'},
    reference: {alignItems: 'center', backgroundColor: colors.slateLight, borderRadius: radius.control, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm},
    code: {letterSpacing: 2},
});
