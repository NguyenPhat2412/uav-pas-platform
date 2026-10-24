'use client';

import {UavIcon} from '@/components/shared/UavIcon';
import React, {useState} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {BankTransferDialog} from '@/features/billing/components/BankTransferDialog';
import {bankTransferService} from '@/features/billing/services/bank-transfer.service';
import {toast} from '@/contexts/ToastContext';
import {useCustomerScope} from '@/lib/query/customer';
import {displayLabel, planName} from "@/components/shared/presentation";
import {AlertCircle, CheckCircle, Clock, CreditCard, FileText, Radar} from 'lucide-react';
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
            <div className="max-w-[1180px] mx-auto flex flex-col gap-6">
                {/* Header */}
                <div className="border-b border-border pb-4 flex justify-between items-end">
                    <div>
                        <h1 className="m-0 text-[26px] font-extrabold text-slate-900 flex items-center gap-2.5">
                            <CreditCard className="text-primary shrink-0" size={28}/> {t('billingPage.title')}
                        </h1>
                        <p className="mt-1.5 mb-0 text-[13px] text-slate-500">
                            {t('billingPage.subtitle')}
                        </p>
                    </div>
                </div>

                {isLoading && (
                    <div className="bg-card border border-border rounded-2xl p-8 text-center text-slate-500">
                        {t('billingPage.loading')}
                    </div>
                )}

                {queryError && !isLoading && (
                    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex gap-3 text-rose-700">
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
                    <div data-testid="my-quota" className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        {/* Card 1: Current Plan */}
                        <div className="bg-gradient-to-br from-primary-hover to-primary text-primary-foreground rounded-2xl p-6 shadow-lg flex flex-col justify-between relative overflow-hidden min-h-[220px]">
                            <div className="absolute -top-2.5 -right-2.5 opacity-15 pointer-events-none text-white">
                                <UavIcon size={140} className="text-white" aria-hidden="true"/>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <span className="bg-white/20 text-white text-[11px] font-bold px-2.5 py-1 rounded-full border border-white/30 inline-flex w-fit">
                                        {t('billingPage.currentPlan')}
                                    </span>
                                    <span className="text-[11px] text-rose-100">
                                        {t('billingPage.cycleEnds', {date: formatDate(quota.cycleEnd)})}
                                    </span>
                                </div>
                                <h3 className="mt-3 mb-1.5 text-xl font-extrabold text-white leading-snug">{planName(quota.planName)}</h3>
                                <p className="m-0 text-xs text-rose-200 leading-relaxed">
                                    {t('billingPage.planDescription')}
                                </p>
                            </div>

                            <div className="border-t border-white/20 pt-3 mt-4 flex justify-between items-center text-xs text-rose-100">
                                <span>{t('billingPage.concurrentMissions')}</span>
                                <strong className="tabular-nums text-sm text-white">
                                    {quota.concurrentUavsUsed} / {quota.concurrentUavsLimit} UAV
                                </strong>
                            </div>
                        </div>

                        {/* Card 2: Flight Hours Quota */}
                        <div className="bg-card border border-border border-t-[3px] border-t-primary rounded-2xl p-6 shadow-xs flex flex-col justify-between min-h-[220px]">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t('billingPage.hoursUsed')}</span>
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
                        <div className="bg-card border border-border border-t-[3px] border-t-success rounded-2xl p-6 shadow-xs flex flex-col justify-between min-h-[220px]">
                            <div>
                                <span className="block mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    {t('billingPage.features')}
                                </span>
                                <ul className="list-none p-0 m-0 flex flex-col gap-2.5 text-xs">
                                    <li className="flex justify-between items-center">
                                        <span className="flex items-center gap-1.5 text-slate-700">
                                            <Radar size={15} aria-hidden="true"/> {t('billingPage.sarAi')}
                                        </span>
                                        <span className="bg-uav-blue-light text-uav-blue text-[11px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1 border border-blue-200">
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
                <section aria-labelledby="available-plans-title">
                    <h2 id="available-plans-title" className="m-0 mb-4 text-base font-extrabold text-slate-900 flex items-center gap-2">
                        <UavIcon size={22} aria-hidden="true" className="text-primary"/>{t('billingPage.plans')}
                    </h2>
                    {plansQuery.isLoading ? <p role="status" className="text-sm text-slate-500">{t('billingPage.loadingPlans')}</p>
                        : plansQuery.isError ? (
                            <p role="alert" className="text-sm text-danger">
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
                        <p className="text-[13px] text-slate-500">{t('billingPage.noPlans')}</p>
                    )}
                </section>
                {/* Invoices Table */}
                <div data-testid="my-invoices" className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
                    <div className="px-6 py-4 border-b border-border flex justify-between items-center gap-3 flex-wrap">
                        <h2 className="m-0 text-base font-extrabold text-slate-900 flex items-center gap-2">
                            <FileText size={20} className="text-slate-500"/> {t('billingPage.invoiceHistory')}
                        </h2>
                        <span className="text-xs text-slate-500 font-semibold whitespace-nowrap shrink-0">
                            {t('billingPage.recordCount', {count: invoices.length})}
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] border-collapse text-left text-[13px]">
                            <thead>
                            <tr className="bg-slate-50 border-b border-border text-slate-500 text-[11px] uppercase tracking-wider">
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
                                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold border ${
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
                                                className="bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold px-3.5 py-1.5 rounded-lg border-0 cursor-pointer transition-colors shadow-xs"
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
