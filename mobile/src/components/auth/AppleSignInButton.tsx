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
        <Svg width={size} height={size} viewBox="0 0 24 24">
            <Path
                fill={color}
                d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
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
