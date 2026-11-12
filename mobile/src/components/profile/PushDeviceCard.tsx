import React, {useState} from 'react';
import {Linking, StyleSheet, View} from 'react-native';
import {BellOff, BellRing, ExternalLink, Smartphone} from 'lucide-react-native';
import {AppText, Badge, Button, Card, SectionTitle, TextField} from '@/components/ui';
import {useNotifications} from '@/hooks/notification/useNotifications';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {signInErrorText} from '@/forms/auth/sign-in-flow';
import {colors, radius, spacing} from '@/styles/tokens';

/** Device push notification registration card (native iOS/Android permissions + APNs/Expo Push endpoint). */
export function PushDeviceCard() {
    const {t} = useI18n();
    const toast = useToast();
    const {savedPushEndpoint, isSimulatedEndpoint, registerPushDevice, unregisterPushDevice} = useNotifications();
    const [showCustom, setShowCustom] = useState(false);
    const [customEndpoint, setCustomEndpoint] = useState('');
    const [permissionDenied, setPermissionDenied] = useState(false);
    const active = !!savedPushEndpoint;

    const handleRegister = () => {
        setPermissionDenied(false);
        const endpoint = showCustom && customEndpoint.trim() ? customEndpoint.trim() : undefined;
        registerPushDevice.mutate(
            {endpoint},
            {
                onSuccess: () => {
                    setCustomEndpoint('');
                    setShowCustom(false);
                    toast.show(t('mobile.push.registered'), 'success');
                },
                onError: error => {
                    if ((error as { code?: string } | null)?.code === 'PUSH_PERMISSION_DENIED') {
                        setPermissionDenied(true);
                        toast.show(t('mobile.push.permissionDenied'), 'error');
                        return;
                    }
                    toast.show(signInErrorText(error, t), 'error');
                },
            },
        );
    };

    const handleUnregister = () => {
        unregisterPushDevice.mutate(undefined, {
            onSuccess: () => toast.show(t('mobile.push.unregistered'), 'info'),
            onError: error => toast.show(signInErrorText(error, t), 'error'),
        });
    };

    return (
        <Card>
            <SectionTitle
                title={t('mobile.push.title')}
                action={
                    <Badge
                        label={active ? t('mobile.push.active') : t('mobile.push.inactive')}
                        background={active ? colors.slateDark : colors.slateLight}
                        color={active ? colors.white : colors.textSecondary}
                    />
                }
            />
            <AppText variant="small">{t('mobile.push.hint')}</AppText>
            {savedPushEndpoint ? (
                <View style={styles.endpointBlock}>
                    <View style={styles.endpointRow}>
                        <Smartphone size={16} color={colors.slateDark}/>
                        <AppText variant="caption" numberOfLines={1} selectable style={styles.flex}>
                            {savedPushEndpoint}
                        </AppText>
                    </View>
                    {isSimulatedEndpoint && (
                        <AppText variant="caption">{t('mobile.push.simulatorNotice')}</AppText>
                    )}
                </View>
            ) : null}
            {permissionDenied && !active && (
                <View style={styles.deniedBox}>
                    <AppText variant="small" style={styles.deniedText}>
                        {t('mobile.push.permissionDenied')}
                    </AppText>
                    <Button
                        label={t('mobile.push.openSettings')}
                        icon={ExternalLink}
                        tone="secondary"
                        onPress={() => void Linking.openSettings()}
                    />
                </View>
            )}
            {showCustom && (
                <TextField
                    label={t('mobile.push.endpointLabel')}
                    placeholder={t('mobile.push.endpointPlaceholder')}
                    value={customEndpoint}
                    onChangeText={setCustomEndpoint}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
            )}
            <View style={styles.actions}>
                {!active ? (
                    <>
                        <Button
                            label={t('mobile.push.enableButton')}
                            icon={BellRing}
                            loading={registerPushDevice.isPending}
                            onPress={handleRegister}
                            style={styles.flex}
                        />
                        <Button
                            label={showCustom ? t('common.cancel') : t('mobile.push.customButton')}
                            tone="ghost"
                            onPress={() => setShowCustom(current => !current)}
                        />
                    </>
                ) : (
                    <Button
                        label={t('mobile.push.disableButton')}
                        icon={BellOff}
                        tone="secondary"
                        loading={unregisterPushDevice.isPending}
                        onPress={handleUnregister}
                    />
                )}
            </View>
        </Card>
    );
}

const styles = StyleSheet.create({
    flex: {flex: 1},
    endpointBlock: {gap: 4},
    endpointRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 2},
    deniedBox: {
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: radius.control,
        backgroundColor: colors.warningLight,
        borderWidth: 1,
        borderColor: colors.warning,
    },
    deniedText: {color: colors.warning},
    actions: {flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap'},
});
