import {UavIcon} from '@/components/shared/UavIcon';
import {Badge, Button, Card, CardContent, CardFooter, CardHeader, CardTitle} from '@/components/ui';
import {BadgeCheck, Clock3, Radar, Sparkles} from 'lucide-react';
import {displayLabel, planName} from '@/lib/presentation';
import {cn} from '@/lib/utils';
import type {ServicePlan} from '@/types/customer';
import {useI18n} from '@/providers/I18nContext';

/** onSelect enables the subscribe button; pendingCode marks the plan whose request is in flight. */
export function ServicePlanCards({plans, currentPlanCode, onSelect, pendingCode}: {
    plans: ServicePlan[];
    currentPlanCode?: string;
    onSelect?: (plan: ServicePlan) => void;
    pendingCode?: string | null;
}) {
    const {t, formatCurrency} = useI18n();
    return (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-px bg-slate-200">
            {plans.map(plan => {
                // A visual editorial highlight, independent of the customer's subscribed plan.
                const featured = plan.active && plan.code === 'PRO';
                const current = plan.code === currentPlanCode;
                return (
                    <Card
                        key={plan.id}
                        className={cn(
                            'flex min-w-0 flex-col rounded-none border-0 border-t-4 text-card-foreground',
                            current ? 'border-t-primary bg-uav-red-light/20' : 'border-t-transparent bg-white',
                        )}
                    >
                        <CardHeader className="space-y-4 border-b-0 p-5 pb-0">
                            <div className="flex items-start justify-between gap-3">
                                <span
                                    className={cn(
                                        'inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-panel',
                                        featured ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary',
                                    )}
                                >
                                    <UavIcon size={26} aria-hidden="true"/>
                                </span>
                                <div className="flex flex-col items-end gap-1.5">
                                    {featured && (
                                        <Badge
                                            variant="primary"
                                            icon={<Sparkles size={13} aria-hidden="true"/>}
                                            className="border-primary bg-primary text-primary-foreground normal-case tracking-normal"
                                        >
                                            {t('planCard.featured')}
                                        </Badge>
                                    )}
                                    {current && (
                                        <Badge
                                            variant="secondary"
                                            icon={<BadgeCheck size={13} aria-hidden="true"/>}
                                            className="border border-blue-200 bg-uav-blue-light text-uav-blue normal-case tracking-normal"
                                        >
                                            {t('planCard.current')}
                                        </Badge>
                                    )}
                                    {!plan.active && (
                                        <Badge variant="default" className="normal-case tracking-normal">
                                            {t('planCard.inactive')}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            <div>
                                <span className="text-[11px] font-bold tracking-wider text-slate-500">{plan.code}</span>
                                <CardTitle className="mt-1 mb-0 text-xl font-bold leading-snug text-card-foreground">
                                    {planName(plan.name)}
                                </CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="flex flex-1 flex-col gap-5 p-5 pt-4">
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                <strong className="whitespace-nowrap text-2xl font-extrabold leading-tight tabular-nums text-primary sm:text-3xl">
                                    {formatCurrency(plan.price)}
                                </strong>
                                <span className="text-xs text-slate-500">/ {displayLabel(plan.billingCycle)}</span>
                            </div>
                            <dl className="mt-auto mb-0 grid gap-3.5 border-t border-border pt-[18px]">
                                <div className="flex items-center justify-between gap-3 text-[13px]">
                                    <dt className="flex items-center gap-2 text-slate-600">
                                        <Clock3 size={16} aria-hidden="true" className="shrink-0 text-primary"/>
                                        {t('planCard.monthlyHours')}
                                    </dt>
                                    <dd className="m-0 whitespace-nowrap font-bold tabular-nums text-card-foreground">
                                        {t('planCard.hours', {hours: plan.maxMonthlyFlightHours})}
                                    </dd>
                                </div>
                                <div className="flex items-center justify-between gap-3 text-[13px]">
                                    <dt className="flex items-center gap-2 text-slate-600">
                                        <UavIcon size={16} aria-hidden="true" className="shrink-0 text-primary"/>
                                        {t('planCard.concurrentUavs')}
                                    </dt>
                                    <dd className="m-0 whitespace-nowrap font-bold tabular-nums text-card-foreground">
                                        {plan.maxConcurrentUavs} UAV
                                    </dd>
                                </div>
                                <div className="flex items-center justify-between gap-3 text-[13px]">
                                    <dt className="flex items-center gap-2 text-slate-600">
                                        <Radar size={16} aria-hidden="true" className="shrink-0 text-primary"/>
                                        SAR / AI
                                    </dt>
                                    <dd className="m-0 whitespace-nowrap font-bold tabular-nums text-card-foreground">
                                        {t(plan.allowSarAi ? 'planCard.yes' : 'planCard.no')}
                                    </dd>
                                </div>
                            </dl>
                        </CardContent>
                        {onSelect && (
                            <CardFooter className="border-t-0 p-5 pt-0">
                                <Button
                                    type="button"
                                    variant={current ? 'secondary' : 'primary'}
                                    size="md"
                                    isLoading={pendingCode === plan.code}
                                    loadingText={t('plans.subscribing')}
                                    disabled={current || !plan.active || !!pendingCode}
                                    onClick={() => onSelect(plan)}
                                    className={cn(
                                        'w-full',
                                        current && 'border border-blue-200 bg-uav-blue-light text-uav-blue hover:bg-uav-blue-light',
                                    )}
                                >
                                    {current ? t('planCard.current') : t('plans.subscribe')}
                                </Button>
                            </CardFooter>
                        )}
                    </Card>
                );
            })}
        </div>
    );
}
