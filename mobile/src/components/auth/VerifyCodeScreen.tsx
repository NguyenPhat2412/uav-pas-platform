import React, {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {KeyRound, RotateCw, ShieldCheck} from 'lucide-react-native';
import {AppText, Button, TextField} from '@/components/ui';
import {AuthLayout} from '@/components/auth/AuthLayout';
import {useAuthFlows} from '@/hooks/auth/useAuthFlows';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {nextSignInStep, normalizeCode, RESEND_COOLDOWN_SECONDS, signInErrorText, type VerifyParams} from '@/forms/auth/sign-in-flow';
import {colors, spacing} from '@/styles/tokens';

/** The six-digit code of a 2FA sign-in (email or authenticator app) or of a new account's email verification. */
export function VerifyCodeScreen() {
    const {t} = useI18n();
    const toast = useToast();
    const router = useRouter();
    const {completeAuth} = useAuth();
    const {verify, resend} = useAuthFlows();
    const initial = useLocalSearchParams<VerifyParams>();
    const [params, setParams] = useState<VerifyParams>({
        purpose: initial.purpose === 'register' ? 'register' : 'login',
        challengeToken: initial.challengeToken ?? '',
        email: initial.email ?? '',
        maskedEmail: initial.maskedEmail ?? '',
        method: initial.method === 'TOTP' ? 'TOTP' : 'EMAIL',
    });
    const [code, setCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [cooldown, setCooldown] = useState(params.method === 'EMAIL' ? RESEND_COOLDOWN_SECONDS : 0);

    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setTimeout(() => setCooldown(seconds => seconds - 1), 1000);
        return () => clearTimeout(timer);
    }, [cooldown]);

    const submit = () => {
        if (code.length !== 6) {
            setError(t('mobile.auth.codeLength'));
            return;
        }
        setError(null);
        verify.mutate({params, code}, {
            onSuccess: async response => {
                const step = nextSignInStep(response, params.email);
                if (step.kind === 'pending-approval') {
                    toast.show(t('mobile.auth.pendingApproval'), 'info');
                    router.replace('/login');
                    return;
                }
                if (step.kind === 'verify') {
                    // Email verified, and the account also has 2FA: one more code.
                    setParams(step.params);
                    setCode('');
                    return;
                }
                await completeAuth(response);
                toast.show(t('mobile.auth.welcome', {name: response.user?.fullName || response.user?.username || ''}), 'success');
            },
            onError: failure => setError(signInErrorText(failure, t)),
        });
    };

    const resendCode = () => {
        setError(null);
        resend.mutate({params, purpose: params.purpose === 'register' ? 'REGISTER_VERIFY' : 'LOGIN_2FA'}, {
            onSuccess: challenge => {
                // Asking for an emailed code also switches an authenticator-app sign-in to email.
                setParams(current => ({...current, challengeToken: challenge.challengeToken, maskedEmail: challenge.maskedEmail, method: 'EMAIL'}));
                setCode('');
                setCooldown(RESEND_COOLDOWN_SECONDS);
                toast.show(challenge.message, 'info');
            },
            onError: failure => setError(signInErrorText(failure, t)),
        });
    };

    const subtitle = params.method === 'TOTP'
        ? t('mobile.auth.totpHint')
        : t('mobile.auth.emailHint', {email: params.maskedEmail || params.email});

    return (
        <AuthLayout title={params.purpose === 'register' ? t('mobile.auth.verifyEmailTitle') : t('mobile.auth.twoFactorTitle')} subtitle={subtitle}>
            <TextField label={t('mobile.auth.code')} value={code} onChangeText={value => setCode(normalizeCode(value))} keyboardType="number-pad"
                       autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={6} autoFocus style={styles.code}/>
            {error ? <AppText variant="small" style={styles.error}>{error}</AppText> : null}
            <Button label={t('mobile.auth.verify')} icon={ShieldCheck} loading={verify.isPending} onPress={submit}/>
            <View style={styles.actions}>
                <Button tone="ghost" icon={params.method === 'TOTP' ? KeyRound : RotateCw}
                        label={params.method === 'TOTP' ? t('mobile.auth.useEmailCode')
                            : cooldown > 0 ? t('mobile.auth.resendIn', {seconds: cooldown}) : t('mobile.auth.resend')}
                        disabled={cooldown > 0} loading={resend.isPending} onPress={resendCode}/>
                <Button tone="ghost" label={t('customerAuth.backToLogin')} onPress={() => router.replace('/login')}/>
            </View>
        </AuthLayout>
    );
}

const styles = StyleSheet.create({
    code: {},
    error: {color: colors.danger},
    actions: {gap: spacing.xs},
});
