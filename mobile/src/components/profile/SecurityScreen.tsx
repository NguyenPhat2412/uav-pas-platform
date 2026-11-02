import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {KeyRound, ShieldCheck, ShieldOff} from 'lucide-react-native';
import {AppText, Badge, Button, Card, Screen, SectionTitle, TextField} from '@/components/ui';
import {useProfile} from '@/hooks/profile/useProfile';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {canSubmitPasswordChange, emptyPasswordChangeDraft, passwordChangeFieldErrors, toPasswordChangePayload, type PasswordChangeDraft, type PasswordChangeFieldErrors} from '@/shared/forms/profile/profile-form';
import {signInErrorText} from '@/forms/auth/sign-in-flow';
import {colors, spacing} from '@/styles/tokens';

export function SecurityScreen() {
    const {t} = useI18n();
    const toast = useToast();
    const {logout} = useAuth();
    const {twoFactor, changePassword} = useProfile();
    const [draft, setDraft] = useState<PasswordChangeDraft>(emptyPasswordChangeDraft);
    const [errors, setErrors] = useState<PasswordChangeFieldErrors>({});
    const [message, setMessage] = useState<string | null>(null);

    const submit = () => {
        setErrors({});
        setMessage(null);
        changePassword.mutate(toPasswordChangePayload(draft), {
            onSuccess: () => {
                // The backend signs every device out after a password change; leave cleanly instead of failing later.
                toast.show(t('mobile.security.passwordChanged'), 'success');
                void logout();
            },
            onError: error => {
                const fields = passwordChangeFieldErrors(error);
                if (fields) setErrors(fields);
                else setMessage(signInErrorText(error, t));
            },
        });
    };

    const status = twoFactor.data;
    return (
        <Screen>
            <Card>
                <SectionTitle title={t('mobile.security.twoFactor')}
                              action={status ? <Badge icon={status.enabled ? ShieldCheck : ShieldOff}
                                                      label={status.enabled ? t('mobile.security.on') : t('mobile.security.off')}
                                                      background={status.enabled ? colors.slateDark : colors.slateLight}
                                                      color={status.enabled ? colors.white : colors.textSecondary}/> : undefined}/>
                {status?.enabled && <AppText variant="small">{status.method === 'TOTP' ? t('mobile.security.methodTotp') : t('mobile.security.methodEmail', {email: status.maskedEmail})}</AppText>}
                <AppText variant="caption">{t('mobile.security.manageOnWeb')}</AppText>
            </Card>
            <Card>
                <SectionTitle title={t('mobile.security.changePassword')}/>
                <TextField label={t('mobile.security.currentPassword')} value={draft.currentPassword} secureTextEntry textContentType="password"
                           onChangeText={currentPassword => setDraft({...draft, currentPassword})} error={errors.currentPassword}/>
                <TextField label={t('mobile.auth.newPassword')} value={draft.newPassword} secureTextEntry textContentType="newPassword"
                           onChangeText={newPassword => setDraft({...draft, newPassword})} error={errors.newPassword}/>
                <TextField label={t('mobile.auth.confirmPassword')} value={draft.confirmPassword} secureTextEntry textContentType="newPassword"
                           onChangeText={confirmPassword => setDraft({...draft, confirmPassword})} error={errors.confirmPassword}/>
                {message ? <AppText variant="small" style={styles.error}>{message}</AppText> : null}
                <View style={styles.note}><AppText variant="caption">{t('mobile.security.signOutNote')}</AppText></View>
                <Button label={t('mobile.auth.savePassword')} icon={KeyRound} disabled={!canSubmitPasswordChange(draft)} loading={changePassword.isPending} onPress={submit}/>
            </Card>
        </Screen>
    );
}

const styles = StyleSheet.create({
    error: {color: colors.danger},
    note: {paddingVertical: spacing.xs},
});
