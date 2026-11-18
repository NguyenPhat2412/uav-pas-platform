import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useRouter} from 'expo-router';
import {BadgeCheck, Building2, Edit3, Package, Save, Store, Wallet, X} from 'lucide-react-native';
import {AppText, Badge, Button, Card, SectionTitle, TextField} from '@/components/ui';
import {useMyProviderProfile} from '@/hooks/marketplace/useProviderStudio';
import {useBillingProfile, useUpdateBillingProfile} from '@/hooks/profile/useProfile';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {
    BILLING_PROFILE_FIELD_KEYS,
    billingProfileDraftFromDetail,
    billingProfileFieldErrors,
    toBillingProfilePayload,
    type BillingProfileFieldErrors,
    type BillingProfileFields,
} from '@/shared/forms/profile/profile-form';
import {colors, radius, spacing} from '@/styles/tokens';

export function MobileBillingProfileCard() {
    const {t} = useI18n();
    const toast = useToast();
    const query = useBillingProfile();
    const update = useUpdateBillingProfile();
    const [draft, setDraft] = useState<BillingProfileFields | null>(null);
    const [errors, setErrors] = useState<BillingProfileFieldErrors>({});

    const startEdit = () => {
        if (!query.data) return;
        setErrors({});
        setDraft(billingProfileDraftFromDetail(query.data));
    };

    const cancelEdit = () => {
        setErrors({});
        setDraft(null);
    };

    const save = () => {
        if (!draft) return;
        setErrors({});
        update.mutate(toBillingProfilePayload(draft, query.data?.version ?? 0), {
            onSuccess: () => {
                setDraft(null);
                toast.show(t('enterprise.saved'), 'success');
            },
            onError: error => {
                const fieldMap = billingProfileFieldErrors(error);
                if (fieldMap) {
                    setErrors(fieldMap);
                    return;
                }
                const status = (error as { status?: number } | null)?.status;
                toast.show(
                    status === 409
                        ? t('enterprise.conflict')
                        : error instanceof Error
                          ? error.message
                          : t('enterprise.saveFailed'),
                    'error',
                );
                if (status === 409) void query.refetch();
            },
        });
    };

    return (
        <Card>
            <SectionTitle
                title={t('publicSite.profileHub.mobileOrgTitle')}
                action={
                    !draft && query.data ? (
                        <Button label={t('enterprise.edit')} size="sm" tone="secondary" icon={Edit3} onPress={startEdit}/>
                    ) : null
                }
            />
            <AppText variant="small">{t('publicSite.profileHub.mobileOrgSubtitle')}</AppText>

            {query.isPending ? (
                <AppText variant="small">{t('enterprise.loading')}</AppText>
            ) : query.isError ? (
                <View style={styles.errorBox}>
                    <AppText variant="small" style={styles.errorText}>{t('enterprise.loadError')}</AppText>
                    <Button label={t('common.retry')} size="sm" tone="secondary" onPress={() => void query.refetch()}/>
                </View>
            ) : draft ? (
                <View style={styles.formStack}>
                    {BILLING_PROFILE_FIELD_KEYS.map(key => (
                        <TextField
                            key={key}
                            label={t(`enterprise.field.${key}`)}
                            optional
                            value={draft[key]}
                            onChangeText={val => setDraft({...draft, [key]: val})}
                            error={errors[key]}
                            multiline={key === 'billingAddress'}
                            keyboardType={
                                key === 'taxCode'
                                    ? 'numbers-and-punctuation'
                                    : key === 'billingEmail'
                                      ? 'email-address'
                                      : key === 'emergencyContactPhone'
                                        ? 'phone-pad'
                                        : 'default'
                            }
                            autoCapitalize={key === 'billingEmail' ? 'none' : 'sentences'}
                            hint={
                                key === 'taxCode'
                                    ? t('enterprise.taxCodeHint')
                                    : key === 'billingEmail'
                                      ? t('enterprise.billingEmailHint')
                                      : undefined
                            }
                        />
                    ))}
                    <View style={styles.actionRow}>
                        <Button
                            label={t('enterprise.cancel')}
                            tone="secondary"
                            size="sm"
                            icon={X}
                            disabled={update.isPending}
                            onPress={cancelEdit}
                            style={styles.flexBtn}
                        />
                        <Button
                            label={update.isPending ? t('enterprise.saving') : t('enterprise.save')}
                            size="sm"
                            icon={Save}
                            loading={update.isPending}
                            onPress={save}
                            style={styles.flexBtn}
                        />
                    </View>
                </View>
            ) : query.data ? (
                <View style={styles.summaryBox}>
                    {BILLING_PROFILE_FIELD_KEYS.map(key => (
                        <View key={key} style={styles.summaryItem}>
                            <AppText variant="caption">{t(`enterprise.field.${key}`)}</AppText>
                            <AppText style={styles.summaryValue}>
                                {query.data?.[key] ||
                                    (key === 'billingEmail' ? t('enterprise.billingEmailDefault') : t('enterprise.empty'))}
                            </AppText>
                        </View>
                    ))}
                    <View style={styles.metaNote}>
                        <Building2 size={14} color={colors.primary}/>
                        <AppText variant="caption" style={styles.flexText}>{t('enterprise.invoiceNote')}</AppText>
                    </View>
                </View>
            ) : null}
        </Card>
    );
}

export function MobileSellerDossierCard() {
    const {t} = useI18n();
    const router = useRouter();
    const {data: provider, isPending} = useMyProviderProfile();

    const badge = () => {
        if (!provider) {
            return <Badge label={t('publicSite.profileHub.sellerStatusNone')}/>;
        }
        if (provider.verificationStatus === 'VERIFIED') {
            return (
                <Badge
                    label={t('publicSite.profileHub.sellerStatusVerified')}
                    background={colors.primaryLight}
                    color={colors.primary}
                    icon={BadgeCheck}
                />
            );
        }
        if (provider.verificationStatus === 'PENDING_REVIEW') {
            return (
                <Badge
                    label={t('publicSite.profileHub.sellerStatusPending')}
                    background={colors.warningLight}
                    color={colors.warning}
                />
            );
        }
        return <Badge label={t('publicSite.profileHub.sellerStatusDraft')}/>;
    };

    return (
        <Card>
            <SectionTitle title={t('publicSite.profileHub.sellerCardTitle')}/>
            {!isPending && badge()}
            <AppText variant="small">{t('publicSite.profileHub.sellerCardDesc')}</AppText>

            {provider ? (
                <View style={styles.summaryBox}>
                    <View style={styles.summaryItem}>
                        <AppText variant="caption">{provider.providerType}</AppText>
                        <AppText style={styles.summaryValue}>
                            {provider.displayName} · {provider.province} ({provider.serviceRadiusKm} km)
                        </AppText>
                    </View>
                    {provider.bankName ? (
                        <View style={styles.summaryItem}>
                            <AppText variant="caption">{provider.bankName}</AppText>
                            <AppText style={styles.summaryValue}>
                                {provider.bankAccountNumber || '—'} · {provider.bankAccountHolder || '—'}
                            </AppText>
                        </View>
                    ) : null}
                </View>
            ) : null}

            <Button
                label={t('publicSite.profileHub.sellerOpenStudio')}
                icon={Store}
                onPress={() => router.push('/customer/provider/onboarding')}
            />
            {provider ? (
                <View style={styles.actionRow}>
                    <Button
                        label={t('publicSite.profileHub.sellerManageListings')}
                        tone="secondary"
                        size="sm"
                        icon={Package}
                        onPress={() => router.push('/customer/provider/listings')}
                        style={styles.flexBtn}
                    />
                    <Button
                        label={t('publicSite.profileHub.sellerOpenWallet')}
                        tone="secondary"
                        size="sm"
                        icon={Wallet}
                        onPress={() => router.push('/customer/provider/wallet')}
                        style={styles.flexBtn}
                    />
                </View>
            ) : null}
        </Card>
    );
}

const styles = StyleSheet.create({
    formStack: {gap: spacing.sm, marginTop: spacing.xs},
    actionRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs},
    flexBtn: {flex: 1, minWidth: 140},
    summaryBox: {
        backgroundColor: colors.slateLight,
        borderRadius: radius.control,
        padding: spacing.md,
        gap: spacing.sm,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
    },
    summaryItem: {gap: 2},
    summaryValue: {fontWeight: '600'},
    metaNote: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingTop: spacing.xs,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border,
    },
    flexText: {flex: 1},
    errorBox: {
        backgroundColor: colors.dangerLight,
        borderRadius: radius.control,
        padding: spacing.md,
        gap: spacing.sm,
    },
    errorText: {color: colors.danger},
});
