import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useRouter} from 'expo-router';
import Svg, {Path} from 'react-native-svg';
import {AppText, Button} from '@/components/ui';
import {GOOGLE_CLIENT_IDS} from '@/config/env';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {nextSignInStep, signInErrorText} from '@/forms/auth/sign-in-flow';
import {colors, spacing} from '@/styles/tokens';

type GoogleSignInModule = typeof import('@react-native-google-signin/google-signin');

/**
 * The native module only exists in builds made after the Google config plugin was enabled; Expo Go and
 * older builds get null here instead of a crash, and the button is not shown.
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

/** "Continue with Google" followed by an "or" divider; renders nothing when Google is not configured. */
export function GoogleSignInButton({mode = 'signin'}: { mode?: 'signin' | 'signup' }) {
    const {t} = useI18n();
    const {loginWithGoogle} = useAuth();
    const toast = useToast();
    const router = useRouter();
    const [busy, setBusy] = useState(false);

    if (!google) return null;
    const {GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes} = google;

    const signIn = async () => {
        setBusy(true);
        try {
            await GoogleSignin.hasPlayServices();
            const result = await GoogleSignin.signIn();
            if (!isSuccessResponse(result)) return; // the user closed Google's sheet
            const idToken = result.data.idToken;
            if (!idToken) throw new Error(t('auth.google.notConfigured'));
            const step = nextSignInStep(await loginWithGoogle(idToken), result.data.user.email);
            if (step.kind === 'verify') router.push({pathname: '/verify', params: step.params});
            else if (step.kind === 'pending-approval') toast.show(t('mobile.auth.pendingApproval'), 'info');
        } catch (failure) {
            if (isErrorWithCode(failure) && failure.code === statusCodes.IN_PROGRESS) return;
            // Signing out of Google lets the next attempt offer the account picker again.
            await GoogleSignin.signOut().catch(() => undefined);
            toast.show(signInErrorText(failure, t), 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <View style={styles.wrap}>
            <Button tone="secondary" icon={GoogleMark} label={t(mode === 'signup' ? 'auth.google.signup_with' : 'auth.google.signin_with')}
                    loading={busy} onPress={signIn} style={styles.button}/>
            <View style={styles.divider} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <View style={styles.line}/>
                <AppText variant="small" style={styles.or}>{t('auth.orDivider')}</AppText>
                <View style={styles.line}/>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {gap: spacing.md},
    button: {borderColor: colors.primary},
    divider: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    line: {flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border},
    or: {color: colors.muted, fontWeight: '600'},
});
