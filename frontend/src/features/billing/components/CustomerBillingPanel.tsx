'use client';

import {UavIcon} from '@/components/shared/UavIcon';
import React, {useState} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {BankTransferDialog} from '@/features/billing/components/BankTransferDialog';
import {bankTransferService} from '@/lib/api/services';
import {toast} from '@/contexts/ToastContext';
import {useCustomerScope} from '@/lib/query/customer';
import {displayLabel, planName} from "@/components/shared/presentation";
import {AlertCircle, CheckCircle, Clock, FileText, Radar} from 'lucide-react';
import {PageGuard} from "@/components/customer/layout";
import {useBilling} from "@/lib/query/customer";
import {ServicePlanCards} from '@/features/billing/components/ServicePlanCard';
import type {Invoice} from "@/types/customer";
import {useI18n} from '@/contexts/I18nContext';

// Plan changes create a plan invoice; paying it (VietQR / NAPAS 247) applies the plan to the quota.

export default function CustomerBillingPage() {
    const {quota: quotaQuery, invoices: invoicesQuery, plans: plansQuery} = useBilling();
    const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
    const {key} = useCustomerScope();
    const client = useQueryClient();
    const transfer = useQuery({queryKey: [...key, 'billing', 'bank-transfer'], queryFn: ({signal}) => bankTransferService.status(signal)});
    const subscribe = useMutation({
        mutationFn: (code: string) => bankTransferService.subscribe(code),
        onSuccess: async invoice => {
            await client.invalidateQueries({queryKey: [...key, 'billing']});
            if (!invoice) {
                toast.success(t('plans.appliedFree'));
            } else {
                toast.success(t('plans.invoiceIssued', {code: invoice.code}));
                if (transfer.data?.enabled) setPayingInvoice(invoice);
            }
        },
        onError: error => toast.error(error instanceof Error ? error.message : t('plans.subscribeFailed')),
    });
    const {t, formatDate: formatLocalDate, formatCurrency} = useI18n();
    const formatDate = (value?: string) => value ? formatLocalDate(value, {dateStyle: 'short'}) : '—';
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
                    <div className="border-b border-border bg-card p-8 text-center text-slate-500">
                        {t('billingPage.loading')}
                    </div>
                )}

                {queryError && !isLoading && (
                    <div className="flex gap-3 border-b border-rose-200 bg-rose-50 p-5 text-rose-700">
                        <AlertCircle size={20} className="shrink-0 mt-0.5"/>
                        <div>
                            <p className="m-0 font-bold">{t('billingPage.loadError')}</p>
                            <p className="mt-1 mb-0 text-xs">
                                {queryError instanceof Error ? queryError.message : t('billingPage.unknownError')}
                            </p>
                        </div>
                    </div>
                )}

                {/* Quota & Plan Overview Cards */}
                {quota && (
                    <div data-testid="my-quota" className="grid grid-cols-1 gap-px border-b border-slate-200 bg-slate-200 lg:grid-cols-3">
                        {/* Card 1: Current Plan */}
                        <div className="relative flex min-h-[200px] flex-col justify-between overflow-hidden border-t-2 border-t-primary bg-white p-5 text-slate-900">
                            <div className="pointer-events-none absolute -right-2.5 -top-2.5 text-primary opacity-[0.07]">
                                <UavIcon size={140} aria-hidden="true"/>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <span className="inline-flex w-fit border border-rose-200 bg-uav-red-light px-2 py-0.5 text-[11px] font-bold text-primary">
                                        {t('billingPage.currentPlan')}
                                    </span>
                                    <span className="text-[11px] text-slate-500">
                                        {t('billingPage.cycleEnds', {date: formatDate(quota.cycleEnd)})}
                                    </span>
                                </div>
                                <h3 className="mt-3 mb-1.5 text-xl font-extrabold leading-snug text-slate-900">{planName(quota.planName)}</h3>
                                <p className="m-0 text-xs leading-relaxed text-slate-500">
                                    {t('billingPage.planDescription')}
                                </p>
                            </div>

                            <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 text-xs text-slate-500">
                                <span>{t('billingPage.concurrentMissions')}</span>
                                <strong className="tabular-nums text-sm text-slate-900">
                                    {quota.concurrentUavsUsed} / {quota.concurrentUavsLimit} UAV
                                </strong>
                            </div>
                        </div>

                        {/* Card 2: Flight Hours Quota */}
                        <div className="flex min-h-[200px] flex-col justify-between border-t-2 border-t-uav-blue bg-white p-5">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[11px] font-bold text-slate-500">{t('billingPage.hoursUsed')}</span>
                                    <span className="text-xs font-bold text-primary tabular-nums">
                                        {t('billingPage.percentUsed', {percent: usagePercent})}
                                    </span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-[32px] font-extrabold text-slate-900 tabular-nums">{quota.flightHoursUsed}h</span>
                                    <span className="text-[13px] text-slate-500 font-semibold">{t('billingPage.hoursTotal', {limit: quota.flightHoursLimit})}</span>
                                </div>

                                {/* Progress bar */}
                                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mt-3">
                                    <div
                                        className={`h-full rounded-full transition-[width] duration-300 ${usagePercent > 80 ? 'bg-primary' : 'bg-success'}`}
                                        style={{width: `${usagePercent}%`}}
                                    />
                                </div>
                            </div>

                            <p className="m-0 text-xs text-slate-500 leading-relaxed">
                                {t('billingPage.remaining', {hours: quota.flightHoursRemaining})}
                            </p>
                        </div>

                        {/* Card 3: AI & Features Access */}
                        <div className="flex min-h-[200px] flex-col justify-between border-t-2 border-t-amber-500 bg-white p-5">
                            <div>
                                <span className="block mb-3 text-[11px] font-bold text-slate-500">
                                    {t('billingPage.features')}
                                </span>
                                <ul className="list-none p-0 m-0 flex flex-col gap-2.5 text-xs">
                                    <li className="flex justify-between items-center">
                                        <span className="flex items-center gap-1.5 text-slate-700">
                                            <Radar size={15} aria-hidden="true"/> {t('billingPage.sarAi')}
                                        </span>
                                        <span className="bg-uav-blue-light text-uav-blue text-[11px] font-bold px-2.5 py-1 rounded-badge inline-flex items-center gap-1 border border-blue-200">
                                            {currentPlan ? t(currentPlan.allowSarAi ? 'billingPage.yes' : 'billingPage.no') : '—'}
                                        </span>
                                    </li>
                                    <li className="flex justify-between items-center">
                                        <span className="flex items-center gap-1.5 text-slate-700">
                                            <UavIcon size={15} aria-hidden="true"/> {t('billingPage.concurrentLimit')}
                                        </span>
                                        <strong className="text-slate-900 font-bold">
                                            {currentPlan?.maxConcurrentUavs ?? quota.concurrentUavsLimit} UAV
                                        </strong>
                                    </li>
                                    <li className="flex justify-between items-center">
                                        <span className="flex items-center gap-1.5 text-slate-700">
                                            <Clock size={15} aria-hidden="true"/> {t('billingPage.billingCycle')}
                                        </span>
                                        <strong className="text-slate-900 font-bold">
                                            {currentPlan ? displayLabel(currentPlan.billingCycle) : '—'}
                                        </strong>
                                    </li>
                                </ul>
                            </div>

                            <a href="#available-plans-title" className="text-xs font-bold text-primary hover:underline">{t('plans.changePlan')}</a>
                        </div>
                    </div>
                )}
                <section aria-labelledby="available-plans-title" className="border-b border-slate-200 bg-white">
                    <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-3.5">
                        <h2 id="available-plans-title" className="m-0 flex items-center gap-2 text-sm font-bold text-slate-800">
                            <UavIcon size={18} aria-hidden="true" className="text-primary"/>{t('billingPage.plans')}
                        </h2>
                    </header>
                    {plansQuery.isLoading ? <p role="status" className="m-0 p-5 text-sm text-slate-500">{t('billingPage.loadingPlans')}</p>
                        : plansQuery.isError ? (
                            <p role="alert" className="m-0 p-5 text-sm text-danger">
                                {t('billingPage.plansError')}{' '}
                                <button
                                    type="button"
                                    className="text-primary font-bold hover:underline bg-transparent border-0 p-0 cursor-pointer"
                                    onClick={() => void plansQuery.refetch()}
                                >
                                    {t('common.retry')}
                                </button>
                            </p>
                        ) : <ServicePlanCards plans={plansList} currentPlanCode={quota?.planCode} pendingCode={subscribe.isPending ? subscribe.variables : null}
                                              onSelect={plan => {
                                                  if (window.confirm(t('plans.subscribeConfirm', {name: planName(plan.name), price: formatCurrency(plan.price)}))) subscribe.mutate(plan.code);
                                              }}/>}
                    {plansQuery.isSuccess && plansList.length === 0 && (
                        <p className="m-0 p-5 text-[13px] text-slate-500">{t('billingPage.noPlans')}</p>
                    )}
                </section>
                {/* Invoices Table */}
                <div data-testid="my-invoices" className="flex-1 overflow-hidden bg-white">
                    <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-3.5 flex justify-between items-center gap-3 flex-wrap">
                        <h2 className="m-0 text-sm font-bold text-slate-800 flex items-center gap-2">
                            <FileText size={17} className="text-slate-500"/> {t('billingPage.invoiceHistory')}
                        </h2>
                        <span className="text-xs text-slate-500 font-semibold whitespace-nowrap shrink-0">
                            {t('billingPage.recordCount', {count: invoices.length})}
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] border-collapse text-left text-[13px]">
                            <thead>
                            <tr className="bg-slate-50 border-b border-border text-slate-500 text-[11px]">
                                <th className="px-5 py-3 whitespace-nowrap font-bold">{t('billingPage.invoiceNo')}</th>
                                <th className="px-5 py-3 whitespace-nowrap font-bold">{t('billingPage.description')}</th>
                                <th className="px-5 py-3 whitespace-nowrap font-bold">{t('billingPage.issuedOn')}</th>
                                <th className="px-5 py-3 whitespace-nowrap font-bold">{t('billingPage.dueDate')}</th>
                                <th className="px-5 py-3 whitespace-nowrap font-bold">{t('billingPage.amount')}</th>
                                <th className="px-5 py-3 whitespace-nowrap font-bold">{t('common.status')}</th>
                                <th className="px-5 py-3 text-right whitespace-nowrap font-bold">{t('billingPage.actions')}</th>
                            </tr>
                            </thead>
                            <tbody>
                            {invoices.map(inv => (
                                <tr key={inv.id} className="border-b border-slate-100 transition-colors hover:bg-slate-50">
                                    <td className="px-5 py-4 tabular-nums font-extrabold text-slate-900">{inv.code}</td>
                                    <td className="px-5 py-4 text-slate-700 text-xs">{inv.missionTitle ?? (inv.planName ? planName(inv.planName) : inv.notes ?? '—')}</td>
                                    <td className="px-5 py-4 text-slate-500 text-xs">{formatDate(inv.createdAt)}</td>
                                    <td className="px-5 py-4 text-slate-500 text-xs">{formatDate(inv.dueDate)}</td>
                                    <td className="px-5 py-4 tabular-nums font-extrabold text-slate-900">
                                        {formatCurrency(inv.amount)}
                                    </td>
                                    <td className="px-5 py-4 text-slate-700 text-xs">
                                        <span className={`inline-flex items-center gap-1 rounded-badge px-2.5 py-1 text-[11px] font-bold border ${
                                            inv.status === 'PAID'
                                                ? 'bg-uav-blue-light text-uav-blue border-blue-200'
                                                : 'bg-amber-50 text-amber-700 border-amber-200'
                                        }`}>
                                            {inv.status === 'PAID' ? <CheckCircle size={12}/> : <Clock size={12}/>}
                                            {t(`billingPage.status.${inv.status}`)}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        {inv.status === 'PENDING' && transfer.data?.enabled ? (
                                            <button
                                                type="button"
                                                onClick={() => setPayingInvoice(inv)}
                                                className="bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold px-3.5 py-1.5 rounded-control border-0 cursor-pointer transition-colors"
                                            >
                                                {t('billingPage.viewPayment')}
                                            </button>
                                        ) : inv.status === 'PENDING' ? (
                                            <span className="text-xs text-slate-500" title={t('payment.awaitingTransferHint')}>{t('payment.awaitingTransfer')}</span>
                                        ) : (
                                            <span className="text-xs text-slate-400">
                                                {formatDate(inv.paidAt)}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                    {invoices.length === 0 && !isLoading && !queryError && (
                        <p role="status" className="m-0 py-8 px-5 text-center text-slate-500">
                            {t('billingPage.noInvoices')}
                        </p>
                    )}
                </div>

                {payingInvoice && <BankTransferDialog invoiceId={payingInvoice.id} onClose={() => {
                    setPayingInvoice(null);
                    void client.invalidateQueries({queryKey: [...key, 'billing']});
                }}/>}
            </div>
        </PageGuard>
    );
}
