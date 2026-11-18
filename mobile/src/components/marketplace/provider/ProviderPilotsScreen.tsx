import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {Award, Plane, Plus, Trash2, UserCheck, X} from 'lucide-react-native';
import {
    AppText,
    Badge,
    Button,
    Card,
    EmptyState,
    ErrorState,
    LoadingState,
    Screen,
    SectionTitle,
    TextField,
} from '@/components/ui';
import {GlassSelectField, type GlassOption} from '@/components/ui/GlassSelect';
import {
    useMyProviderFleet,
    useMyProviderPilots,
    useProviderStudioMutations,
    type ProviderPilotStatus,
} from '@/hooks/marketplace/useProviderStudio';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {extractActionableError} from '@/shared/forms/marketplace/marketplace-forms';
import {colors, spacing} from '@/styles/tokens';

function pilotBadgeColors(status: ProviderPilotStatus) {
    if (status === 'IN_FLIGHT') return {bg: colors.primaryLight, fg: colors.primary};
    if (status === 'OFF_DUTY') return {bg: colors.slateLight, fg: colors.slateDark};
    return {bg: colors.primaryLight, fg: colors.primary};
}

/**
 * Fleet Control Engineers CRUD Screen (`/api/v1/marketplace/provider/pilots`,
 * S1-mobile.md #7 & CONTRACT.md §3).
 */
export function ProviderPilotsScreen() {
    const {t} = useI18n();
    const toast = useToast();
    const pilotsQuery = useMyProviderPilots();
    const fleetQuery = useMyProviderFleet();
    const mutations = useProviderStudioMutations();

    const [showForm, setShowForm] = useState(false);
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [licenseNumber, setLicenseNumber] = useState('');
    const [specialization, setSpecialization] = useState('');
    const [assignedUavId, setAssignedUavId] = useState('');

    const uavs = fleetQuery.data?.uavs ?? [];
    const uavOptions: GlassOption<string>[] = [
        {value: '', label: t('mobile.provider.autoUavOption'), icon: Plane},
        ...uavs.map(u => ({
            value: String(u.id),
            label: u.model,
            description: `SN: ${u.serialNumber}`,
            icon: Plane,
        })),
    ];

    const submitPilot = () => {
        if (!fullName.trim()) {
            toast.show(t('mobile.provider.saveError'), 'error');
            return;
        }
        mutations.createPilot.mutate(
            {
                fullName: fullName.trim(),
                phone: phone.trim() || undefined,
                email: email.trim() || undefined,
                licenseNumber: licenseNumber.trim() || undefined,
                specialization: specialization.trim() || undefined,
                assignedUavId: assignedUavId ? Number(assignedUavId) : undefined,
                status: 'AVAILABLE',
            },
            {
                onSuccess: () => {
                    setShowForm(false);
                    setFullName('');
                    setPhone('');
                    setEmail('');
                    setLicenseNumber('');
                    setSpecialization('');
                    setAssignedUavId('');
                    toast.show(t('mobile.overnight.pilotSavedToast'), 'success');
                },
                onError: err =>
                    toast.show(extractActionableError(err, t('mobile.provider.saveError')), 'error'),
            },
        );
    };

    const pilots = pilotsQuery.data ?? [];

    return (
        <Screen
            onRefresh={() => void pilotsQuery.refetch()}
            refreshing={pilotsQuery.isRefetching}>
            <Button
                icon={showForm ? X : Plus}
                tone={showForm ? 'secondary' : 'primary'}
                label={showForm ? t('common.cancel') : t('mobile.overnight.addPilotBtn')}
                onPress={() => setShowForm(prev => !prev)}
            />

            {showForm ? (
                <Card>
                    <SectionTitle title={t('mobile.overnight.addPilotBtn')}/>
                    <TextField
                        label={t('mobile.overnight.pilotNameLabel')}
                        required
                        value={fullName}
                        onChangeText={setFullName}
                    />
                    <TextField
                        label={t('mobile.overnight.pilotPhoneLabel')}
                        optional
                        keyboardType="phone-pad"
                        value={phone}
                        onChangeText={setPhone}
                    />
                    <TextField
                        label={t('mobile.overnight.pilotEmailLabel')}
                        optional
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={email}
                        onChangeText={setEmail}
                    />
                    <TextField
                        label={t('mobile.overnight.pilotLicenseLabel')}
                        optional
                        autoCapitalize="characters"
                        value={licenseNumber}
                        onChangeText={setLicenseNumber}
                    />
                    <TextField
                        label={t('mobile.overnight.pilotSpecLabel')}
                        optional
                        value={specialization}
                        onChangeText={setSpecialization}
                    />
                    <GlassSelectField<string>
                        label={t('mobile.provider.assignUavLabel')}
                        optional
                        sheetTitle={t('mobile.provider.assignUavLabel')}
                        value={assignedUavId}
                        options={uavOptions}
                        onChange={setAssignedUavId}
                    />
                    <Button
                        icon={UserCheck}
                        loading={mutations.createPilot.isPending}
                        label={t('common.save')}
                        onPress={submitPilot}
                    />
                </Card>
            ) : null}

            <SectionTitle title={`${t('mobile.overnight.pilotsScreenTitle')} (${pilots.length})`}/>

            {pilotsQuery.isPending && !pilotsQuery.data ? (
                <LoadingState/>
            ) : pilotsQuery.isError ? (
                <ErrorState
                    message={t('services.loadError')}
                    retryLabel={t('common.retry')}
                    onRetry={() => void pilotsQuery.refetch()}
                />
            ) : pilots.length === 0 ? (
                <EmptyState
                    icon={UserCheck}
                    message={t('mobile.overnight.noPilotsYet')}
                    action={
                        <Button
                            size="sm"
                            icon={Plus}
                            label={t('mobile.overnight.addPilotBtn')}
                            onPress={() => setShowForm(true)}
                        />
                    }
                />
            ) : (
                pilots.map(pilot => {
                    const tone = pilotBadgeColors(pilot.status);
                    return (
                        <Card key={pilot.id}>
                            <View style={styles.rowBetween}>
                                <AppText variant="title" style={styles.flex} numberOfLines={1}>
                                    {pilot.fullName}
                                </AppText>
                                <Badge label={pilot.status} background={tone.bg} color={tone.fg}/>
                            </View>
                            {pilot.licenseNumber ? (
                                <View style={styles.metaRow}>
                                    <Award size={14} color={colors.primary}/>
                                    <AppText variant="caption" numberOfLines={1}>
                                        {pilot.licenseNumber}
                                        {pilot.specialization ? ` · ${pilot.specialization}` : ''}
                                    </AppText>
                                </View>
                            ) : null}
                            {pilot.assignedUavModel ? (
                                <View style={styles.metaRow}>
                                    <Plane size={14} color={colors.slate}/>
                                    <AppText variant="caption" numberOfLines={1}>
                                        {pilot.assignedUavModel}
                                    </AppText>
                                </View>
                            ) : null}
                            <Button
                                size="sm"
                                tone="ghost"
                                icon={Trash2}
                                loading={
                                    mutations.deletePilot.isPending &&
                                    mutations.deletePilot.variables === pilot.id
                                }
                                label={t('mobile.overnight.deleteProjectAction')}
                                onPress={() =>
                                    mutations.deletePilot.mutate(pilot.id, {
                                        onSuccess: () =>
                                            toast.show(t('mobile.overnight.pilotDeletedToast'), 'info'),
                                        onError: err =>
                                            toast.show(
                                                extractActionableError(err, t('mobile.provider.saveError')),
                                                'error',
                                            ),
                                    })
                                }
                            />
                        </Card>
                    );
                })
            )}
        </Screen>
    );
}

const styles = StyleSheet.create({
    rowBetween: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs},
    metaRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
    flex: {flex: 1},
});
