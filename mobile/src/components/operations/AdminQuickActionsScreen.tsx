import React, {useState} from 'react';
import {Alert, StyleSheet, View} from 'react-native';
import {CheckCircle2, Clock, CreditCard, Lock, Power, ShieldAlert, Unlock, Users, Wrench} from 'lucide-react-native';
import {AppText, Badge, Button, Card, ChipGroup, EmptyState, ErrorState, LoadingState, Screen, SectionTitle, TextField} from '@/components/ui';
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
import {businessToday} from '@/shared/utils/maintenance/workflows';
import type {User} from '@/shared/types/admin';
import type {AirspaceZone} from '@/shared/types/airspace/airspace.types';
import {colors, radius, spacing} from '@/styles/tokens';

type AdminTab = 'users' | 'invoices' | 'airspace' | 'sla';

function nextPreventiveDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return businessToday(tomorrow);
}

export function AdminQuickActionsScreen() {
    const {t, formatCurrency, formatDate, formatNumber} = useI18n();
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
                <>
                    {airspaceQuery.isPending ? (
                        <LoadingState/>
                    ) : airspaceQuery.isError ? (
                        <ErrorState
                            message={signInErrorText(airspaceQuery.error, t)}
                            retryLabel={t('common.retry')}
                            onRetry={() => void airspaceQuery.refetch()}
                        />
                    ) : !(airspaceQuery.data?.length) ? (
                        <EmptyState icon={ShieldAlert} message={t('mobile.adminQuick.airspace.empty')}/>
                    ) : (
                        airspaceQuery.data.map(zone => {
                            const toggling =
                                mutations.toggleZone.isPending && mutations.toggleZone.variables?.zone.id === zone.id;
                            const isProhibited = zone.zoneType === 'PROHIBITED';
                            return (
                                <Card key={zone.id}>
                                    <View style={styles.rowBetween}>
                                        <AppText variant="title" style={styles.flex} numberOfLines={1}>
                                            {zone.code} · {zone.name}
                                        </AppText>
                                        <Badge
                                            label={
                                                zone.active
                                                    ? t('mobile.adminQuick.airspace.activeBadge')
                                                    : t('mobile.adminQuick.airspace.inactiveBadge')
                                            }
                                            background={zone.active ? colors.slateDark : colors.slateLight}
                                            color={zone.active ? colors.white : colors.textSecondary}
                                        />
                                    </View>
                                    <View style={styles.pills}>
                                        <Badge
                                            label={zone.zoneType}
                                            background={isProhibited ? colors.dangerLight : colors.warningLight}
                                            color={isProhibited ? colors.danger : colors.warning}
                                        />
                                        {zone.maxAltitudeAglM != null && (
                                            <Badge label={`≤ ${zone.maxAltitudeAglM} m AGL`}/>
                                        )}
                                        {(zone.effectiveFrom || zone.effectiveUntil) && (
                                            <Badge
                                                icon={Clock}
                                                label={t('capabilities.notam.scheduledBadge')}
                                                background={colors.warningLight}
                                                color={colors.warning}
                                            />
                                        )}
                                    </View>
                                    {(zone.effectiveFrom || zone.effectiveUntil) && (
                                        <AppText variant="caption">
                                            {t('capabilities.notam.windowSummary', {
                                                from: zone.effectiveFrom ? formatDate(zone.effectiveFrom) : '—',
                                                until: zone.effectiveUntil ? formatDate(zone.effectiveUntil) : '—',
                                            })}
                                        </AppText>
                                    )}
                                    <AppText variant="small">{zone.authority}</AppText>
                                    {zone.description ? <AppText variant="caption">{zone.description}</AppText> : null}
                                    <Button
                                        label={
                                            zone.active
                                                ? t('mobile.adminQuick.airspace.deactivate')
                                                : t('mobile.adminQuick.airspace.activate')
                                        }
                                        icon={Power}
                                        tone={zone.active ? 'secondary' : 'primary'}
                                        loading={toggling}
                                        onPress={() => handleToggleZone(zone)}
                                    />
                                </Card>
                            );
                        })
                    )}
                </>
            )}

            {effectiveTab === 'sla' && canSla && (
                <>
                    {slaQuery.isPending ? (
                        <LoadingState/>
                    ) : slaQuery.isError || !slaQuery.data ? (
                        <ErrorState
                            message={signInErrorText(slaQuery.error, t)}
                            retryLabel={t('common.retry')}
                            onRetry={() => void slaQuery.refetch()}
                        />
                    ) : (
                        <>
                            <Card>
                                <SectionTitle title={t('capabilities.sla.title')}/>
                                <AppText variant="caption">{t('capabilities.sla.subtitle')}</AppText>
                                <View style={styles.kpiGrid}>
                                    <View style={styles.kpiCell}>
                                        <AppText variant="caption">{t('capabilities.sla.kpis.confirmTurnaround')}</AppText>
                                        <AppText variant="title">
                                            {t('capabilities.sla.kpis.minutesUnit', {
                                                min: formatNumber(slaQuery.data.avgConfirmationMinutes),
                                            })}
                                        </AppText>
                                    </View>
                                    <View style={styles.kpiCell}>
                                        <AppText variant="caption">{t('capabilities.sla.kpis.onTimeRate')}</AppText>
                                        <AppText variant="title">{formatNumber(slaQuery.data.onTimeCompletionRate)}%</AppText>
                                    </View>
                                    <View style={styles.kpiCell}>
                                        <AppText variant="caption">{t('capabilities.sla.kpis.preflightRate')}</AppText>
                                        <AppText variant="title">{formatNumber(slaQuery.data.preflightComplianceRate)}%</AppText>
                                    </View>
                                    <View style={styles.kpiCell}>
                                        <AppText variant="caption">{t('capabilities.sla.kpis.customerRating')}</AppText>
                                        <AppText variant="title">
                                            {slaQuery.data.avgCustomerRating != null
                                                ? `★ ${slaQuery.data.avgCustomerRating.toFixed(1)}/5`
                                                : '—'}
                                        </AppText>
                                    </View>
                                </View>
                            </Card>

                            <Card>
                                <SectionTitle
                                    title={t('capabilities.sla.riskTitle')}
                                    action={
                                        <Badge
                                            label={t('capabilities.sla.riskSummary', {
                                                overdue: slaQuery.data.overdueUavCount,
                                                dueSoon: slaQuery.data.dueSoonUavCount,
                                            })}
                                            background={colors.warningLight}
                                            color={colors.warning}
                                        />
                                    }
                                />
                                {slaQuery.data.fleetMaintenanceRisks.map(row => {
                                    const riskKey =
                                        row.riskLevel === 'OVERDUE' ||
                                        row.riskLevel === 'DUE_SOON' ||
                                        row.riskLevel === 'NORMAL'
                                            ? row.riskLevel
                                            : 'NORMAL';
                                    const isOverdue = riskKey === 'OVERDUE';
                                    const isDueSoon = riskKey === 'DUE_SOON';
                                    const creating =
                                        mutations.createPreventiveOrder.isPending &&
                                        mutations.createPreventiveOrder.variables?.uavId === row.uavId;
                                    return (
                                        <View key={row.uavId} style={styles.riskRow}>
                                            <View style={styles.rowBetween}>
                                                <AppText variant="title" style={styles.flex}>
                                                    {row.serialNumber} · {row.model}
                                                </AppText>
                                                <Badge
                                                    label={`${t(`capabilities.sla.riskLevels.${riskKey}`)} (${row.riskScore})`}
                                                    background={
                                                        isOverdue
                                                            ? colors.dangerLight
                                                            : isDueSoon
                                                              ? colors.warningLight
                                                              : colors.slateLight
                                                    }
                                                    color={
                                                        isOverdue
                                                            ? colors.danger
                                                            : isDueSoon
                                                              ? colors.warning
                                                              : colors.slateDark
                                                    }
                                                />
                                            </View>
                                            <AppText variant="caption">{row.recommendation}</AppText>
                                            {row.hasOpenRepairOrder ? (
                                                <Badge
                                                    label={t('capabilities.sla.openOrderExists')}
                                                    background={colors.slateLight}
                                                    color={colors.slateDark}
                                                />
                                            ) : riskKey !== 'NORMAL' && can('UAV_MAINTENANCE_CREATE') ? (
                                                <Button
                                                    label={
                                                        creating
                                                            ? t('capabilities.sla.creatingOrder')
                                                            : t('capabilities.sla.createPreventiveOrder')
                                                    }
                                                    icon={Wrench}
                                                    tone="secondary"
                                                    loading={creating}
                                                    onPress={() =>
                                                        mutations.createPreventiveOrder.mutate(
                                                            {
                                                                uavId: row.uavId,
                                                                fields: {
                                                                    title: `${t('capabilities.sla.createPreventiveOrder')} — ${row.serialNumber}`.slice(0, 160),
                                                                    description: row.recommendation.slice(0, 2000),
                                                                    plannedDate: nextPreventiveDate(),
                                                                    technicianName: (
                                                                        currentUser?.fullName ||
                                                                        currentUser?.username ||
                                                                        'Maintenance Team'
                                                                    ).slice(0, 120),
                                                                },
                                                            },
                                                            {
                                                                onSuccess: () =>
                                                                    toast.show(
                                                                        t('capabilities.sla.orderCreatedToast', {
                                                                            serial: row.serialNumber,
                                                                        }),
                                                                        'success',
                                                                    ),
                                                                onError: showError,
                                                            },
                                                        )
                                                    }
                                                />
                                            ) : null}
                                        </View>
                                    );
                                })}
                            </Card>
                        </>
                    )}
                </>
            )}
        </Screen>
    );
}

const styles = StyleSheet.create({
    flex: {flex: 1},
    rowBetween: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm},
    pills: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
    kpiGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
    kpiCell: {
        flexBasis: '47%',
        flexGrow: 1,
        borderRadius: radius.control,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.slateLight,
        padding: spacing.sm,
        gap: 2,
    },
    riskRow: {
        gap: spacing.xs,
        paddingTop: spacing.sm,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border,
    },
});
