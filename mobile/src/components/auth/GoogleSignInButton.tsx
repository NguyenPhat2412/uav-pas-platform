import React, {useState} from 'react';
import {ActivityIndicator, Pressable, StyleSheet} from 'react-native';
import {useRouter} from 'expo-router';
import Svg, {Path} from 'react-native-svg';
import {ScaledText} from '@/components/ui';
import {GOOGLE_CLIENT_IDS} from '@/config/env';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {nextSignInStep, signInErrorText} from '@/forms/auth/sign-in-flow';
import {colors, font, radius, spacing} from '@/styles/tokens';

type GoogleSignInModule = typeof import('@react-native-google-signin/google-signin');

/**
 * The native module only exists in dev/release builds made with the Google config plugin enabled;
 * Expo Go and unconfigured builds receive null here instead of crashing, and show an informational toast on tap.
 */
function loadGoogleSignIn(): GoogleSignInModule | null {
    if (!GOOGLE_CLIENT_IDS) return null;
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const module: GoogleSignInModule = require('@react-native-google-signin/google-signin');
        module.GoogleSignin.configure({webClientId: GOOGLE_CLIENT_IDS.web, iosClientId: GOOGLE_CLIENT_IDS.ios});
        return module;
    } catch {
        return null;
    }
}

const google = loadGoogleSignIn();

/** Google's "G" mark in its four brand colours. */
function GoogleMark({size = 18}: { size?: number }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 48 48">
            <Path fill={colors.googleRed} d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <Path fill={colors.googleBlue} d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <Path fill={colors.googleYellow} d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <Path fill={colors.googleGreen} d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </Svg>
    );
}

/** Compact Google sign-in button paired side-by-side with AppleSignInButton inside SocialSignInRow. */
export function GoogleSignInButton({mode = 'signin'}: { mode?: 'signin' | 'signup' }) {
    const {t} = useI18n();
    const {loginWithGoogle} = useAuth();
    const toast = useToast();
    const router = useRouter();
    const [busy, setBusy] = useState(false);

    const signIn = async () => {
        if (!google || !GOOGLE_CLIENT_IDS) {
            toast.show(t('auth.google.notConfigured'), 'info');
            return;
        }
        const {GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes} = google;
        setBusy(true);
        try {
            await GoogleSignin.hasPlayServices();
            const result = await GoogleSignin.signIn();
            if (!isSuccessResponse(result)) return;
            const idToken = result.data.idToken;
            if (!idToken) {
                toast.show(t('auth.google.notConfigured'), 'info');
                return;
            }
            const step = nextSignInStep(await loginWithGoogle(idToken), result.data.user.email);
            if (step.kind === 'verify') router.push({pathname: '/verify', params: step.params});
            else if (step.kind === 'pending-approval') toast.show(t('mobile.auth.pendingApproval'), 'info');
        } catch (failure) {
            if (isErrorWithCode(failure) && failure.code === statusCodes.IN_PROGRESS) return;
            await GoogleSignin.signOut().catch(() => undefined);
            toast.show(signInErrorText(failure, t), 'error');
        } finally {
            setBusy(false);
        }
    };

    const fullLabel = t(mode === 'signup' ? 'auth.google.signup_with' : 'auth.google.signin_with');
    return (
        <Pressable
            onPress={() => void signIn()}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={fullLabel}
            accessibilityState={{disabled: busy, busy}}
            style={({pressed}) => [styles.button, busy && styles.disabled, pressed && styles.pressed]}>
            {busy ? <ActivityIndicator size="small" color={colors.text}/> : <GoogleMark size={18}/>}
            <ScaledText numberOfLines={1} style={styles.label}>{t('auth.google.short')}</ScaledText>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        flex: 1,
        minHeight: 48,
        borderRadius: radius.control,
        borderWidth: 1,
        borderColor: colors.inputBorder,
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    label: {fontSize: font.body, fontWeight: '600', color: colors.text, flexShrink: 1},
    pressed: {opacity: 0.75},
    disabled: {opacity: 0.55},
});
