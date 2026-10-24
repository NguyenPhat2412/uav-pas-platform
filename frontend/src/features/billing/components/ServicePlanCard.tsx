import {UavIcon} from '@/components/shared/UavIcon';
import {BadgeCheck, Clock3, Radar, Sparkles} from 'lucide-react';
import {displayLabel, planName} from '@/components/shared/presentation';
import type {ServicePlan} from '@/types/customer';
import {useI18n} from '@/contexts/I18nContext';

export function ServicePlanCards({plans, currentPlanCode}: {
    plans: ServicePlan[];
    currentPlanCode?: string;
}) {
    const {t, formatCurrency} = useI18n();
    return <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-5">
        {plans.map(plan => {
            // A visual editorial highlight, independent of the customer's subscribed plan.
            const featured = plan.active && plan.code === 'PRO';
            const current = plan.code === currentPlanCode;
            return <article
                key={plan.id}
                className={`min-w-0 flex flex-col gap-5 rounded-[18px] text-card-foreground shadow-xs ${
                    featured
                        ? 'border-2 border-primary p-[23px] bg-rose-50/40'
                        : 'border border-border p-6 bg-card'
                }`}
            >
                <div className="flex items-start justify-between gap-3">
                    <span className={`inline-flex items-center justify-center shrink-0 w-12 h-12 rounded-[14px] ${
                        featured ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                    }`}>
                        <UavIcon size={26} aria-hidden="true"/>
                    </span>
                    <div className="flex flex-col items-end gap-1.5">
                        {featured && (
                            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold leading-snug bg-primary text-primary-foreground">
                                <Sparkles size={13} aria-hidden="true"/>{t('planCard.featured')}
                            </span>
                        )}
                        {current && (
                            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold leading-snug bg-emerald-50 text-emerald-800">
                                <BadgeCheck size={13} aria-hidden="true"/>{t('planCard.current')}
                            </span>
                        )}
                        {!plan.active && (
                            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold leading-snug bg-slate-100 text-slate-600">
                                {t('planCard.inactive')}
                            </span>
                        )}
                    </div>
                </div>
                <div>
                    <span className="text-[11px] font-bold text-slate-500 tracking-wider">{plan.code}</span>
                    <h3 className="mt-1 mb-0 text-xl leading-snug font-bold text-card-foreground">{planName(plan.name)}</h3>
                </div>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <strong className="text-primary text-2xl sm:text-3xl leading-tight font-extrabold tabular-nums whitespace-nowrap">
                        {formatCurrency(plan.price)}
                    </strong>
                    <span className="text-slate-500 text-xs">/ {displayLabel(plan.billingCycle)}</span>
                </div>
                <dl className="mt-auto mb-0 pt-[18px] border-t border-border grid gap-3.5">
                    <div className="flex items-center justify-between gap-3 text-[13px]">
                        <dt className="flex items-center gap-2 text-slate-600">
                            <Clock3 size={16} aria-hidden="true" className="shrink-0 text-primary"/>
                            {t('planCard.monthlyHours')}
                        </dt>
                        <dd className="m-0 font-bold whitespace-nowrap tabular-nums text-card-foreground">
                            {t('planCard.hours', {hours: plan.maxMonthlyFlightHours})}
                        </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-[13px]">
                        <dt className="flex items-center gap-2 text-slate-600">
                            <UavIcon size={16} aria-hidden="true" className="shrink-0 text-primary"/>
                            {t('planCard.concurrentUavs')}
                        </dt>
                        <dd className="m-0 font-bold whitespace-nowrap tabular-nums text-card-foreground">
                            {plan.maxConcurrentUavs} UAV
                        </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-[13px]">
                        <dt className="flex items-center gap-2 text-slate-600">
                            <Radar size={16} aria-hidden="true" className="shrink-0 text-primary"/>
                            SAR / AI
                        </dt>
                        <dd className="m-0 font-bold whitespace-nowrap tabular-nums text-card-foreground">
                            {t(plan.allowSarAi ? 'planCard.yes' : 'planCard.no')}
                        </dd>
                    </div>
                </dl>
            </article>;
        })}
    </div>;
}
