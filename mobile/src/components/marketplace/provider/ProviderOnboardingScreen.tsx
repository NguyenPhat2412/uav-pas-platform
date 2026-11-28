import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {Building2, FileCheck2, Plus, Save, Send, Trash2, UserRound} from 'lucide-react-native';
import {
    AppText,
    Badge,
    Button,
    Card,
    EmptyState,
    LoadingState,
    Screen,
    SectionTitle,
    TextField,
} from '@/components/ui';
import {GlassSelectCards, GlassSelectField, type GlassOption} from '@/components/ui/GlassSelect';
import {
    useMyProviderProfile,
    useProviderStudioMutations,
} from '@/hooks/useProviderStudio';
import {useSiteInfo} from '@/hooks/useSiteInfo';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {
    DOCUMENT_TYPE_OPTIONS,
    extractActionableError,
    initialOnboardingForm,
    verificationStatusLabel,
} from '@/shared/forms/marketplace-forms';
import type {
    ProviderDocumentType,
    ProviderOnboardingInput,
    ProviderType,
} from '@/shared/types/marketplace.types';
import {colors, spacing} from '@/styles/tokens';

export function ProviderOnboardingScreen() {
    const {t} = useI18n();
    const toast = useToast();
    const {defaultServiceRadiusKm} = useSiteInfo();
    const profileQuery = useMyProviderProfile();
    const mutations = useProviderStudioMutations();
    const profile = profileQuery.data;

    const [overrides, setOverrides] = useState<Partial<ProviderOnboardingInput>>({});
    const [docType, setDocType] = useState<ProviderDocumentType>('PILOT_CERTIFICATE');
    const [docTitle, setDocTitle] = useState('');
    const [docNumber, setDocNumber] = useState('');
    const [docUrl, setDocUrl] = useState('');

    if (profileQuery.isPending) {
        return (
            <Screen>
                <LoadingState/>
            </Screen>
        );
    }

    const form: ProviderOnboardingInput = {
        ...initialOnboardingForm(profile, defaultServiceRadiusKm),
        ...overrides,
    };

    const set = <K extends keyof ProviderOnboardingInput>(
        key: K,
        value: ProviderOnboardingInput[K],
    ) => setOverrides(prev => ({...prev, [key]: value}));

    const providerTypeOptions: GlassOption<ProviderType>[] = [
        {
            value: 'COMPANY',
            label: t('mobile.provider.typeCompany'),
            description: t('mobile.provider.typeCompanyDesc'),
            icon: Building2,
        },
        {
            value: 'INDIVIDUAL',
            label: t('mobile.provider.typeIndividual'),
            description: t('mobile.provider.typeIndividualDesc'),
            icon: UserRound,
        },
    ];

    const docTypeOptions: GlassOption<ProviderDocumentType>[] = DOCUMENT_TYPE_OPTIONS.map(opt => ({
        value: opt.value,
        label: opt.label,
        icon: FileCheck2,
    }));

    const submitProfile = (submitForReview: boolean) => {
        if (!form.displayName.trim()) {
            toast.show(t('mobile.provider.displayNameRequired'), 'error');
            return;
        }
        mutations.upsertProfile.mutate(
            {
                ...form,
                displayName: form.displayName.trim(),
                province: form.province.trim() || 'Hà Nội',
                submitForReview,
            },
            {
                onSuccess: () =>
                    toast.show(
                        submitForReview
                            ? t('mobile.provider.submittedKycToast')
                            : t('mobile.provider.savedProfileToast'),
                        'success',
                    ),
                onError: err =>
                    toast.show(
                        extractActionableError(err, t('mobile.provider.saveError')),
                        'error',
                    ),
            },
        );
    };

    const handleAddDoc = () => {
        if (!docTitle.trim()) {
            toast.show(t('mobile.provider.docTitleRequired'), 'error');
            return;
        }
        const trimmedUrl = docUrl.trim();
        if (trimmedUrl && !/^https:\/\//i.test(trimmedUrl)) {
            toast.show(t('mobile.provider.httpsUrlRequired'), 'error');
            return;
        }
        mutations.addDocument.mutate(
            {
                documentType: docType,
                title: docTitle.trim(),
                documentNumber: docNumber.trim() || undefined,
                fileUrl: trimmedUrl || undefined,
            },
            {
                onSuccess: () => {
                    setDocTitle('');
                    setDocNumber('');
                    setDocUrl('');
                    toast.show(t('mobile.provider.docAddedToast'), 'success');
                },
                onError: err =>
                    toast.show(
                        extractActionableError(err, t('mobile.provider.saveError')),
                        'error',
                    ),
            },
        );
    };

    return (
        <Screen
            onRefresh={() => void profileQuery.refetch()}
            refreshing={profileQuery.isRefetching}>
            <Card>
                <SectionTitle
                    title={t('mobile.provider.kycSectionTitle')}
                    action={
                        <Badge
                            label={verificationStatusLabel(profile?.verificationStatus)}
                            background={
                                profile?.verificationStatus === 'VERIFIED'
                                    ? colors.primaryLight
                                    : colors.warningLight
                            }
                            color={
                                profile?.verificationStatus === 'VERIFIED'
                                    ? colors.primary
                                    : colors.warning
                            }
                        />
                    }
                />

                <GlassSelectCards<ProviderType>
                    label={t('mobile.provider.entityTypeLabel')} required
                    columns={2}
                    value={form.providerType}
                    options={providerTypeOptions}
                    onChange={val => set('providerType', val)}
                />

                <TextField
                    label={t('mobile.provider.displayNameLabel')} required
                    value={form.displayName}
                    onChangeText={val => set('displayName', val)}
                    maxLength={140}
                />
                <TextField
                    label={t('mobile.provider.taxOrIdLabel')} optional
                    value={form.taxOrIdNumber ?? ''}
                    onChangeText={val => set('taxOrIdNumber', val)}
                    maxLength={60}
                />
                <TextField
                    label={t('mobile.provider.flightLicenseLabel')} optional
                    value={form.flightLicenseNumber ?? ''}
                    onChangeText={val => set('flightLicenseNumber', val)}
                    maxLength={80}
                />
                <View style={styles.row}>
                    <View style={styles.flex}>
                        <TextField
                            label={t('mobile.provider.provinceLabel')} required
                            value={form.province}
                            onChangeText={val => set('province', val)}
                        />
                    </View>
                    <View style={styles.flex}>
                        <TextField
                            label={t('mobile.provider.radiusKmLabel')} optional
                            keyboardType="number-pad"
                            value={String(form.serviceRadiusKm ?? defaultServiceRadiusKm)}
                            onChangeText={val => set('serviceRadiusKm', Number(val) || 50)}
                        />
                    </View>
                </View>
                <TextField
                    label={t('mobile.provider.phoneLabel')} optional
                    keyboardType="phone-pad"
                    value={form.contactPhone ?? ''}
                    onChangeText={val => set('contactPhone', val)}
                />
                <TextField
                    label={t('mobile.provider.bankNameLabel')} optional
                    value={form.bankName ?? ''}
                    onChangeText={val => set('bankName', val)}
                />
                <TextField
                    label={t('mobile.provider.bankAccountLabel')} optional
                    keyboardType="number-pad"
                    value={form.bankAccountNumber ?? ''}
                    onChangeText={val => set('bankAccountNumber', val)}
                />
                <TextField
                    label={t('mobile.provider.bankHolderLabel')} optional
                    autoCapitalize="characters"
                    value={form.bankAccountHolder ?? ''}
                    onChangeText={val => set('bankAccountHolder', val)}
                />
                <TextField
                    label={t('mobile.provider.bioLabel')} optional
                    multiline
                    value={form.bio ?? ''}
                    onChangeText={val => set('bio', val)}
                    maxLength={1000}
                />

                <View style={styles.actions}>
                    <Button
                        icon={Send}
                        loading={mutations.upsertProfile.isPending}
                        label={t('mobile.provider.submitKycBtn')}
                        onPress={() => submitProfile(true)}
                    />
                    <Button
                        tone="secondary"
                        icon={Save}
                        disabled={mutations.upsertProfile.isPending}
                        label={t('mobile.missions.saveDraft')}
                        onPress={() => submitProfile(false)}
                    />
                </View>
            </Card>

            <Card>
                <SectionTitle title={t('mobile.provider.docsSectionTitle')}/>
                <GlassSelectField<ProviderDocumentType>
                    label={t('mobile.provider.docTypeLabel')} required
                    sheetTitle={t('mobile.provider.docTypeLabel')}
                    value={docType}
                    options={docTypeOptions}
                    onChange={setDocType}
                />
                <TextField
                    label={t('mobile.provider.docTitleLabel')} required
                    value={docTitle}
                    onChangeText={setDocTitle}
                />
                <TextField
                    label={t('mobile.provider.docNumberLabel')} optional
                    value={docNumber}
                    onChangeText={setDocNumber}
                />
                <TextField
                    label={t('mobile.provider.docUrlLabel')} optional
                    placeholder="https://..."
                    autoCapitalize="none"
                    value={docUrl}
                    onChangeText={setDocUrl}
                />
                <Button
                    size="sm"
                    icon={Plus}
                    loading={mutations.addDocument.isPending}
                    label={t('mobile.provider.addDocBtn')}
                    onPress={handleAddDoc}
                />

                {!profile?.documents?.length ? (
                    <EmptyState icon={FileCheck2} message={t('mobile.provider.noDocsYet')}/>
                ) : (
                    profile.documents.map(doc => (
                        <View key={doc.id} style={styles.docItem}>
                            <View style={styles.flex}>
                                <AppText variant="small" style={styles.bold}>
                                    {doc.title}
                                </AppText>
                                <AppText variant="caption">
                                    {doc.documentType} · {doc.status}
                                </AppText>
                            </View>
                            <Button
                                size="sm"
                                tone="ghost"
                                icon={Trash2}
                                label={t('mobile.provider.deleteDocBtn')}
                                onPress={() => mutations.deleteDocument.mutate(doc.id)}
                            />
                        </View>
                    ))
                )}
            </Card>
        </Screen>
    );
}

const styles = StyleSheet.create({
    row: {flexDirection: 'row', gap: spacing.sm},
    flex: {flex: 1},
    actions: {gap: spacing.xs},
    bold: {fontWeight: '700', color: colors.text},
    docItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.xs,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border,
    },
});
