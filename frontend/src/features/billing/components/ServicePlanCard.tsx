import {UavIcon} from '@/components/shared/UavIcon';
import {BadgeCheck, Clock3, Radar, Sparkles} from 'lucide-react';
import {displayLabel, planName} from '@/components/shared/presentation';
import type {ServicePlan} from '@/types/customer';
import {useI18n} from '@/contexts/I18nContext';

/** onSelect enables the subscribe button; pendingCode marks the plan whose request is in flight. */
export function ServicePlanCards({plans, currentPlanCode, onSelect, pendingCode}: {
    plans: ServicePlan[];
    currentPlanCode?: string;
    onSelect?: (plan: ServicePlan) => void;
    pendingCode?: string | null;
}) {
    const {t, formatCurrency} = useI18n();
    return <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-px bg-slate-200">
        {plans.map(plan => {
            // A visual editorial highlight, independent of the customer's subscribed plan.
            const featured = plan.active && plan.code === 'PRO';
            const current = plan.code === currentPlanCode;
            return <article
                key={plan.id}
                className={`flex min-w-0 flex-col gap-5 p-5 text-card-foreground ${
                    current ? 'border-t-4 border-t-primary bg-uav-red-light/20' : 'border-t-4 border-t-transparent bg-white'
                }`}
            >
                <div className="flex items-start justify-between gap-3">
                    <span className={`inline-flex items-center justify-center shrink-0 w-12 h-12 rounded-panel ${
                        featured ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                    }`}>
                        <UavIcon size={26} aria-hidden="true"/>
                    </span>
                    <div className="flex flex-col items-end gap-1.5">
                        {featured && (
                            <span className="inline-flex items-center gap-1.5 rounded-badge px-2.5 py-1 text-[11px] font-bold leading-snug bg-primary text-primary-foreground">
                                <Sparkles size={13} aria-hidden="true"/>{t('planCard.featured')}
                            </span>
                        )}
                        {current && (
                            <span className="inline-flex items-center gap-1.5 rounded-badge px-2.5 py-1 text-[11px] font-bold leading-snug bg-uav-blue-light text-uav-blue">
                                <BadgeCheck size={13} aria-hidden="true"/>{t('planCard.current')}
                            </span>
                        )}
                        {!plan.active && (
                            <span className="inline-flex items-center gap-1.5 rounded-badge px-2.5 py-1 text-[11px] font-bold leading-snug bg-slate-100 text-slate-600">
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
                {onSelect && <button type="button" disabled={current || !plan.active || !!pendingCode}
                                     onClick={() => onSelect(plan)}
                                     className={`h-10 text-sm font-bold transition-colors disabled:cursor-not-allowed ${
                                         current ? 'border border-blue-200 bg-uav-blue-light text-uav-blue'
                                             : 'bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-60'}`}>
                    {current ? t('planCard.current') : pendingCode === plan.code ? t('plans.subscribing') : t('plans.subscribe')}
                </button>}
            </article>;
        })}
    </div>;
}
