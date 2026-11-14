import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {Link, useRouter} from 'expo-router';
import {UserPlus} from 'lucide-react-native';
import {Button, KeyboardAnchor, TextField} from '@/components/ui';
import {AuthLayout} from '@/components/auth/AuthLayout';
import {SocialSignInRow} from '@/components/auth/SocialSignInRow';
import {useAuthFlows} from '@/hooks/auth/useAuthFlows';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {authFieldErrors, type RegisterFormDraft} from '@/shared/forms/auth/auth-form';
import {registerVerifyParams, signInErrorText} from '@/forms/auth/sign-in-flow';
import {colors, spacing} from '@/styles/tokens';

const FIELD_ORDER: (keyof RegisterFormDraft)[] = ['username', 'email', 'phoneNumber', 'password', 'confirmPassword'];

export function RegisterScreen() {
    const {t} = useI18n();
    const toast = useToast();
    const router = useRouter();
    const {register} = useAuthFlows();
    const [draft, setDraft] = useState<RegisterFormDraft>({username: '', email: '', phoneNumber: '', password: '', confirmPassword: ''});
    const [fields, setFields] = useState<Record<string, string>>({});

    const set = (name: keyof RegisterFormDraft) => (value: string) => setDraft(current => ({...current, [name]: value}));

    const submit = () => {
        setFields({});
        // The backend owns every rule (length, format, uniqueness) and answers per field.
        register.mutate(draft, {
            onSuccess: challenge => {
                toast.show(challenge.message, 'info');
                router.push({pathname: '/verify', params: registerVerifyParams(challenge)});
            },
            onError: failure => {
                const rejected = authFieldErrors(failure, FIELD_ORDER);
                if (rejected) setFields(rejected.fields);
                else toast.show(signInErrorText(failure, t), 'error');
            },
        });
    };

    return (
        <AuthLayout title={t('customerAuth.registerHeading')} subtitle={t('customerAuth.registerIntro')}>
            <SocialSignInRow mode="signup"/>
            <TextField label={t('customerAuth.username')} value={draft.username} onChangeText={set('username')} autoCapitalize="none"
                       autoCorrect={false} autoComplete="username-new" error={fields.username}/>
            <TextField label={t('auth.email')} value={draft.email} onChangeText={set('email')} autoCapitalize="none" keyboardType="email-address"
                       autoComplete="email" textContentType="emailAddress" error={fields.email}/>
            <TextField label={t('customerAuth.phone')} value={draft.phoneNumber} onChangeText={set('phoneNumber')} keyboardType="phone-pad"
                       autoComplete="tel" error={fields.phoneNumber}/>
            <TextField label={t('customerAuth.password')} value={draft.password} onChangeText={set('password')} secureTextEntry
                       autoComplete="new-password" textContentType="newPassword" error={fields.password}/>
            <TextField label={t('mobile.auth.confirmPassword')} value={draft.confirmPassword} onChangeText={set('confirmPassword')} secureTextEntry
                       autoComplete="new-password" textContentType="newPassword" error={fields.confirmPassword}/>
            <KeyboardAnchor><Button label={register.isPending ? t('customerAuth.creating') : t('customerAuth.createAccount')} icon={UserPlus}
                    loading={register.isPending} onPress={submit}/></KeyboardAnchor>
            <View style={styles.links}>
                <Link href="/login" style={styles.link}>{t('customerAuth.backToLogin')}</Link>
            </View>
        </AuthLayout>
    );
}

const styles = StyleSheet.create({
    links: {alignItems: 'center', gap: spacing.sm},
    link: {color: colors.primary, fontWeight: '600'},
});
