'use client';

import React, {useCallback, useState} from 'react';
import {CheckCircle2, Clock, ShieldCheck, Star} from 'lucide-react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    KpiCard,
    MetricStrip,
} from '@/components/ui';
import {QueryState} from '@/components/data/WorkspaceState';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {useCreatePreventiveRepairOrder, useSlaIntelligence} from '@/hooks/reporting/useReports';
import {businessToday} from '@/utils/maintenance/workflows';
import type {UavMaintenanceRiskRow} from '@/types/admin';
import {SlaLeaderboardAndReviews} from '@/components/reporting/SlaLeaderboardAndReviews';
import {SlaMaintenanceRiskTable} from '@/components/reporting/SlaMaintenanceRiskTable';

function nextPreventiveDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return businessToday(tomorrow);
}

export function AdminSlaIntelligenceSection() {
    const {user, can} = useAuth();
    const {t, formatNumber} = useI18n();
    const query = useSlaIntelligence();
    const createOrder = useCreatePreventiveRepairOrder();
    const [creatingUavId, setCreatingUavId] = useState<number | null>(null);
    const [feedback, setFeedback] = useState<{tone: 'info' | 'error'; text: string} | null>(null);

    const canViewSla = can('MISSION_VIEW_ALL') || can('USER_MANAGE');
    const canManageMaintenance = can('UAV_MAINTENANCE_CREATE');

    const handleCreatePreventiveOrder = useCallback(
        async (row: UavMaintenanceRiskRow) => {
            setFeedback(null);
            setCreatingUavId(row.uavId);
            try {
                await createOrder.mutateAsync({
                    uavId: row.uavId,
                    fields: {
                        title: `${t('capabilities.sla.createPreventiveOrder')} — ${row.serialNumber}`.slice(0, 160),
                        description: row.recommendation.slice(0, 2000),
                        plannedDate: nextPreventiveDate(),
                        technicianName: (user?.fullName || user?.username || 'Maintenance Team').slice(0, 120),
                    },
                });
                setFeedback({
                    tone: 'info',
                    text: t('capabilities.sla.orderCreatedToast', {serial: row.serialNumber}),
                });
            } catch (err) {
                setFeedback({
                    tone: 'error',
                    text: err instanceof Error && err.message ? err.message : t('admin.reports.loadError'),
                });
            } finally {
                setCreatingUavId(null);
            }
        },
        [createOrder, t, user],
    );

    if (!canViewSla) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base font-bold text-slate-900">
                    {t('capabilities.sla.title')}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                    {t('capabilities.sla.subtitle')}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
                <QueryState query={query}>
                    {query.data && (
                        <>
                            <MetricStrip>
                                <KpiCard
                                    label={t('capabilities.sla.kpis.confirmTurnaround')}
                                    value={t('capabilities.sla.kpis.minutesUnit', {
                                        min: formatNumber(query.data.avgConfirmationMinutes, {
                                            maximumFractionDigits: 1,
                                        }),
                                    })}
                                    icon={<Clock size={16} aria-hidden="true" />}
                                    tone="red"
                                />
                                <KpiCard
                                    label={t('capabilities.sla.kpis.onTimeRate')}
                                    value={`${formatNumber(query.data.onTimeCompletionRate, {maximumFractionDigits: 1})}%`}
                                    icon={<CheckCircle2 size={16} aria-hidden="true" />}
                                    tone="blue"
                                />
                                <KpiCard
                                    label={t('capabilities.sla.kpis.preflightRate')}
                                    value={`${formatNumber(query.data.preflightComplianceRate, {maximumFractionDigits: 1})}%`}
                                    icon={<ShieldCheck size={16} aria-hidden="true" />}
                                    tone="red"
                                />
                                <KpiCard
                                    label={t('capabilities.sla.kpis.customerRating')}
                                    value={
                                        query.data.avgCustomerRating != null
                                            ? `${formatNumber(query.data.avgCustomerRating, {minimumFractionDigits: 1, maximumFractionDigits: 2})} / 5`
                                            : '—'
                                    }
                                    meta={t('capabilities.sla.kpis.reviewsSub', {
                                        accepted: query.data.acceptedDeliverablesCount,
                                        total: query.data.totalReviewsCount,
                                    })}
                                    icon={<Star size={16} aria-hidden="true" />}
                                    tone="amber"
                                />
                            </MetricStrip>

                            <SlaLeaderboardAndReviews
                                operators={query.data.operatorLeaderboard}
                                reviews={query.data.recentReviews}
                            />

                            <SlaMaintenanceRiskTable
                                risks={query.data.fleetMaintenanceRisks}
                                overdueCount={query.data.overdueUavCount}
                                dueSoonCount={query.data.dueSoonUavCount}
                                canManageMaintenance={canManageMaintenance}
                                creatingUavId={creatingUavId}
                                feedback={feedback}
                                onCreatePreventiveOrder={row => void handleCreatePreventiveOrder(row)}
                            />
                        </>
                    )}
                </QueryState>
            </CardContent>
        </Card>
    );
}
