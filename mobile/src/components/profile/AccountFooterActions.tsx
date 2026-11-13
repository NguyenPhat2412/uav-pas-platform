import React, {useState} from 'react';
import {Alert, Pressable, StyleSheet, View} from 'react-native';
import {LogOut, UserX} from 'lucide-react-native';
import {AppText} from '@/components/ui';
import {AccountDeletionModal} from '@/components/profile/AccountDeletionModal';
import {useAccountDeletionPolicy} from '@/hooks/profile/useProfile';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {colors, spacing} from '@/styles/tokens';

/**
 * Compact horizontal footer pills for signing out of this phone and opening
 * the Admin-governed self-service account deletion sheet.
 */
export function AccountFooterActions() {
    const {t} = useI18n();
    const {logout} = useAuth();
    const deletionPolicy = useAccountDeletionPolicy(true);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const confirmLogout = () =>
        Alert.alert(t('common.logout'), t('mobile.account.logoutQuestion'), [
            {text: t('common.cancel'), style: 'cancel'},
            {text: t('common.logout'), style: 'destructive', onPress: () => void logout()},
        ]);

    const showDelete = deletionPolicy.data?.enabled !== false;

    return (
        <View style={styles.row}>
            <Pressable
                onPress={confirmLogout}
                accessibilityRole="button"
                accessibilityLabel={t('common.logout')}
                style={({pressed}) => [styles.pill, styles.logoutPill, pressed && styles.pressed]}>
                <LogOut size={14} color={colors.slateDark}/>
                <AppText variant="small" style={styles.logoutText}>{t('common.logout')}</AppText>
            </Pressable>
            {showDelete && (
                <Pressable
                    onPress={() => setDeleteOpen(true)}
                    accessibilityRole="button"
                    accessibilityLabel={t('mobile.account.accountDeletion.trigger')}
                    style={({pressed}) => [styles.pill, styles.deletePill, pressed && styles.pressed]}>
                    <UserX size={14} color={colors.danger}/>
                    <AppText variant="small" style={styles.deleteText}>
                        {t('mobile.account.accountDeletion.trigger')}
                    </AppText>
                </Pressable>
            )}
            <AccountDeletionModal visible={deleteOpen} onClose={() => setDeleteOpen(false)}/>
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        gap: spacing.sm,
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: spacing.md,
        paddingVertical: 7,
        borderRadius: 999,
        borderWidth: 1,
    },
    logoutPill: {backgroundColor: colors.surface, borderColor: colors.inputBorder},
    logoutText: {color: colors.slateDark, fontWeight: '600'},
    deletePill: {backgroundColor: colors.dangerLight, borderColor: colors.border},
    deleteText: {color: colors.danger, fontWeight: '600'},
    pressed: {opacity: 0.72},
});
