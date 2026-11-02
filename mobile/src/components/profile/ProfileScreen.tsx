import React, {useState} from 'react';
import {StyleSheet} from 'react-native';
import {RefreshCw, Save} from 'lucide-react-native';
import {AppText, Button, Card, ErrorState, LoadingState, Screen, SectionTitle, TextField} from '@/components/ui';
import {useProfile} from '@/hooks/profile/useProfile';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {profileError, type CustomerProfile, type ProfileErrors, type ProfileFields} from '@/shared/forms/profile/profile-form';
import {colors} from '@/styles/tokens';

function ProfileForm({profile, onReload}: { profile: CustomerProfile; onReload: () => void }) {
    const {t} = useI18n();
    const toast = useToast();
    const {update} = useProfile();
    const [fields, setFields] = useState<ProfileFields>({fullName: profile.fullName ?? '', phoneNumber: profile.phoneNumber ?? ''});
    const [errors, setErrors] = useState<ProfileErrors>({});
    const [message, setMessage] = useState<{ text: string; conflict: boolean } | null>(null);

    const save = () => {
        setErrors({});
        setMessage(null);
        update.mutate({fields, revision: profile.revision}, {
            onSuccess: () => toast.show(t('profile.saved'), 'success'),
            onError: error => {
                const result = profileError(error, t);
                if (result.fields) setErrors(result.fields);
                if (result.kind === 'phone') setErrors({phoneNumber: result.message});
                else setMessage({text: result.message, conflict: result.kind === 'conflict'});
            },
        });
    };

    return (
        <Card>
            <SectionTitle title={t('profile.personalInfo')}/>
            <TextField label={t('profile.fullName')} value={fields.fullName} onChangeText={fullName => setFields({...fields, fullName})} maxLength={100}
                       hint={t('profile.nameHint')} error={errors.fullName} autoComplete="name" textContentType="name"/>
            <TextField label={t('profile.phone')} value={fields.phoneNumber} onChangeText={phoneNumber => setFields({...fields, phoneNumber})} maxLength={20}
                       hint={t('profile.phoneHint')} error={errors.phoneNumber} keyboardType="phone-pad" autoComplete="tel"/>
            {message ? <AppText variant="small" style={styles.error}>{message.text}</AppText> : null}
            {message?.conflict && <Button label={t('profile.loadLatest')} icon={RefreshCw} tone="secondary" onPress={onReload}/>}
            <Button label={update.isPending ? t('profile.saving') : t('profile.saveChanges')} icon={Save} loading={update.isPending} onPress={save}/>
        </Card>
    );
}

export function ProfileScreen() {
    const {t} = useI18n();
    const {user} = useAuth();
    const {profile} = useProfile();
    if (profile.isPending) return <Screen><LoadingState label={t('profile.loading')}/></Screen>;
    if (!profile.data) return <Screen><ErrorState message={t('profile.loadError')} retryLabel={t('common.retry')} onRetry={() => void profile.refetch()}/></Screen>;
    return (
        <Screen>
            {/* Keyed by revision: loading the latest version replaces the draft. */}
            <ProfileForm key={profile.data.revision} profile={profile.data} onReload={() => void profile.refetch()}/>
            <Card>
                <SectionTitle title={t('profile.accountInfo')}/>
                <AppText variant="caption">{t('profile.username')}</AppText>
                <AppText>{user?.username}</AppText>
                <AppText variant="caption">Email</AppText>
                <AppText>{user?.email}</AppText>
                <AppText variant="caption">{t('profile.readonlyNote')}</AppText>
            </Card>
        </Screen>
    );
}

const styles = StyleSheet.create({
    error: {color: colors.danger},
});
