import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {Link, useRouter} from 'expo-router';
import {LogIn} from 'lucide-react-native';
import {AppText, Button, TextField} from '@/components/ui';
import {AuthLayout} from '@/components/auth/AuthLayout';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {nextSignInStep, signInErrorText} from '@/forms/auth/sign-in-flow';
import {colors, spacing} from '@/styles/tokens';

export function LoginScreen() {
    const {t} = useI18n();
    const {login} = useAuth();
    const toast = useToast();
    const router = useRouter();
    const [identity, setIdentity] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const submit = async () => {
        if (!identity.trim() || !password) {
            setError(t('mobile.auth.fillCredentials'));
            return;
        }
        setError(null);
        setSubmitting(true);
        try {
            const step = nextSignInStep(await login(identity, password), identity.includes('@') ? identity.trim() : '');
            if (step.kind === 'verify') router.push({pathname: '/verify', params: step.params});
            else if (step.kind === 'pending-approval') toast.show(t('mobile.auth.pendingApproval'), 'info');
            // 'done': AuthProvider switched to signed-in and the auth layout redirects into the portal.
        } catch (failure) {
            setError(signInErrorText(failure, t));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AuthLayout title={t('customerAuth.loginHeading')} subtitle={t('customerAuth.loginIntro')}>
            <TextField label={t('authShared.identity')} value={identity} onChangeText={setIdentity} autoCapitalize="none"
                       autoCorrect={false} autoComplete="username" textContentType="username" returnKeyType="next"/>
            <TextField label={t('authShared.password')} value={password} onChangeText={setPassword} secureTextEntry
                       autoComplete="current-password" textContentType="password" returnKeyType="go" onSubmitEditing={submit}/>
            {error ? <AppText variant="small" style={styles.error}>{error}</AppText> : null}
            <Button label={submitting ? t('customerAuth.signingIn') : t('customerAuth.signIn')} icon={LogIn} loading={submitting} onPress={submit}/>
            <View style={styles.links}>
                <Link href="/forgot-password" style={styles.link}>{t('auth.forgotPassword')}</Link>
                <View style={styles.row}>
                    <AppText variant="small">{t('customerAuth.noAccount')}</AppText>
                    <Link href="/register" style={styles.link}>{t('customerAuth.register')}</Link>
                </View>
            </View>
        </AuthLayout>
    );
}

const styles = StyleSheet.create({
    error: {color: colors.danger},
    links: {gap: spacing.md, alignItems: 'center'},
    row: {flexDirection: 'row', gap: spacing.xs, alignItems: 'center'},
    link: {color: colors.primary, fontWeight: '600'},
});
