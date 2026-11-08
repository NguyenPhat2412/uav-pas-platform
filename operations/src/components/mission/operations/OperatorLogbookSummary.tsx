'use client';

import {Award, CheckCircle2, ClipboardCheck, Clock, Star} from 'lucide-react';
import {
    Badge,
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
    KpiCard,
    MetricStrip,
} from '@/components/ui';
import {useOperatorLogbook} from '@/hooks/mission/useOperationsMissions';
import {useI18n} from '@/providers/I18nContext';

export function OperatorLogbookSummary() {
    const {t, formatNumber} = useI18n();
    const query = useOperatorLogbook();
    const data = query.data;

    if (!data) return null;

    return (
        <Card className="mb-5" role="region" aria-labelledby="operator-logbook-title">
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0 bg-slate-50/70 px-4 py-3">
                <div className="min-w-0">
                    <CardTitle
                        id="operator-logbook-title"
                        className="inline-flex items-center gap-2 text-sm font-bold text-slate-900"
                    >
                        <Award size={16} className="text-primary" aria-hidden="true" />
                        {t('capabilities.logbook.title')}
                    </CardTitle>
                    <CardDescription className="mt-0.5 text-xs text-muted">
                        {t('capabilities.logbook.subtitle')}
                    </CardDescription>
                </div>
                <Badge variant="outline" className="font-mono normal-case text-slate-600">
                    {data.operatorFullName}
                </Badge>
            </CardHeader>

            <MetricStrip className="border-0 border-t border-rose-200">
                <KpiCard
                    label={t('capabilities.logbook.totalHours')}
                    value={`${formatNumber(data.totalFlightHours)} h`}
                    icon={<Clock size={16} aria-hidden="true" />}
                    tone="red"
                />
                <KpiCard
                    label={t('capabilities.logbook.completedMissions')}
                    value={data.completedMissions}
                    meta={`/ ${data.totalAssignedMissions}`}
                    icon={<CheckCircle2 size={16} aria-hidden="true" />}
                    tone="blue"
                />
                <KpiCard
                    label={t('capabilities.logbook.preflightCompliance')}
                    value={`${formatNumber(data.preflightComplianceRate)}%`}
                    icon={<ClipboardCheck size={16} aria-hidden="true" />}
                    tone="blue"
                />
                <KpiCard
                    label={t('capabilities.logbook.customerRating')}
                    value={
                        data.averageCustomerRating != null
                            ? `${data.averageCustomerRating.toFixed(1)} / 5`
                            : t('capabilities.logbook.noRating')
                    }
                    icon={<Star size={16} aria-hidden="true" />}
                    tone="amber"
                />
            </MetricStrip>
        </Card>
    );
}
