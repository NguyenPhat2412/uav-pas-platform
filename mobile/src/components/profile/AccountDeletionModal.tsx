import React, {useState} from 'react';
import {KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {AlertTriangle, ShieldAlert, Trash2, X} from 'lucide-react-native';
import {AppText, Badge, Button, ErrorState, LoadingState, TextField} from '@/components/ui';
import {useAccountDeletionPolicy, useDeleteOwnAccount} from '@/hooks/profile/useProfile';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {canSubmitAccountDeletion, signInErrorText} from '@/forms/auth/sign-in-flow';
import {colors, radius, spacing} from '@/styles/tokens';

export interface AccountDeletionModalProps {
    visible: boolean;
    onClose: () => void;
}

function AccountDeletionSheetBody({onClose}: { onClose: () => void }) {
    const {t} = useI18n();
    const toast = useToast();
    const {logout} = useAuth();
    const policyQuery = useAccountDeletionPolicy(true);
    const deleteMutation = useDeleteOwnAccount();

    const [phrase, setPhrase] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [reason, setReason] = useState('');
    const [errorText, setErrorText] = useState<string | null>(null);

    const policy = policyQuery.data;
    const needsPassword = !!(policy?.requirePassword && policy.hasPassword);
    const ready = canSubmitAccountDeletion(policy, {phrase, currentPassword, reason});

    const handleSubmit = () => {
        if (!policy || !ready || deleteMutation.isPending) return;
        setErrorText(null);
        deleteMutation.mutate(
            {
                confirmationPhrase: phrase.trim(),
                ...(needsPassword ? {currentPassword} : {}),
                ...(reason.trim() ? {reason: reason.trim()} : {}),
            },
            {
                onSuccess: res => {
                    onClose();
                    toast.show(res?.message || t('mobile.account.accountDeletion.deletedToast'), 'info');
                    void logout();
                },
                onError: error => setErrorText(signInErrorText(error, t)),
            },
        );
    };

    const handleClose = () => {
        if (!deleteMutation.isPending) onClose();
    };

    return (
        <SafeAreaView edges={['top', 'bottom']} style={styles.sheet}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
                <View style={styles.header}>
                    <View style={styles.headerTitle}>
                        <View style={styles.dangerIcon}>
                            <Trash2 size={16} color={colors.danger}/>
                        </View>
                        <AppText variant="title" numberOfLines={1}>
                            {t('mobile.account.accountDeletion.title')}
                        </AppText>
                    </View>
                    <Pressable
                        onPress={handleClose}
                        accessibilityRole="button"
                        accessibilityLabel={t('common.close')}
                        style={({pressed}) => [styles.closeButton, pressed && styles.pressed]}>
                        <X size={20} color={colors.slateDark}/>
                    </Pressable>
                </View>

                <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
                    {policyQuery.isLoading ? (
                        <LoadingState label={t('common.loading')}/>
                    ) : policyQuery.isError ? (
                        <ErrorState
                            message={signInErrorText(policyQuery.error, t)}
                            retryLabel={t('common.retry')}
                            onRetry={() => void policyQuery.refetch()}
                        />
                    ) : policy ? (
                        <>
                            <View style={styles.badges}>
                                <Badge
                                    icon={ShieldAlert}
                                    label={
                                        policy.mode === 'HARD_DELETE'
                                            ? t('mobile.account.accountDeletion.modeHardDelete')
                                            : t('mobile.account.accountDeletion.modeAnonymize')
                                    }
                                    background={colors.dangerLight}
                                    color={colors.danger}
                                />
                                {policy.activeMissionCount > 0 && (
                                    <Badge
                                        label={t('mobile.account.accountDeletion.activeMissionsCount', {count: policy.activeMissionCount})}
                                        background={colors.warningLight}
                                        color={colors.warning}
                                    />
                                )}
                                {policy.unpaidInvoiceCount > 0 && (
                                    <Badge
                                        label={t('mobile.account.accountDeletion.unpaidInvoicesCount', {count: policy.unpaidInvoiceCount})}
                                        background={colors.warningLight}
                                        color={colors.warning}
                                    />
                                )}
                            </View>

                            {policy.noticeMessage?.trim() ? (
                                <View style={styles.noticeBox}>
                                    <AppText variant="small" style={styles.noticeText}>
                                        {policy.noticeMessage}
                                    </AppText>
                                </View>
                            ) : null}

                            {!policy.enabled || !policy.eligible ? (
                                <View style={styles.ineligibleBox} accessibilityRole="alert">
                                    <AlertTriangle size={18} color={colors.warning}/>
                                    <AppText variant="small" style={styles.ineligibleText}>
                                        {policy.ineligibleReason || t('mobile.account.accountDeletion.disabledFallback')}
                                    </AppText>
                                </View>
                            ) : (
                                <View style={styles.form}>
                                    {policy.confirmationPhrase.trim() ? (
                                        <TextField
                                            label={t('mobile.account.accountDeletion.phraseLabel', {phrase: policy.confirmationPhrase})}
                                            placeholder={policy.confirmationPhrase}
                                            hint={t('mobile.account.accountDeletion.phraseHint', {phrase: policy.confirmationPhrase})}
                                            value={phrase}
                                            onChangeText={setPhrase}
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                        />
                                    ) : null}

                                    {needsPassword && (
                                        <TextField
                                            label={t('mobile.security.currentPassword')}
                                            value={currentPassword}
                                            onChangeText={setCurrentPassword}
                                            secureTextEntry
                                            autoComplete="current-password"
                                            textContentType="password"
                                        />
                                    )}

                                    <TextField
                                        label={
                                            policy.requireReason
                                                ? t('mobile.account.accountDeletion.reasonRequiredLabel')
                                                : t('mobile.account.accountDeletion.reasonOptionalLabel')
                                        }
                                        placeholder={t('mobile.account.accountDeletion.reasonPlaceholder')}
                                        value={reason}
                                        onChangeText={setReason}
                                        multiline
                                    />
                                </View>
                            )}

                            {errorText ? (
                                <AppText variant="small" style={styles.error}>
                                    {errorText}
                                </AppText>
                            ) : null}

                            <View style={styles.actions}>
                                <Button
                                    tone="danger"
                                    icon={Trash2}
                                    label={
                                        deleteMutation.isPending
                                            ? t('mobile.account.accountDeletion.deletingAction')
                                            : t('mobile.account.accountDeletion.confirmAction')
                                    }
                                    loading={deleteMutation.isPending}
                                    disabled={!ready}
                                    onPress={handleSubmit}
                                />
                                <Button
                                    tone="secondary"
                                    label={t('common.cancel')}
                                    disabled={deleteMutation.isPending}
                                    onPress={handleClose}
                                />
                            </View>
                        </>
                    ) : null}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

/**
 * 100% Admin-driven self-service account deletion sheet.
 * All rules (enabled, eligibility, confirmationPhrase, requirePassword, requireReason, mode, noticeMessage)
 * come live from GET /api/v1/users/profile/deletion-policy with zero hardcoded policy literals.
 */
export function AccountDeletionModal({visible, onClose}: AccountDeletionModalProps) {
    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            {visible ? <AccountDeletionSheetBody onClose={onClose}/> : null}
        </Modal>
    );
}

const styles = StyleSheet.create({
    flex: {flex: 1},
    sheet: {flex: 1, backgroundColor: colors.canvas},
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
        backgroundColor: colors.surface,
    },
    headerTitle: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1},
    dangerIcon: {width: 30, height: 30, borderRadius: radius.control, backgroundColor: colors.dangerLight, alignItems: 'center', justifyContent: 'center'},
    closeButton: {width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.slateLight},
    pressed: {opacity: 0.75},
    content: {padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md},
    badges: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
    noticeBox: {padding: spacing.md, borderRadius: radius.control, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border},
    noticeText: {color: colors.text},
    ineligibleBox: {flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radius.control, backgroundColor: colors.warningLight, borderWidth: 1, borderColor: colors.warning},
    ineligibleText: {flex: 1, color: colors.warning},
    form: {gap: spacing.md},
    error: {color: colors.danger},
    actions: {gap: spacing.sm, marginTop: spacing.xs},
});
