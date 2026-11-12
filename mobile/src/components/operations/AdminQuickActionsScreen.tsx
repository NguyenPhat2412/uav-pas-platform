import React, {useState} from 'react';
import {Alert, StyleSheet, View} from 'react-native';
import {CheckCircle2, CreditCard, Lock, ShieldAlert, Unlock, Users} from 'lucide-react-native';
import {AppText, Badge, Button, Card, ChipGroup, EmptyState, ErrorState, LoadingState, Screen, SectionTitle, TextField} from '@/components/ui';
import {
    AdminAirspaceTabContent,
    AdminSlaTabContent,
} from '@/components/operations/AdminQuickAirspaceAndSlaCards';
import {signInErrorText} from '@/forms/auth/sign-in-flow';
import {
    useAdminAirspaceZones,
    useAdminPendingInvoices,
    useAdminQuickMutations,
    useAdminSlaIntelligence,
    useAdminUsers,
} from '@/hooks/admin/useAdminQuickActions';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {displayLabel} from '@/shared/lib/presentation';
import type {User} from '@/shared/types/admin';
import type {AirspaceZone} from '@/shared/types/airspace/airspace.types';
import {colors, spacing} from '@/styles/tokens';

type AdminTab = 'users' | 'invoices' | 'airspace' | 'sla';

export function AdminQuickActionsScreen() {
    const {t, formatCurrency, formatDate} = useI18n();
    const {user: currentUser, can} = useAuth();
    const toast = useToast();

    const canUsers = can('USER_VIEW') || can('USER_MANAGE');
    const canAirspace = can('USER_MANAGE');
    const canBilling = can('USER_MANAGE');
    const canSla = can('DASHBOARD_VIEW') && (can('MISSION_VIEW_ALL') || can('USER_MANAGE'));

    const [activeTab, setActiveTab] = useState<AdminTab>(
        canUsers ? 'users' : canBilling ? 'invoices' : canAirspace ? 'airspace' : 'sla',
    );
    const [keyword, setKeyword] = useState('');
    const [bankRefs, setBankRefs] = useState<Record<number, string>>({});

    const usersQuery = useAdminUsers(keyword);
    const invoicesQuery = useAdminPendingInvoices();
    const airspaceQuery = useAdminAirspaceZones();
    const slaQuery = useAdminSlaIntelligence();
    const mutations = useAdminQuickMutations();

    if (!canUsers && !canAirspace && !canBilling && !canSla) {
        return (
            <Screen>
                <EmptyState icon={ShieldAlert} message={t('mobile.adminQuick.noPermission')}/>
            </Screen>
        );
    }

    const tabs: { value: AdminTab; label: string }[] = [
        ...(canUsers ? [{value: 'users' as const, label: t('mobile.adminQuick.tabs.users')}] : []),
        ...(canBilling ? [{value: 'invoices' as const, label: t('mobile.adminQuick.tabs.invoices')}] : []),
        ...(canAirspace ? [{value: 'airspace' as const, label: t('mobile.adminQuick.tabs.airspace')}] : []),
        ...(canSla ? [{value: 'sla' as const, label: t('mobile.adminQuick.tabs.sla')}] : []),
    ];

    const effectiveTab: AdminTab = tabs.some(tab => tab.value === activeTab) ? activeTab : tabs[0].value;
    const showError = (error: unknown) => toast.show(signInErrorText(error, t), 'error');

    const confirmLockToggle = (target: User) => {
        const isLocked = !!target.locked || target.status === 'SUSPENDED';
        Alert.alert(
            isLocked
                ? t('mobile.adminQuick.users.unlockConfirmTitle', {username: target.username})
                : t('mobile.adminQuick.users.lockConfirmTitle', {username: target.username}),
            isLocked
                ? t('mobile.adminQuick.users.unlockConfirmBody')
                : t('mobile.adminQuick.users.lockConfirmBody'),
            [
                {text: t('common.cancel'), style: 'cancel'},
                {
                    text: isLocked ? t('mobile.adminQuick.users.unlock') : t('mobile.adminQuick.users.lock'),
                    style: isLocked ? 'default' : 'destructive',
                    onPress: () => {
                        if (isLocked) {
                            mutations.unlockUser.mutate(target.id, {
                                onSuccess: () =>
                                    toast.show(t('mobile.adminQuick.users.unlockedToast', {username: target.username}), 'success'),
                                onError: showError,
                            });
                        } else {
                            mutations.lockUser.mutate(target.id, {
                                onSuccess: () =>
                                    toast.show(t('mobile.adminQuick.users.lockedToast', {username: target.username}), 'info'),
                                onError: showError,
                            });
                        }
                    },
                },
            ],
        );
    };

    const handleToggleZone = (zone: AirspaceZone) => {
        mutations.toggleZone.mutate(
            {zone, active: !zone.active},
            {
                onSuccess: () =>
                    toast.show(t('mobile.adminQuick.airspace.toggledToast', {code: zone.code}), 'success'),
                onError: showError,
            },
        );
    };

    return (
        <Screen
            onRefresh={() =>
                void Promise.all([
                    canUsers ? usersQuery.refetch() : Promise.resolve(),
                    canBilling ? invoicesQuery.refetch() : Promise.resolve(),
                    canAirspace ? airspaceQuery.refetch() : Promise.resolve(),
                    canSla ? slaQuery.refetch() : Promise.resolve(),
                ])
            }
            refreshing={
                usersQuery.isRefetching ||
                invoicesQuery.isRefetching ||
                airspaceQuery.isRefetching ||
                slaQuery.isRefetching
            }>
            <Card>
                <ChipGroup<AdminTab> options={tabs} value={effectiveTab} onChange={setActiveTab}/>
            </Card>

            {effectiveTab === 'users' && canUsers && (
                <>
                    <Card>
                        <TextField
                            label={t('mobile.adminQuick.tabs.users')}
                            placeholder={t('mobile.adminQuick.users.searchPlaceholder')}
                            value={keyword}
                            onChangeText={setKeyword}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </Card>

                    {usersQuery.isPending ? (
                        <LoadingState/>
                    ) : usersQuery.isError ? (
                        <ErrorState
                            message={signInErrorText(usersQuery.error, t)}
                            retryLabel={t('common.retry')}
                            onRetry={() => void usersQuery.refetch()}
                        />
                    ) : !(usersQuery.data?.content?.length) ? (
                        <EmptyState icon={Users} message={t('mobile.adminQuick.users.empty')}/>
                    ) : (
                        usersQuery.data.content.map(account => {
                            const isLocked = !!account.locked || account.status === 'SUSPENDED';
                            const isSelf = account.id === currentUser?.id;
                            return (
                                <Card key={account.id}>
                                    <View style={styles.rowBetween}>
                                        <AppText variant="title" style={styles.flex} numberOfLines={1}>
                                            {account.fullName || account.username}
                                        </AppText>
                                        <Badge
                                            label={
                                                isLocked
                                                    ? t('mobile.adminQuick.users.lockedBadge')
                                                    : t('mobile.adminQuick.users.activeBadge')
                                            }
                                            background={isLocked ? colors.dangerLight : colors.slateLight}
                                            color={isLocked ? colors.danger : colors.slateDark}
                                        />
                                    </View>
                                    <AppText variant="small" numberOfLines={1}>
                                        @{account.username} · {account.email}
                                    </AppText>
                                    <View style={styles.pills}>
                                        <Badge label={displayLabel(account.role)} background={colors.slateDark} color={colors.white}/>
                                    </View>
                                    {!isSelf && (isLocked ? can('USER_UNLOCK') : can('USER_LOCK')) && (
                                        <Button
                                            label={
                                                isLocked
                                                    ? t('mobile.adminQuick.users.unlock')
                                                    : t('mobile.adminQuick.users.lock')
                                            }
                                            icon={isLocked ? Unlock : Lock}
                                            tone={isLocked ? 'secondary' : 'danger'}
                                            loading={
                                                (mutations.lockUser.isPending && mutations.lockUser.variables === account.id) ||
                                                (mutations.unlockUser.isPending && mutations.unlockUser.variables === account.id)
                                            }
                                            onPress={() => confirmLockToggle(account)}
                                        />
                                    )}
                                </Card>
                            );
                        })
                    )}
                </>
            )}

            {effectiveTab === 'invoices' && canBilling && (
                <>
                    {invoicesQuery.isPending ? (
                        <LoadingState/>
                    ) : invoicesQuery.isError ? (
                        <ErrorState
                            message={signInErrorText(invoicesQuery.error, t)}
                            retryLabel={t('common.retry')}
                            onRetry={() => void invoicesQuery.refetch()}
                        />
                    ) : !(invoicesQuery.data?.content?.length) ? (
                        <EmptyState icon={CreditCard} message={t('mobile.adminQuick.invoices.empty')}/>
                    ) : (
                        invoicesQuery.data.content.map(invoice => {
                            const refValue = bankRefs[invoice.id] ?? '';
                            const confirming =
                                mutations.confirmPayment.isPending &&
                                mutations.confirmPayment.variables?.invoiceId === invoice.id;
                            return (
                                <Card key={invoice.id}>
                                    <SectionTitle
                                        title={invoice.code}
                                        action={
                                            <Badge
                                                label={formatCurrency(invoice.amount)}
                                                background={colors.warningLight}
                                                color={colors.warning}
                                            />
                                        }
                                    />
                                    <AppText variant="small">
                                        @{invoice.username}
                                        {invoice.planName ? ` · ${invoice.planName}` : ''}
                                        {invoice.missionTitle ? ` · ${invoice.missionTitle}` : ''}
                                    </AppText>
                                    <AppText variant="caption">
                                        {formatDate(invoice.createdAt, {dateStyle: 'short', timeStyle: 'short'})}
                                    </AppText>
                                    <TextField
                                        label={t('mobile.adminQuick.invoices.refLabel')}
                                        placeholder={t('mobile.adminQuick.invoices.refPlaceholder')}
                                        value={refValue}
                                        maxLength={100}
                                        onChangeText={text => setBankRefs(prev => ({...prev, [invoice.id]: text}))}
                                        autoCapitalize="characters"
                                        autoCorrect={false}
                                    />
                                    <Button
                                        label={t('mobile.adminQuick.invoices.confirmButton')}
                                        icon={CheckCircle2}
                                        disabled={!refValue.trim()}
                                        loading={confirming}
                                        onPress={() =>
                                            mutations.confirmPayment.mutate(
                                                {invoiceId: invoice.id, bankReference: refValue},
                                                {
                                                    onSuccess: () => {
                                                        setBankRefs(prev => {
                                                            const next = {...prev};
                                                            delete next[invoice.id];
                                                            return next;
                                                        });
                                                        toast.show(
                                                            t('mobile.adminQuick.invoices.confirmedToast', {code: invoice.code}),
                                                            'success',
                                                        );
                                                    },
                                                    onError: showError,
                                                },
                                            )
                                        }
                                    />
                                </Card>
                            );
                        })
                    )}
                </>
            )}

            {effectiveTab === 'airspace' && canAirspace && (
                <AdminAirspaceTabContent
                    isPending={airspaceQuery.isPending}
                    isError={airspaceQuery.isError}
                    error={airspaceQuery.error}
                    zones={airspaceQuery.data}
                    togglingZoneId={mutations.toggleZone.isPending ? mutations.toggleZone.variables?.zone.id : undefined}
                    onRetry={() => void airspaceQuery.refetch()}
                    onToggleZone={handleToggleZone}
                />
            )}

            {effectiveTab === 'sla' && canSla && (
                <AdminSlaTabContent
                    isPending={slaQuery.isPending}
                    isError={slaQuery.isError}
                    error={slaQuery.error}
                    data={slaQuery.data}
                    canCreateMaintenance={can('UAV_MAINTENANCE_CREATE')}
                    creatingUavId={mutations.createPreventiveOrder.isPending ? mutations.createPreventiveOrder.variables?.uavId : undefined}
                    defaultTechnicianName={currentUser?.fullName || currentUser?.username || 'Maintenance Team'}
                    onRetry={() => void slaQuery.refetch()}
                    onCreatePreventiveOrder={(uavId, serialNumber, fields) =>
                        mutations.createPreventiveOrder.mutate(
                            {uavId, fields},
                            {
                                onSuccess: () =>
                                    toast.show(
                                        t('capabilities.sla.orderCreatedToast', {serial: serialNumber}),
                                        'success',
                                    ),
                                onError: showError,
                            },
                        )
                    }
                />
            )}
        </Screen>
    );
}

const styles = StyleSheet.create({
    flex: {flex: 1},
    rowBetween: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm},
    pills: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
});
