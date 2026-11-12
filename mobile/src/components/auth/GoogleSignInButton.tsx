import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useRouter} from 'expo-router';
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

/** "Continue with Google" followed by an "or" divider; renders nothing when Google is not configured. */
export function GoogleSignInButton({mode = 'signin'}: { mode?: 'signin' | 'signup' }) {
    const {t} = useI18n();
    const {loginWithGoogle} = useAuth();
    const toast = useToast();
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!google) return null;
    const {GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes} = google;

    const signIn = async () => {
        setError(null);
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
            setError(signInErrorText(failure, t));
        } finally {
            setBusy(false);
        }
    };

    return (
        <View style={styles.wrap}>
            <Button tone="secondary" label={t(mode === 'signup' ? 'auth.google.signup_with' : 'auth.google.signin_with')}
                    loading={busy} onPress={signIn}/>
            {error ? <AppText variant="small" style={styles.error}>{error}</AppText> : null}
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
    error: {color: colors.danger},
    divider: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    line: {flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border},
    or: {color: colors.muted, fontWeight: '600'},
});
