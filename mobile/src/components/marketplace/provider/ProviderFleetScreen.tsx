import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {Cpu, Package, Plane, Plus, Trash2} from 'lucide-react-native';
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
    useMyProviderFleet,
    useProviderStudioMutations,
} from '@/hooks/marketplace/useProviderStudio';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {
    EQUIPMENT_CATEGORY_OPTIONS,
    extractActionableError,
    initialEquipmentForm,
    initialUavForm,
} from '@/shared/forms/marketplace/marketplace-forms';
import type {ProviderEquipmentCategory} from '@/shared/types/marketplace/marketplace.types';
import {cleanEntityName} from '@/utils/marketplace/clean-text';
import {colors, spacing} from '@/styles/tokens';

type FleetTab = 'UAV' | 'EQUIPMENT';

export function ProviderFleetScreen() {
    const {t} = useI18n();
    const toast = useToast();
    const fleetQuery = useMyProviderFleet();
    const mutations = useProviderStudioMutations();

    const [tab, setTab] = useState<FleetTab>('UAV');
    const [uavForm, setUavForm] = useState(initialUavForm);
    const [equipForm, setEquipForm] = useState(initialEquipmentForm);

    const tabOptions: GlassOption<FleetTab>[] = [
        {
            value: 'UAV',
            label: t('mobile.provider.fleetTabUav'),
            badge: `${fleetQuery.data?.uavs.length ?? 0}`,
            icon: Plane,
        },
        {
            value: 'EQUIPMENT',
            label: t('mobile.provider.fleetTabEquipment'),
            badge: `${fleetQuery.data?.equipment.length ?? 0}`,
            icon: Package,
        },
    ];

    const categoryOptions: GlassOption<ProviderEquipmentCategory>[] =
        EQUIPMENT_CATEGORY_OPTIONS.map(opt => ({
            value: opt.value,
            label: opt.label,
            icon: Cpu,
        }));

    const submitUav = () => {
        if (!uavForm.model.trim() || !uavForm.serialNumber.trim()) {
            toast.show(t('mobile.provider.uavFieldsRequired'), 'error');
            return;
        }
        mutations.registerUav.mutate(
            {
                model: uavForm.model.trim(),
                serialNumber: uavForm.serialNumber.trim(),
                manufacturer: uavForm.manufacturer.trim() || 'DJI Enterprise',
            },
            {
                onSuccess: () => {
                    setUavForm(initialUavForm());
                    toast.show(t('mobile.provider.uavAddedToast'), 'success');
                },
                onError: err =>
                    toast.show(
                        extractActionableError(err, t('mobile.provider.saveError')),
                        'error',
                    ),
            },
        );
    };

    const submitEquip = () => {
        if (!equipForm.name.trim()) {
            toast.show(t('mobile.provider.equipNameRequired'), 'error');
            return;
        }
        mutations.registerEquipment.mutate(
            {
                name: equipForm.name.trim(),
                type: equipForm.type,
                serialNumber: equipForm.serialNumber?.trim() || undefined,
                quantity: Math.max(1, Number(equipForm.quantity || 1)),
            },
            {
                onSuccess: () => {
                    setEquipForm(initialEquipmentForm());
                    toast.show(t('mobile.provider.equipAddedToast'), 'success');
                },
                onError: err =>
                    toast.show(
                        extractActionableError(err, t('mobile.provider.saveError')),
                        'error',
                    ),
            },
        );
    };

    const uavs = fleetQuery.data?.uavs ?? [];
    const equipment = fleetQuery.data?.equipment ?? [];
    const formatUavStatus = (status: string) => {
        if (status === 'AVAILABLE') return t('mobile.overnight.uavStatusAvailable');
        if (status === 'IN_USE') return t('mobile.overnight.uavStatusInUse');
        if (status === 'MAINTENANCE') return t('mobile.overnight.uavStatusMaintenance');
        return status;
    };

    return (
        <Screen
            onRefresh={() => void fleetQuery.refetch()}
            refreshing={fleetQuery.isRefetching}>
            <GlassSelectCards<FleetTab>
                columns={2}
                value={tab}
                options={tabOptions}
                onChange={setTab}
            />

            {tab === 'UAV' ? (
                <>
                    <Card>
                        <SectionTitle title={t('mobile.provider.addUavTitle')}/>
                        <TextField
                            label={t('mobile.provider.uavModelLabel')} required
                            placeholder="M350 / M3E"
                            value={uavForm.model}
                            onChangeText={val => setUavForm(prev => ({...prev, model: val}))}
                        />
                        <TextField
                            label={t('mobile.provider.serialLabel')} required
                            autoCapitalize="characters"
                            value={uavForm.serialNumber}
                            onChangeText={val =>
                                setUavForm(prev => ({...prev, serialNumber: val}))
                            }
                        />
                        <TextField
                            label={t('mobile.provider.manufacturerLabel')} required
                            value={uavForm.manufacturer}
                            onChangeText={val =>
                                setUavForm(prev => ({...prev, manufacturer: val}))
                            }
                        />
                        <Button
                            icon={Plus}
                            loading={mutations.registerUav.isPending}
                            label={t('mobile.provider.addUavBtn')}
                            onPress={submitUav}
                        />
                    </Card>

                    {fleetQuery.isPending && !fleetQuery.data ? (
                        <LoadingState/>
                    ) : uavs.length === 0 ? (
                        <EmptyState icon={Plane} message={t('mobile.provider.noUavs')}/>
                    ) : (
                        uavs.map(item => (
                            <Card key={item.id}>
                                <View style={styles.rowBetween}>
                                    <AppText variant="title" numberOfLines={1} style={styles.flex}>
                                        {cleanEntityName(item.model)}
                                    </AppText>
                                    <Badge
                                        label={formatUavStatus(item.status)}
                                        background={
                                            item.status === 'IN_USE'
                                                ? colors.warningLight
                                                : colors.primaryLight
                                        }
                                        color={
                                            item.status === 'IN_USE'
                                                ? colors.warning
                                                : colors.primary
                                        }
                                    />
                                </View>
                                <View style={styles.rowBetween}>
                                    <AppText variant="caption" numberOfLines={1} style={styles.flex}>
                                        {item.manufacturer} · SN: {item.serialNumber}
                                    </AppText>
                                    <Button
                                        size="sm"
                                        tone="ghost"
                                        icon={Trash2}
                                        loading={
                                            mutations.deleteUav.isPending &&
                                            mutations.deleteUav.variables === item.id
                                        }
                                        label={t('mobile.overnight.deleteUavBtn')}
                                        onPress={() =>
                                            mutations.deleteUav.mutate(item.id, {
                                                onSuccess: () =>
                                                    toast.show(t('mobile.overnight.uavDeletedToast'), 'info'),
                                                onError: err =>
                                                    toast.show(
                                                        extractActionableError(err, t('mobile.provider.saveError')),
                                                        'error',
                                                    ),
                                            })
                                        }
                                    />
                                </View>
                            </Card>
                        ))
                    )}
                </>
            ) : (
                <>
                    <Card>
                        <SectionTitle title={t('mobile.provider.addEquipTitle')}/>
                        <GlassSelectField<ProviderEquipmentCategory>
                            label={t('mobile.provider.equipCategoryLabel')} required
                            sheetTitle={t('mobile.provider.equipCategoryLabel')}
                            value={equipForm.type}
                            options={categoryOptions}
                            onChange={val => setEquipForm(prev => ({...prev, type: val}))}
                        />
                        <TextField
                            label={t('mobile.provider.equipNameLabel')} required
                            placeholder="Zenmuse L2 LiDAR"
                            value={equipForm.name}
                            onChangeText={val => setEquipForm(prev => ({...prev, name: val}))}
                        />
                        <View style={styles.row}>
                            <View style={styles.flex}>
                                <TextField
                                    label={t('mobile.provider.serialLabel')} optional
                                    value={equipForm.serialNumber ?? ''}
                                    onChangeText={val =>
                                        setEquipForm(prev => ({...prev, serialNumber: val}))
                                    }
                                />
                            </View>
                            <View style={styles.flex}>
                                <TextField
                                    label={t('mobile.provider.quantityLabel')} required
                                    keyboardType="number-pad"
                                    value={String(equipForm.quantity)}
                                    onChangeText={val =>
                                        setEquipForm(prev => ({
                                            ...prev,
                                            quantity: Number(val) || 1,
                                        }))
                                    }
                                />
                            </View>
                        </View>
                        <Button
                            icon={Plus}
                            loading={mutations.registerEquipment.isPending}
                            label={t('mobile.provider.addEquipBtn')}
                            onPress={submitEquip}
                        />
                    </Card>

                    {fleetQuery.isPending && !fleetQuery.data ? (
                        <LoadingState/>
                    ) : equipment.length === 0 ? (
                        <EmptyState icon={Package} message={t('mobile.provider.noEquipment')}/>
                    ) : (
                        equipment.map(item => (
                            <Card key={item.id}>
                                <View style={styles.rowBetween}>
                                    <AppText variant="title">{item.name}</AppText>
                                    <Badge
                                        label={`${item.availableQuantity}/${item.quantity}`}
                                        background={colors.slateLight}
                                        color={colors.slateDark}
                                    />
                                </View>
                                <AppText variant="caption">
                                    {EQUIPMENT_CATEGORY_OPTIONS.find(o => o.value === item.type)?.label ??
                                        item.type}
                                </AppText>
                            </Card>
                        ))
                    )}
                </>
            )}
        </Screen>
    );
}

const styles = StyleSheet.create({
    row: {flexDirection: 'row', gap: spacing.sm},
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: spacing.sm,
    },
    flex: {flex: 1},
});
