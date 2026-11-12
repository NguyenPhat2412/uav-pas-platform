import React, {useState} from 'react';
import {Linking, StyleSheet, Switch, View} from 'react-native';
import {ExternalLink, Smartphone} from 'lucide-react-native';
import {AppText, Button, Card, SectionTitle} from '@/components/ui';
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
    const [permissionDenied, setPermissionDenied] = useState(false);
    const active = !!savedPushEndpoint;

    const handleRegister = () => {
        setPermissionDenied(false);
        registerPushDevice.mutate(
            {},
            {
                onSuccess: () => toast.show(t('mobile.push.registered'), 'success'),
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
                    // The system switch: on iOS 26 it is drawn in Liquid Glass by the OS itself.
                    <Switch
                        value={active}
                        onValueChange={on => (on ? handleRegister() : handleUnregister())}
                        disabled={registerPushDevice.isPending || unregisterPushDevice.isPending}
                        trackColor={{true: colors.primary}}
                        accessibilityLabel={t('mobile.push.title')}
                    />
                }
            />
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
});
