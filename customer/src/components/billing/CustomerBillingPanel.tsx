'use client';

import React, {useState} from 'react';
import {Clock, Radar} from 'lucide-react';
import {UavIcon} from '@/components/shared/UavIcon';
import {
    Alert,
    Badge,
    Button,
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
    Spinner,
} from '@/components/ui';
import {BankTransferDialog} from '@/components/billing/BankTransferDialog';
import {CustomerBillingInvoicesCard} from '@/components/billing/CustomerBillingInvoicesCard';
import {ServicePlanCards} from '@/components/billing/ServicePlanCard';
import {PageGuard} from '@/components/customer/CustomerLayout';
import {
    useBankTransferStatus,
    useBilling,
    useDownloadInvoiceReceipt,
    useRefreshCustomerBilling,
    useSubscribePlan,
} from '@/hooks/billing/useCustomerBilling';
import {displayLabel, planName} from '@/lib/presentation';
import {confirmDialog} from '@/providers/ConfirmContext';
import {useI18n} from '@/providers/I18nContext';
import {toast} from '@/providers/ToastContext';
import type {Invoice} from '@/types/customer';

// Plan changes create a plan invoice; paying it (VietQR / NAPAS 247) applies the plan to the quota.

export default function CustomerBillingPage() {
    const {quota: quotaQuery, invoices: invoicesQuery, plans: plansQuery} = useBilling();
    const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
    const refreshBilling = useRefreshCustomerBilling();
    const transfer = useBankTransferStatus();
    const {t, formatDate: formatLocalDate, formatCurrency} = useI18n();
    const subscribe = useSubscribePlan({
        onSuccess: invoice => {
            if (!invoice) {
                toast.success(t('plans.appliedFree'));
            } else {
                toast.success(t('plans.invoiceIssued', {code: invoice.code}));
                if (transfer.data?.enabled) setPayingInvoice(invoice);
            }
        },
        onError: error => toast.error(error instanceof Error ? error.message : t('plans.subscribeFailed')),
    });
    const downloadReceipt = useDownloadInvoiceReceipt({
        onError: error => toast.error(error instanceof Error ? error.message : t('billingPage.downloadPdfError')),
    });
    const formatDate = (value?: string) => (value ? formatLocalDate(value, {dateStyle: 'short'}) : '—');
    const quota = quotaQuery.data;
    const invoices = invoicesQuery.data?.content ?? [];
    const plansList = Array.isArray(plansQuery.data) ? plansQuery.data : [];
    const currentPlan = plansList.find(p => p.code === quota?.planCode);
    const queryError = quotaQuery.error ?? invoicesQuery.error;
    const isLoading = quotaQuery.isLoading || invoicesQuery.isLoading;

    const usagePercent = quota
        ? Math.min(100, Math.round((quota.flightHoursUsed / Math.max(quota.flightHoursLimit, 0.01)) * 100))
        : 0;

    return (
        <PageGuard permission={null}>
            <div className="flex flex-1 flex-col bg-white">
                {isLoading && (
                    <div className="border-b border-border bg-card p-5">
                        <Spinner size="sm" label={t('billingPage.loading')} className="sr-only"/>
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                            {[0, 1, 2].map(i => (
                                <div key={i} className="h-44 animate-pulse rounded-panel border border-slate-200 bg-slate-100"/>
                            ))}
                        </div>
                    </div>
                )}

                {queryError && !isLoading && (
                    <Alert
                        variant="error"
                        title={t('billingPage.loadError')}
                        className="rounded-none border-x-0 border-t-0"
                    >
                        {queryError instanceof Error ? queryError.message : t('billingPage.unknownError')}
                    </Alert>
                )}

                {quota && (
                    <div data-testid="my-quota" className="grid grid-cols-1 gap-px border-b border-slate-200 bg-slate-200 lg:grid-cols-3">
                        <Card className="relative flex min-h-[200px] flex-col justify-between rounded-none border-0 border-t-2 border-t-primary bg-white text-slate-900">
                            <div className="pointer-events-none absolute -right-2.5 -top-2.5 text-primary opacity-[0.07]">
                                <UavIcon size={140} aria-hidden="true"/>
                            </div>
                            <CardHeader className="space-y-0 border-b-0 p-5 pb-0">
                                <div className="mb-3 flex items-center justify-between">
                                    <Badge variant="primary" className="rounded-none border-rose-200 bg-uav-red-light normal-case tracking-normal">
                                        {t('billingPage.currentPlan')}
                                    </Badge>
                                    <span className="text-[11px] text-slate-500">
                                        {t('billingPage.cycleEnds', {date: formatDate(quota.cycleEnd)})}
                                    </span>
                                </div>
                                <CardTitle className="mt-1 mb-1.5 text-xl font-extrabold leading-snug text-slate-900">
                                    {planName(quota.planName)}
                                </CardTitle>
                                <CardDescription className="m-0 text-xs leading-relaxed text-slate-500">
                                    {t('billingPage.planDescription')}
                                </CardDescription>
                            </CardHeader>

                            <CardFooter className="mx-5 mt-4 border-t border-slate-200 px-0 pt-3 pb-5 text-xs text-slate-500">
                                <span>{t('billingPage.concurrentMissions')}</span>
                                <strong className="text-sm tabular-nums text-slate-900">
                                    {quota.concurrentUavsUsed} / {quota.concurrentUavsLimit} UAV
                                </strong>
                            </CardFooter>
                        </Card>

                        <Card className="flex min-h-[200px] flex-col justify-between rounded-none border-0 border-t-2 border-t-uav-blue bg-white">
                            <CardContent className="p-5 pb-0">
                                <div className="mb-2 flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-500">{t('billingPage.hoursUsed')}</span>
                                    <span className="text-xs font-bold tabular-nums text-primary">
                                        {t('billingPage.percentUsed', {percent: usagePercent})}
                                    </span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-[32px] font-extrabold tabular-nums text-slate-900">{quota.flightHoursUsed}h</span>
                                    <span className="text-[13px] font-semibold text-slate-500">
                                        {t('billingPage.hoursTotal', {limit: quota.flightHoursLimit})}
                                    </span>
                                </div>
                                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                                    <div
                                        className={`h-full rounded-full transition-[width] duration-300 ${usagePercent > 80 ? 'bg-primary' : 'bg-success'}`}
                                        style={{width: `${usagePercent}%`}}
                                    />
                                </div>
                            </CardContent>
                            <CardFooter className="border-t-0 px-5 pt-3 pb-5">
                                <p className="m-0 text-xs leading-relaxed text-slate-500">
                                    {t('billingPage.remaining', {hours: quota.flightHoursRemaining})}
                                </p>
                            </CardFooter>
                        </Card>

                        <Card className="flex min-h-[200px] flex-col justify-between rounded-none border-0 border-t-2 border-t-amber-500 bg-white">
                            <CardContent className="p-5 pb-0">
                                <span className="mb-3 block text-[11px] font-bold text-slate-500">{t('billingPage.features')}</span>
                                <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-xs">
                                    <li className="flex items-center justify-between">
                                        <span className="flex items-center gap-1.5 text-slate-700">
                                            <Radar size={15} aria-hidden="true"/> {t('billingPage.sarAi')}
                                        </span>
                                        <Badge variant="secondary" className="border border-blue-200 bg-uav-blue-light px-2.5 py-1 text-uav-blue normal-case tracking-normal">
                                            {currentPlan ? t(currentPlan.allowSarAi ? 'billingPage.yes' : 'billingPage.no') : '—'}
                                        </Badge>
                                    </li>
                                    <li className="flex items-center justify-between">
                                        <span className="flex items-center gap-1.5 text-slate-700">
                                            <UavIcon size={15} aria-hidden="true"/> {t('billingPage.concurrentLimit')}
                                        </span>
                                        <strong className="font-bold text-slate-900">
                                            {currentPlan?.maxConcurrentUavs ?? quota.concurrentUavsLimit} UAV
                                        </strong>
                                    </li>
                                    <li className="flex items-center justify-between">
                                        <span className="flex items-center gap-1.5 text-slate-700">
                                            <Clock size={15} aria-hidden="true"/> {t('billingPage.billingCycle')}
                                        </span>
                                        <strong className="font-bold text-slate-900">
                                            {currentPlan ? displayLabel(currentPlan.billingCycle) : '—'}
                                        </strong>
                                    </li>
                                </ul>
                            </CardContent>
                            <CardFooter className="border-t-0 px-5 pt-3 pb-5">
                                <a href="#available-plans-title" className="text-xs font-bold text-primary hover:underline">
                                    {t('plans.changePlan')}
                                </a>
                            </CardFooter>
                        </Card>
                    </div>
                )}

                <Card aria-labelledby="available-plans-title" className="rounded-none border-0 border-b border-slate-200 bg-white">
                    <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 border-b border-slate-200 bg-slate-50/70 px-5 py-3.5">
                        <CardTitle id="available-plans-title" className="m-0 flex items-center gap-2 text-sm font-bold text-slate-800">
                            <UavIcon size={18} aria-hidden="true" className="text-primary"/>
                            {t('billingPage.plans')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {plansQuery.isLoading ? (
                            <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
                                <Spinner size="sm" label={t('billingPage.loadingPlans')} className="sr-only"/>
                                {[0, 1, 2].map(i => (
                                    <div key={i} className="h-52 animate-pulse rounded-panel border border-slate-200 bg-slate-100"/>
                                ))}
                            </div>
                        ) : plansQuery.isError ? (
                            <Alert variant="error" className="rounded-none border-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span>{t('billingPage.plansError')}</span>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => void plansQuery.refetch()} className="h-7 px-2 text-xs">
                                        {t('common.retry')}
                                    </Button>
                                </div>
                            </Alert>
                        ) : (
                            <ServicePlanCards
                                plans={plansList}
                                currentPlanCode={quota?.planCode}
                                pendingCode={subscribe.isPending ? subscribe.variables : null}
                                onSelect={plan => {
                                    void confirmDialog({
                                        description: t('plans.subscribeConfirm', {name: planName(plan.name), price: formatCurrency(plan.price)}),
                                        variant: 'primary',
                                    }).then(confirmed => {
                                        if (confirmed) subscribe.mutate(plan.code);
                                    });
                                }}
                            />
                        )}
                        {plansQuery.isSuccess && plansList.length === 0 && (
                            <p className="m-0 p-5 text-[13px] text-slate-500">{t('billingPage.noPlans')}</p>
                        )}
                    </CardContent>
                </Card>

                <CustomerBillingInvoicesCard
                    testId="my-invoices"
                    invoices={invoices}
                    isLoading={isLoading}
                    hasError={Boolean(queryError)}
                    transferEnabled={Boolean(transfer.data?.enabled)}
                    awaitingTransferHint={t('payment.awaitingTransferHint')}
                    downloadingInvoiceId={downloadReceipt.isPending ? downloadReceipt.variables?.id ?? null : null}
                    onPay={setPayingInvoice}
                    onDownloadReceipt={(id, code) => downloadReceipt.mutate({id, code})}
                />

                {payingInvoice && (
                    <BankTransferDialog
                        invoiceId={payingInvoice.id}
                        onClose={() => {
                            setPayingInvoice(null);
                            void refreshBilling();
                        }}
                    />
                )}
            </div>
        </PageGuard>
    );
}
