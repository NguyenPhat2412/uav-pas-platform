import React, {useState} from 'react';
import {Alert, StyleSheet, View} from 'react-native';
import {
    Activity,
    CheckCircle2,
    CreditCard,
    Lock,
    Settings2,
    ShieldAlert,
    Store,
    Unlock,
    Users,
} from 'lucide-react-native';
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
import {AppForbiddenView} from '@/components/shared/AppStatusViews';
import {
    AdminAirspaceTabContent,
    AdminSlaTabContent,
} from '@/components/admin/AdminQuickAirspaceAndSlaCards';
import {AdminMarketplaceTabContent} from '@/components/admin/AdminQuickMarketplaceCards';
import {AdminSettingsTabContent} from '@/components/admin/AdminQuickSettingsCard';
import {signInErrorText} from '@/forms/sign-in-flow';
import {
    useAdminAirspaceZones,
    useAdminPendingInvoices,
    useAdminQuickMutations,
    useAdminSlaIntelligence,
    useAdminUsers,
} from '@/hooks/useAdminQuickActions';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {displayLabel} from '@/shared/lib/presentation';
import type {User} from '@/shared/types/admin';
import type {AirspaceZone} from '@/shared/types/airspace.types';
import {colors, spacing} from '@/styles/tokens';

type AdminTab = 'marketplace' | 'settings' | 'users' | 'invoices' | 'airspace' | 'sla';

export function AdminQuickActionsScreen() {
    const {t, formatCurrency, formatDate} = useI18n();
    const {user: currentUser, can} = useAuth();
    const toast = useToast();

    const canMarketplace = can('MARKETPLACE_MODERATE') || can('PAYOUT_APPROVE') || can('USER_MANAGE');
    const canSettings = can('SETTINGS_UPDATE') || can('SETTINGS_VIEW') || can('USER_MANAGE');
    const canUsers = can('USER_VIEW') || can('USER_MANAGE');
    const canAirspace = can('USER_MANAGE');
    const canBilling = can('USER_MANAGE');
    const canSla = can('DASHBOARD_VIEW') && (can('MISSION_VIEW_ALL') || can('USER_MANAGE'));

    const [activeTab, setActiveTab] = useState<AdminTab>(
        canMarketplace ? 'marketplace' : canUsers ? 'users' : canBilling ? 'invoices' : 'sla',
    );
    const [keyword, setKeyword] = useState('');
    const [bankRefs, setBankRefs] = useState<Record<number, string>>({});
    const [refreshing, setRefreshing] = useState(false);

    const usersQuery = useAdminUsers(keyword);
    const invoicesQuery = useAdminPendingInvoices();
    const airspaceQuery = useAdminAirspaceZones();
    const slaQuery = useAdminSlaIntelligence();
    const mutations = useAdminQuickMutations();

    if (!canMarketplace && !canSettings && !canUsers && !canAirspace && !canBilling && !canSla) {
        return (
            <Screen>
                <AppForbiddenView detail={t('mobile.adminQuick.noPermission')} fallbackHref="/operations/missions"/>
            </Screen>
        );
    }

    const tabs: GlassOption<AdminTab>[] = [
        ...(canMarketplace ? [{value: 'marketplace' as const, label: t('mobile.adminQuick.tabs.marketplace'), icon: Store}] : []),
        ...(canSettings ? [{value: 'settings' as const, label: t('mobile.adminQuick.tabs.settings'), icon: Settings2}] : []),
        ...(canUsers ? [{value: 'users' as const, label: t('mobile.adminQuick.tabs.users'), icon: Users}] : []),
        ...(canBilling ? [{value: 'invoices' as const, label: t('mobile.adminQuick.tabs.invoices'), icon: CreditCard}] : []),
        ...(canAirspace ? [{value: 'airspace' as const, label: t('mobile.adminQuick.tabs.airspace'), icon: ShieldAlert}] : []),
        ...(canSla ? [{value: 'sla' as const, label: t('mobile.adminQuick.tabs.sla'), icon: Activity}] : []),
    ];

    const effectiveTab: AdminTab = tabs.some(tab => tab.value === activeTab) ? activeTab : tabs[0].value;
    const showError = (error: unknown) => toast.show(signInErrorText(error, t), 'error');

    const confirmLockToggle = (target: User) => {
        const isLocked = !!target.locked || target.status === 'SUSPENDED';
        Alert.alert(
            isLocked
                ? t('mobile.adminQuick.users.unlockConfirmTitle', {username: target.username})
                : t('mobile.adminQuick.users.lockConfirmTitle', {username: target.username}),
            isLocked ? t('mobile.adminQuick.users.unlockConfirmBody') : t('mobile.adminQuick.users.lockConfirmBody'),
            [
                {text: t('common.cancel'), style: 'cancel'},
                {
                    text: isLocked ? t('mobile.adminQuick.users.unlock') : t('mobile.adminQuick.users.lock'),
                    style: isLocked ? 'default' : 'destructive',
                    onPress: () => {
                        const mut = isLocked ? mutations.unlockUser : mutations.lockUser;
                        mut.mutate(target.id, {
                            onSuccess: () =>
                                toast.show(
                                    t(
                                        isLocked
                                            ? 'mobile.adminQuick.users.unlockedToast'
                                            : 'mobile.adminQuick.users.lockedToast',
                                        {username: target.username},
                                    ),
                                    isLocked ? 'success' : 'info',
                                ),
                            onError: showError,
                        });
                    },
                },
            ],
        );
    };

    const handleToggleZone = (zone: AirspaceZone) => {
        mutations.toggleZone.mutate(
            {zone, active: !zone.active},
            {
                onSuccess: () => toast.show(t('mobile.adminQuick.airspace.toggledToast', {code: zone.code}), 'success'),
                onError: showError,
            },
        );
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await Promise.all([
                canUsers ? usersQuery.refetch() : Promise.resolve(),
                canBilling ? invoicesQuery.refetch() : Promise.resolve(),
                canAirspace ? airspaceQuery.refetch() : Promise.resolve(),
                canSla ? slaQuery.refetch() : Promise.resolve(),
            ]);
        } finally {
            setRefreshing(false);
        }
    };

    return (
        <Screen onRefresh={() => void handleRefresh()} refreshing={refreshing}>
            <GlassSelectField<AdminTab>
                label={t('mobile.adminQuick.sectionLabel')}
                sheetTitle={t('mobile.adminQuick.sectionLabel')}
                value={effectiveTab}
                options={tabs}
                onChange={setActiveTab}
            />

            {effectiveTab === 'marketplace' && canMarketplace && <AdminMarketplaceTabContent/>}

            {effectiveTab === 'settings' && canSettings && <AdminSettingsTabContent/>}

            {effectiveTab === 'users' && canUsers && (
                <>
                    <TextField
                        placeholder={t('mobile.adminQuick.users.searchPlaceholder')}
                        value={keyword}
                        onChangeText={setKeyword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        clearButtonMode="while-editing"
                    />
                    {!usersQuery.data && usersQuery.isPending ? (
                        <LoadingState/>
                    ) : usersQuery.isError ? (
                        <ErrorState message={signInErrorText(usersQuery.error, t)} retryLabel={t('common.retry')} onRetry={() => void usersQuery.refetch()}/>
                    ) : !(usersQuery.data?.content?.length) ? (
                        <EmptyState icon={Users} message={t('mobile.adminQuick.users.empty')}/>
                    ) : (
                        usersQuery.data.content.map(account => {
                            const isLocked = !!account.locked || account.status === 'SUSPENDED';
                            const isSelf = account.id === currentUser?.id;
                            return (
                                <Card key={account.id}>
                                    <View style={styles.rowBetween}>
                                        <AppText variant="title" style={styles.flex} numberOfLines={1}>{account.fullName || account.username}</AppText>
                                        <Badge
                                            label={isLocked ? t('mobile.adminQuick.users.lockedBadge') : t('mobile.adminQuick.users.activeBadge')}
                                            background={isLocked ? colors.dangerLight : colors.slateLight}
                                            color={isLocked ? colors.danger : colors.slateDark}
                                        />
                                    </View>
                                    <AppText variant="small" numberOfLines={1}>@{account.username} · {account.email}</AppText>
                                    <View style={styles.pills}>
                                        <Badge label={displayLabel(account.role)} background={colors.slateDark} color={colors.white}/>
                                    </View>
                                    {!isSelf && (isLocked ? can('USER_UNLOCK') : can('USER_LOCK')) && (
                                        <Button
                                            label={isLocked ? t('mobile.adminQuick.users.unlock') : t('mobile.adminQuick.users.lock')}
                                            icon={isLocked ? Unlock : Lock}
                                            tone={isLocked ? 'secondary' : 'danger'}
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
                        <ErrorState message={signInErrorText(invoicesQuery.error, t)} retryLabel={t('common.retry')} onRetry={() => void invoicesQuery.refetch()}/>
                    ) : !(invoicesQuery.data?.content?.length) ? (
                        <EmptyState icon={CreditCard} message={t('mobile.adminQuick.invoices.empty')}/>
                    ) : (
                        invoicesQuery.data.content.map(invoice => {
                            const refValue = bankRefs[invoice.id] ?? '';
                            return (
                                <Card key={invoice.id}>
                                    <SectionTitle
                                        title={invoice.code}
                                        action={<Badge label={formatCurrency(invoice.amount)} background={colors.warningLight} color={colors.warning}/>}
                                    />
                                    <AppText variant="small">
                                        @{invoice.username}
                                        {invoice.planName ? ` · ${invoice.planName}` : ''}
                                        {invoice.missionTitle ? ` · ${invoice.missionTitle}` : ''}
                                    </AppText>
                                    <AppText variant="caption">{formatDate(invoice.createdAt, {dateStyle: 'short', timeStyle: 'short'})}</AppText>
                                    <TextField
                                        label={t('mobile.adminQuick.invoices.refLabel')} required
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
                                        loading={mutations.confirmPayment.isPending && mutations.confirmPayment.variables?.invoiceId === invoice.id}
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
                                                        toast.show(t('mobile.adminQuick.invoices.confirmedToast', {code: invoice.code}), 'success');
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
                                onSuccess: () => toast.show(t('capabilities.sla.orderCreatedToast', {serial: serialNumber}), 'success'),
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
