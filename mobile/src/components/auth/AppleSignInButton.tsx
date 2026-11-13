import React, {useState} from 'react';
import {ActivityIndicator, Platform, Pressable, StyleSheet} from 'react-native';
import {useRouter} from 'expo-router';
import Svg, {Path} from 'react-native-svg';
import {ScaledText} from '@/components/ui';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {
    formatAppleFullName,
    isAppleAuthDisabledError,
    isAppleSignInCanceled,
    nextSignInStep,
    signInErrorText,
} from '@/forms/auth/sign-in-flow';
import {colors, font, radius, spacing} from '@/styles/tokens';

type AppleAuthModule = typeof import('expo-apple-authentication');

/**
 * Lazily loads expo-apple-authentication on iOS so Expo Go, unprovisioned simulator builds,
 * Android, and Node test runs never crash at module import time.
 */
function loadAppleAuth(): AppleAuthModule | null {
    if (Platform.OS !== 'ios') return null;
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require('expo-apple-authentication') as AppleAuthModule;
    } catch {
        return null;
    }
}

/** Crisp Apple vector mark aligned with GoogleMark at 18px. */
function AppleMark({size = 18, color = colors.white}: { size?: number; color?: string }) {
    return (
        <Svg width={size} height={size} viewBox="-93 -20 1000 1040">
            <Path
                fill={color}
                d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"
            />
        </Svg>
    );
}

/** Compact Sign in with Apple button paired horizontally side-by-side with GoogleSignInButton. */
export function AppleSignInButton({mode = 'signin'}: { mode?: 'signin' | 'signup' }) {
    const {t} = useI18n();
    const {loginWithApple} = useAuth();
    const toast = useToast();
    const router = useRouter();
    const [busy, setBusy] = useState(false);

    const signIn = async () => {
        const appleAuth = loadAppleAuth();
        const available = appleAuth ? await appleAuth.isAvailableAsync().catch(() => false) : false;
        if (!appleAuth || !available) {
            toast.show(t('auth.apple.notConfigured'), 'info');
            return;
        }
        setBusy(true);
        try {
            const credential = await appleAuth.signInAsync({
                requestedScopes: [
                    appleAuth.AppleAuthenticationScope.FULL_NAME,
                    appleAuth.AppleAuthenticationScope.EMAIL,
                ],
            });
            if (!credential.identityToken) {
                toast.show(t('auth.apple.notConfigured'), 'info');
                return;
            }
            const fullName = formatAppleFullName(credential.fullName);
            const response = await loginWithApple({
                credential: credential.identityToken,
                authorizationCode: credential.authorizationCode,
                fullName,
            });
            const step = nextSignInStep(response, credential.email ?? '');
            if (step.kind === 'verify') router.push({pathname: '/verify', params: step.params});
            else if (step.kind === 'pending-approval') toast.show(t('mobile.auth.pendingApproval'), 'info');
        } catch (failure) {
            if (isAppleSignInCanceled(failure)) return;
            if (isAppleAuthDisabledError(failure)) {
                toast.show(t('auth.apple.notConfigured'), 'info');
                return;
            }
            toast.show(signInErrorText(failure, t), 'error');
        } finally {
            setBusy(false);
        }
    };

    const fullLabel = t(mode === 'signup' ? 'auth.apple.signup_with' : 'auth.apple.signin_with');
    return (
        <Pressable
            onPress={() => void signIn()}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={fullLabel}
            accessibilityState={{disabled: busy, busy}}
            style={({pressed}) => [styles.button, busy && styles.disabled, pressed && styles.pressed]}>
            {busy ? <ActivityIndicator size="small" color={colors.white}/> : <AppleMark size={18} color={colors.white}/>}
            <ScaledText numberOfLines={1} style={styles.label}>{t('auth.apple.short')}</ScaledText>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        flex: 1,
        minHeight: 48,
        borderRadius: radius.control,
        borderWidth: 1,
        borderColor: colors.text,
        backgroundColor: colors.text,
        paddingHorizontal: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    label: {fontSize: font.body, fontWeight: '600', color: colors.white, flexShrink: 1},
    pressed: {opacity: 0.78},
    disabled: {opacity: 0.55},
});
