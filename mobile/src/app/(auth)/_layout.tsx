import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Redirect, Stack} from 'expo-router';
import {detailHeader} from '@/components/layout/TabStack';
import {PulsingSupportLauncher} from '@/components/support/PulsingSupportLauncher';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {resolvePortalEntryHref} from '@/utils/operations/portal-routing';
import {colors} from '@/styles/tokens';

export const LAYOUT_META = {
    segment: '(auth)',
    portal: 'auth',
    navigator: 'stack',
} as const;

/**
 * Auth group stack layout that redirects authenticated sessions to their active portal
 * and exposes the floating UAV PAS live support launcher + sheet to visitors.
 */
export default function AuthGroupLayout() {
    const {status, activePortal} = useAuth();
    const {t} = useI18n();
    // A finished sign-in (on any of these screens) lands in the resolved role workspace.
    if (status === 'signed-in') return <Redirect href={resolvePortalEntryHref(activePortal)}/>;
    return (
        <View style={styles.fill}>
            <Stack screenOptions={{headerShown: false, contentStyle: {backgroundColor: colors.canvas}}}>
                <Stack.Screen name="login"/>
                <Stack.Screen name="register"/>
                <Stack.Screen name="forgot-password"/>
                <Stack.Screen name="verify"/>
                <Stack.Screen
                    name="support"
                    options={{
                        headerShown: true,
                        ...detailHeader,
                        title: t('mobile.support.publicTitle'),
                        presentation: 'formSheet',
                        sheetAllowedDetents: [0.85, 1],
                        sheetGrabberVisible: true,
                        headerTransparent: false,
                    }}
                />
            </Stack>
            <PulsingSupportLauncher mode="auth"/>
        </View>
    );
}

const styles = StyleSheet.create({
    fill: {flex: 1},
});
