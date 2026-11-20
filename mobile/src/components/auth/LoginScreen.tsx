import React, {useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {Link, useRouter} from 'expo-router';
import {ChevronDown, ChevronUp, KeyRound} from 'lucide-react-native';
import {AuthLayout} from '@/components/auth/AuthLayout';
import {SocialSignInRow} from '@/components/auth/SocialSignInRow';
import {AppLogo} from '@/components/shared/BrandMark';
import {AppText, Button, KeyboardAnchor, TextField} from '@/components/ui';
import {nextSignInStep, signInErrorText} from '@/forms/auth/sign-in-flow';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {colors, radius, spacing} from '@/styles/tokens';

/** The UAV PAS emblem as the sign-in button's icon. */
function UavPasIcon() {
    return <AppLogo size={28}/>;
}

/**
 * Google-first Sign-In Screen (docs/overnight/README.md §3):
 * prioritizes 1-tap Google/Apple sign-in for customers & fleet owners, while keeping
 * admin-issued staff credentials accessible via a clean collapsible section.
 */
export function LoginScreen() {
    const {t} = useI18n();
    const {login} = useAuth();
    const toast = useToast();
    const router = useRouter();
    const [showStaffForm, setShowStaffForm] = useState(false);
    const [identity, setIdentity] = useState('');
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const submit = async () => {
        if (!identity.trim() || !password) {
            toast.show(t('mobile.auth.fillCredentials'), 'error');
            return;
        }
        setSubmitting(true);
        try {
            const step = nextSignInStep(
                await login(identity, password),
                identity.includes('@') ? identity.trim() : '',
            );
            if (step.kind === 'verify') router.push({pathname: '/verify', params: step.params});
            else if (step.kind === 'pending-approval') toast.show(t('mobile.auth.pendingApproval'), 'info');
        } catch (failure) {
            toast.show(signInErrorText(failure, t), 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const ToggleChevron = showStaffForm ? ChevronUp : ChevronDown;

    return (
        <AuthLayout title={t('customerAuth.loginHeading')}>
            <View style={styles.socialSection}>
                <AppText variant="caption" style={styles.socialHint} numberOfLines={1}>
                    {t('mobile.overnight.googlePrimaryHint')}
                </AppText>
                <SocialSignInRow mode="signin"/>
            </View>

            <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                    showStaffForm
                        ? t('mobile.overnight.hideStaffLoginToggle')
                        : t('mobile.overnight.staffLoginToggle')
                }
                accessibilityState={{expanded: showStaffForm}}
                onPress={() => setShowStaffForm(prev => !prev)}
                style={({pressed}) => [styles.staffToggle, pressed && styles.pressed]}>
                <KeyRound size={15} color={colors.slateDark}/>
                <AppText variant="caption" style={styles.staffToggleLabel} numberOfLines={1}>
                    {showStaffForm
                        ? t('mobile.overnight.hideStaffLoginToggle')
                        : t('mobile.overnight.staffLoginToggle')}
                </AppText>
                <ToggleChevron size={16} color={colors.muted}/>
            </Pressable>

            {showStaffForm ? (
                <View style={styles.staffBox}>
                    <TextField
                        label={t('authShared.identity')}
                        required
                        value={identity}
                        onChangeText={setIdentity}
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="username"
                        textContentType="username"
                        returnKeyType="next"
                    />
                    <TextField
                        label={t('authShared.password')}
                        required
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        autoComplete="current-password"
                        textContentType="password"
                        returnKeyType="go"
                        onSubmitEditing={submit}
                    />
                    <KeyboardAnchor>
                        <Button
                            label={submitting ? t('customerAuth.signingIn') : t('customerAuth.signIn')}
                            icon={UavPasIcon}
                            loading={submitting}
                            onPress={submit}
                        />
                    </KeyboardAnchor>
                    <Link href="/forgot-password" style={styles.link}>
                        {t('auth.forgotPassword')}
                    </Link>
                </View>
            ) : null}

            <View style={styles.links}>
                <View style={styles.row}>
                    <AppText variant="small">{t('customerAuth.noAccount')}</AppText>
                    <Link href="/register" style={styles.link}>
                        {t('customerAuth.register')}
                    </Link>
                </View>
            </View>
        </AuthLayout>
    );
}

const styles = StyleSheet.create({
    socialSection: {gap: spacing.xs},
    socialHint: {textAlign: 'center', color: colors.slateDark, fontWeight: '600'},
    staffToggle: {
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        borderRadius: radius.control,
        backgroundColor: colors.slateLight,
        borderWidth: 1,
        borderColor: colors.border,
    },
    staffToggleLabel: {flex: 1, color: colors.slateDark, fontWeight: '600'},
    staffBox: {gap: spacing.md},
    links: {gap: spacing.md, alignItems: 'center'},
    row: {flexDirection: 'row', gap: spacing.xs, alignItems: 'center'},
    link: {color: colors.primary, fontWeight: '600', textAlign: 'center'},
    pressed: {opacity: 0.75},
});
