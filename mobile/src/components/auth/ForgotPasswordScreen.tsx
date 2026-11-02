import React, {useState} from 'react';
import {StyleSheet} from 'react-native';
import {useRouter} from 'expo-router';
import {KeyRound, Mail} from 'lucide-react-native';
import {AppText, Button, TextField} from '@/components/ui';
import {AuthLayout} from '@/components/auth/AuthLayout';
import {useAuthFlows} from '@/hooks/auth/useAuthFlows';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {authFieldErrors, type ResetPasswordFormDraft} from '@/shared/forms/auth/auth-form';
import {normalizeCode, signInErrorText} from '@/forms/auth/sign-in-flow';
import {colors} from '@/styles/tokens';

/** Step 1 asks for the email; step 2 takes the emailed code and the new password. */
export function ForgotPasswordScreen() {
    const {t} = useI18n();
    const toast = useToast();
    const router = useRouter();
    const {forgotPassword, resetPassword} = useAuthFlows();
    const [email, setEmail] = useState('');
    const [draft, setDraft] = useState<ResetPasswordFormDraft | null>(null);
    const [fields, setFields] = useState<Record<string, string>>({});
    const [error, setError] = useState<string | null>(null);

    const requestCode = () => {
        setError(null);
        forgotPassword.mutate(email, {
            onSuccess: challenge => {
                toast.show(challenge.message, 'info');
                setDraft({challengeToken: challenge.challengeToken, email: challenge.email || email, code: '', newPassword: '', confirmPassword: ''});
            },
            onError: failure => setError(signInErrorText(failure, t)),
        });
    };

    const reset = () => {
        if (!draft) return;
        setError(null);
        setFields({});
        resetPassword.mutate(draft, {
            onSuccess: result => {
                toast.show(result.message || t('mobile.auth.passwordReset'), 'success');
                router.replace('/login');
            },
            onError: failure => {
                const rejected = authFieldErrors(failure, ['code', 'newPassword', 'confirmPassword']);
                if (rejected) setFields(rejected.fields);
                else setError(signInErrorText(failure, t));
            },
        });
    };

    if (!draft) {
        return (
            <AuthLayout title={t('mobile.auth.forgotTitle')} subtitle={t('mobile.auth.forgotHint')}>
                <TextField label={t('auth.email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"
                           autoComplete="email" textContentType="emailAddress" onSubmitEditing={requestCode}/>
                {error ? <AppText variant="small" style={styles.error}>{error}</AppText> : null}
                <Button label={t('mobile.auth.sendCode')} icon={Mail} loading={forgotPassword.isPending} onPress={requestCode}/>
                <Button tone="ghost" label={t('customerAuth.backToLogin')} onPress={() => router.replace('/login')}/>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout title={t('mobile.auth.newPasswordTitle')} subtitle={t('mobile.auth.emailHint', {email: draft.email})}>
            <TextField label={t('mobile.auth.code')} value={draft.code} keyboardType="number-pad" textContentType="oneTimeCode" maxLength={6}
                       onChangeText={value => setDraft({...draft, code: normalizeCode(value)})} error={fields.code}/>
            <TextField label={t('mobile.auth.newPassword')} value={draft.newPassword} secureTextEntry textContentType="newPassword"
                       onChangeText={value => setDraft({...draft, newPassword: value})} error={fields.newPassword}/>
            <TextField label={t('mobile.auth.confirmPassword')} value={draft.confirmPassword} secureTextEntry textContentType="newPassword"
                       onChangeText={value => setDraft({...draft, confirmPassword: value})} error={fields.confirmPassword}/>
            {error ? <AppText variant="small" style={styles.error}>{error}</AppText> : null}
            <Button label={t('mobile.auth.savePassword')} icon={KeyRound} loading={resetPassword.isPending} onPress={reset}/>
            <Button tone="ghost" label={t('customerAuth.backToLogin')} onPress={() => router.replace('/login')}/>
        </AuthLayout>
    );
}

const styles = StyleSheet.create({
    error: {color: colors.danger},
});
