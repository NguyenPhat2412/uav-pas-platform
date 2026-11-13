import React, {useState} from 'react';
import {Linking, StyleSheet, Switch, View} from 'react-native';
import {ExternalLink, Smartphone} from 'lucide-react-native';
import {AppText, Button, Card} from '@/components/ui';
import {useNotifications} from '@/hooks/notification/useNotifications';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {signInErrorText} from '@/forms/auth/sign-in-flow';
import {colors, radius, spacing} from '@/styles/tokens';

/** Sleek, single-row device push notification toggle (native iOS/Android permissions + APNs/Expo Push). */
export function PushDeviceCard() {
    const {t} = useI18n();
    const toast = useToast();
    const {savedPushEndpoint, registerPushDevice, unregisterPushDevice} = useNotifications();
    const [permissionDenied, setPermissionDenied] = useState(false);
    const active = !!savedPushEndpoint;
    const busy = registerPushDevice.isPending || unregisterPushDevice.isPending;

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
        <Card style={styles.card}>
            <View style={styles.row}>
                <View style={[styles.iconBadge, active && styles.iconBadgeActive]}>
                    <Smartphone size={15} color={active ? colors.primary : colors.slateDark}/>
                </View>
                <View style={styles.textBlock}>
                    <AppText variant="small" numberOfLines={1} style={styles.title}>
                        {t('mobile.push.title')}
                    </AppText>
                    <AppText variant="caption" numberOfLines={1}>
                        {active ? t('mobile.push.compactActive') : t('mobile.push.compactOff')}
                    </AppText>
                </View>
                <Switch
                    style={styles.compactSwitch}
                    value={active}
                    onValueChange={on => (on ? handleRegister() : handleUnregister())}
                    disabled={busy}
                    trackColor={{true: colors.primary}}
                    accessibilityLabel={t('mobile.push.title')}
                />
            </View>
            {permissionDenied && !active && (
                <View style={styles.deniedRow}>
                    <AppText variant="caption" style={styles.deniedText} numberOfLines={2}>
                        {t('mobile.push.permissionDenied')}
                    </AppText>
                    <Button
                        size="sm"
                        tone="secondary"
                        icon={ExternalLink}
                        label={t('mobile.push.openSettings')}
                        onPress={() => void Linking.openSettings()}
                    />
                </View>
            )}
        </Card>
    );
}

const styles = StyleSheet.create({
    card: {paddingVertical: spacing.sm, paddingHorizontal: spacing.md, gap: spacing.xs},
    row: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs},
    iconBadge: {
        width: 30,
        height: 30,
        borderRadius: radius.control,
        backgroundColor: colors.slateLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconBadgeActive: {backgroundColor: colors.primaryLight},
    textBlock: {flex: 1, gap: 1},
    title: {fontWeight: '600', color: colors.text},
    compactSwitch: {transform: [{scaleX: 0.86}, {scaleY: 0.86}]},
    deniedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
        padding: spacing.sm,
        borderRadius: radius.control,
        backgroundColor: colors.warningLight,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.warning,
    },
    deniedText: {flex: 1, color: colors.warning},
});
