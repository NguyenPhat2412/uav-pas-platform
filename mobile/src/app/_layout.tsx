import React from 'react';
import {DefaultTheme, Stack, ThemeProvider} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {QueryProvider} from '@/providers/QueryProvider';
import {I18nProvider} from '@/providers/I18nContext';
import {TextSizeProvider} from '@/providers/TextSizeContext';
import {AuthProvider} from '@/providers/AuthContext';
import {ToastProvider} from '@/providers/ToastContext';
import {AppErrorView} from '@/components/shared/AppStatusViews';
import {GlobalOfflineScreen} from '@/components/shared/ConnectionLostScreen';
import {colors} from '@/styles/tokens';

// AuthProvider hides it once the session check is done.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

// Native tabs and stacks read the navigation theme; matching the canvas avoids a white flash between screens.
const theme = {...DefaultTheme, colors: {...DefaultTheme.colors, primary: colors.primary, background: colors.canvas, card: colors.surface, text: colors.text}};

export function ErrorBoundary({error, retry}: { error: Error; retry: () => Promise<void> }) {
    return <AppErrorView error={error} retry={() => void retry()}/>;
}

export default function RootLayout() {
    return (
        <SafeAreaProvider>
            <ThemeProvider value={theme}>
                <QueryProvider>
                    <I18nProvider>
                        <TextSizeProvider>
                            <AuthProvider>
                                <ToastProvider>
                                    <StatusBar style="dark"/>
                                    <Stack screenOptions={{headerShown: false, contentStyle: {backgroundColor: colors.canvas}}}/>
                                    <GlobalOfflineScreen/>
                                </ToastProvider>
                            </AuthProvider>
                        </TextSizeProvider>
                    </I18nProvider>
                </QueryProvider>
            </ThemeProvider>
        </SafeAreaProvider>
    );
}
