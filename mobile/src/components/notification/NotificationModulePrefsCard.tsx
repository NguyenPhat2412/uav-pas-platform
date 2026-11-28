import React, {useState} from 'react';
import {Pressable, StyleSheet, Switch, View} from 'react-native';
import {ChevronDown, ChevronUp, Lock, SlidersHorizontal} from 'lucide-react-native';
import {AppText, styles as ui} from '@/components/ui';
import {
    useUserNotificationPreferenceActions,
    useUserNotificationPreferences,
} from '@/hooks/useNotifications';
import {
    pickLocalizedModuleCopy,
    toUpdateUserPreferencePayload,
} from '@/shared/forms/notification-policy-form';
import type {
    UpdateUserNotificationPreferenceInput,
    UserNotificationModulePreference,
} from '@/shared/types/notification.types';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {colors, radius, spacing} from '@/styles/tokens';

export function NotificationModulePrefsCard() {
    const {t, locale} = useI18n();
    const toast = useToast();
    const [open, setOpen] = useState(false);
    const query = useUserNotificationPreferences();
    const {updatePreference} = useUserNotificationPreferenceActions();

    const toggle = (
        row: UserNotificationModulePreference,
        patch: Partial<UpdateUserNotificationPreferenceInput>,
    ) => {
        updatePreference.mutate(
            {
                moduleCode: row.moduleCode,
                payload: toUpdateUserPreferencePayload(row, patch),
            },
            {
                onSuccess: () => toast.show(t('notificationCenter.savedPref'), 'success'),
            },
        );
    };

    return (
        <View style={[ui.card, styles.container]}>
            <Pressable
                accessibilityRole="button"
                onPress={() => setOpen(prev => !prev)}
                style={styles.header}
            >
                <View style={styles.headerLeft}>
                    <View style={styles.iconWrap}>
                        <SlidersHorizontal size={16} color={colors.slateDark}/>
                    </View>
                    <View style={styles.headerCopy}>
                        <AppText variant="title" style={styles.headerTitle}>
                            {t('notificationCenter.prefsTitle')}
                        </AppText>
                        <AppText variant="caption" numberOfLines={2}>
                            {t('notificationCenter.prefsSubtitle')}
                        </AppText>
                    </View>
                </View>
                {open ? (
                    <ChevronUp size={18} color={colors.muted}/>
                ) : (
                    <ChevronDown size={18} color={colors.muted}/>
                )}
            </Pressable>

            {open && (
                <View style={styles.list}>
                    {(query.data ?? []).map(row => {
                        const copy = pickLocalizedModuleCopy(row, locale);
                        const disabledGlobally = !row.moduleEnabled;
                        return (
                            <View key={row.moduleCode} style={styles.moduleRow}>
                                <View style={styles.moduleTop}>
                                    <View style={styles.moduleInfo}>
                                        <View style={styles.badgeRow}>
                                            <View style={styles.codeBadge}>
                                                <AppText variant="caption" style={styles.codeText}>
                                                    {row.moduleCode}
                                                </AppText>
                                            </View>
                                            {row.mandatory && (
                                                <View style={styles.mandatoryBadge}>
                                                    <Lock size={11} color={colors.danger}/>
                                                    <AppText
                                                        variant="caption"
                                                        style={styles.mandatoryText}
                                                    >
                                                        {t('notificationCenter.mandatoryBadge')}
                                                    </AppText>
                                                </View>
                                            )}
                                        </View>
                                        <AppText variant="title" style={styles.moduleName}>
                                            {copy.name}
                                        </AppText>
                                        <AppText variant="caption">{copy.description}</AppText>
                                    </View>
                                    <Switch
                                        value={!row.muted && row.moduleEnabled}
                                        disabled={
                                            disabledGlobally ||
                                            row.mandatory ||
                                            updatePreference.isPending
                                        }
                                        onValueChange={val => toggle(row, {muted: !val})}
                                        trackColor={{false: colors.border, true: colors.primary}}
                                    />
                                </View>

                                {!row.muted && row.moduleEnabled && (
                                    <View style={styles.channelsRow}>
                                        <View style={styles.channelToggle}>
                                            <AppText variant="caption">
                                                {t('notificationCenter.channelScreenPopup')}
                                            </AppText>
                                            <Switch
                                                value={
                                                    row.screenPopupEnabled &&
                                                    row.adminScreenPopupEnabled
                                                }
                                                disabled={
                                                    row.mandatory ||
                                                    !row.adminScreenPopupEnabled ||
                                                    updatePreference.isPending
                                                }
                                                onValueChange={val =>
                                                    toggle(row, {screenPopupEnabled: val})
                                                }
                                                trackColor={{
                                                    false: colors.border,
                                                    true: colors.primary,
                                                }}
                                            />
                                        </View>
                                        <View style={styles.channelToggle}>
                                            <AppText variant="caption">
                                                {t('notificationCenter.channelMobilePush')}
                                            </AppText>
                                            <Switch
                                                value={
                                                    row.mobilePushEnabled &&
                                                    row.adminMobilePushEnabled
                                                }
                                                disabled={
                                                    !row.adminMobilePushEnabled ||
                                                    updatePreference.isPending
                                                }
                                                onValueChange={val =>
                                                    toggle(row, {mobilePushEnabled: val})
                                                }
                                                trackColor={{
                                                    false: colors.border,
                                                    true: colors.primary,
                                                }}
                                            />
                                        </View>
                                        <View style={styles.channelToggle}>
                                            <AppText variant="caption">
                                                {t('notificationCenter.channelEmail')}
                                            </AppText>
                                            <Switch
                                                value={
                                                    row.emailEnabled && row.adminEmailEnabled
                                                }
                                                disabled={
                                                    !row.adminEmailEnabled ||
                                                    updatePreference.isPending
                                                }
                                                onValueChange={val =>
                                                    toggle(row, {emailEnabled: val})
                                                }
                                                trackColor={{
                                                    false: colors.border,
                                                    true: colors.primary,
                                                }}
                                            />
                                        </View>
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: spacing.md,
        gap: spacing.sm,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
    },
    headerLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    iconWrap: {
        width: 34,
        height: 34,
        borderRadius: radius.control,
        backgroundColor: colors.canvas,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCopy: {
        flex: 1,
        gap: 2,
    },
    headerTitle: {
        fontWeight: '700',
    },
    list: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border,
        paddingTop: spacing.sm,
        gap: spacing.sm,
    },
    moduleRow: {
        paddingVertical: spacing.xs,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
        gap: spacing.xs,
    },
    moduleTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: spacing.sm,
    },
    moduleInfo: {
        flex: 1,
        gap: 2,
    },
    badgeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: spacing.xs,
    },
    codeBadge: {
        paddingHorizontal: spacing.xs,
        paddingVertical: 1,
        borderRadius: radius.control,
        backgroundColor: colors.slateLight,
    },
    codeText: {
        fontWeight: '700',
        color: colors.slateDark,
    },
    mandatoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: spacing.xs,
        paddingVertical: 1,
        borderRadius: radius.control,
        backgroundColor: colors.dangerLight,
    },
    mandatoryText: {
        fontWeight: '700',
        color: colors.danger,
    },
    moduleName: {
        fontWeight: '700',
    },
    channelsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
        paddingTop: spacing.xs,
    },
    channelToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
});
