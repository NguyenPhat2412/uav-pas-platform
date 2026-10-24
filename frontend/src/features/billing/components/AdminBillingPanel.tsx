'use client';

import {UavIcon} from '@/components/shared/UavIcon';
import React, {useState} from 'react';
import {planName} from "@/components/shared/presentation";
import {AdminPage} from '@/components/layout/AdminPage';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {AlertCircle, CheckCircle2, Edit3, Search, Users} from 'lucide-react';
import {adminService} from "@/lib/api/admin";
import {Drawer} from '@/components/data/Drawer';
import {ServicePlanCards} from '@/features/billing/components/ServicePlanCard';
import type {UserQuota} from "@/types/admin";
import {RequiredMark} from "@/components/shared/RequiredMark";
import {useI18n} from '@/contexts/I18nContext';
import {AdminInvoicesPanel} from '@/features/billing/components/AdminInvoicesPanel';
import {cn} from '@/lib/utils';

// API route: /api/v1/billing
function AdminBillingContent() {
    const queryClient = useQueryClient();
    const {t} = useI18n();
    const plansQuery = useQuery({
        queryKey: ['admin', 'billing', 'plans'],
        queryFn: ({signal}) => adminService.billingPlans(signal)
    });
    const quotasQuery = useQuery({
        queryKey: ['admin', 'billing', 'quotas'],
        queryFn: ({signal}) => adminService.billingQuotas(0, signal)
    });
    const updateQuota = useMutation({
        mutationFn: ({userId, planCode, flightHoursLimit}: {
            userId: number;
            planCode: string;
            flightHoursLimit: number
        }) =>
            adminService.updateQuota(userId, {planCode, flightHoursLimit}),
        onSuccess: () => queryClient.invalidateQueries({queryKey: ['admin', 'billing', 'quotas']}),
    });

    const [search, setSearch] = useState('');
    const [editingUser, setEditingUser] = useState<UserQuota | null>(null);
    const [newLimit, setNewLimit] = useState<number>(50);
    const [newPlan, setNewPlan] = useState<string>('PRO');

    const plans = plansQuery.data ?? [];
    const quotas = quotasQuery.data?.content ?? [];
    const isLoading = plansQuery.isLoading || quotasQuery.isLoading;
    const queryError = plansQuery.error ?? quotasQuery.error;

    const handleOpenEdit = (q: UserQuota) => {
        updateQuota.reset();
        setEditingUser(q);
        setNewLimit(q.flightHoursLimit);
        setNewPlan(q.planCode);
    };

    const handleSaveQuota = () => {
        if (!editingUser) return;
        updateQuota.mutate(
            {userId: editingUser.userId, planCode: newPlan, flightHoursLimit: newLimit},
            {onSuccess: () => setEditingUser(null)}
        );
    };

    const filteredQuotas = quotas.filter(q =>
        (q.fullName ?? '').toLowerCase().includes(search.toLowerCase()) ||
        q.username.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {isLoading && (
                <div
                    className="bg-card border border-border rounded-xl p-6 text-center text-xs text-slate-500">
                    {t('admin.billing.loading')}
                </div>
            )}

            {queryError && !isLoading && (
                <div
                    className="bg-rose-50 border border-rose-300 text-rose-700 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <AlertCircle size={16} className="text-rose-500 shrink-0"/>
                    <span>{t('admin.billing.loadError', {message: queryError instanceof Error ? queryError.message : t('admin.billing.unknownError')})}</span>
                </div>
            )}

            {updateQuota.isSuccess && (
                <div
                    className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm">
                    <CheckCircle2 size={16} className="text-success"/>
                    <span>{t('admin.billing.quotaUpdated')}</span>
                </div>
            )}

            {/* Service Plans Cards */}
            <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                    <UavIcon size={18} className="text-primary"/> {t('admin.billing.plansHeading')}
                </h2>
                <ServicePlanCards plans={plans}/>
            </div>

            {/* User Quotas Management Table */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div
                    className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                            <Users size={16} className="text-primary"/> {t('admin.billing.quotasHeading')}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {t('admin.billing.quotasIntro')}
                        </p>
                    </div>

                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                        <input
                            type="text"
                            aria-label={t('admin.billing.searchCustomer')}
                            placeholder={t('admin.billing.searchPlaceholder')}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="bg-slate-50 border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary transition w-60"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto" tabIndex={0} aria-label={t('admin.billing.dataTable')}>
                    <table className="w-full border-collapse text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-border">
                        <tr>
                            <th className="px-5 py-3">{t('admin.billing.col.customer')}</th>
                            <th className="px-5 py-3">{t('admin.billing.col.plan')}</th>
                            <th className="px-5 py-3">{t('admin.billing.col.monthlyLimit')}</th>
                            <th className="px-5 py-3">{t('admin.billing.col.flown')}</th>
                            <th className="px-5 py-3">{t('admin.billing.col.usage')}</th>
                            <th className="px-5 py-3">{t('admin.billing.col.concurrent')}</th>
                            <th className="px-5 py-3 text-right">{t('admin.billing.col.actions')}</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                        {filteredQuotas.length === 0 && !isLoading && !queryError && (
                            <tr>
                                <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                                    {t('admin.billing.noQuotas')}
                                </td>
                            </tr>
                        )}
                        {filteredQuotas.map(q => {
                            const ratio = Math.round((q.flightHoursUsed / Math.max(q.flightHoursLimit, 0.01)) * 100);
                            return (
                                <tr key={q.userId} className="hover:bg-slate-50/70 transition">
                                    <td className="px-5 py-3.5">
                                        <strong
                                            className="text-slate-900 block font-semibold">{q.fullName ?? q.username}</strong>
                                        <span className="text-slate-400 tabular-nums text-[11px]">@{q.username}</span>
                                    </td>
                                    <td className="px-5 py-3.5">
                      <span
                          className="tabular-nums font-bold px-2 py-0.5 rounded text-[11px] bg-blue-50 text-blue-700 border border-border">
                        {q.planCode}
                      </span>
                                    </td>
                                    <td className="px-5 py-3.5 tabular-nums font-bold text-slate-800">{t('admin.billing.hours', {hours: q.flightHoursLimit})}</td>
                                    <td className="px-5 py-3.5 tabular-nums text-slate-700">{t('admin.billing.hours', {hours: q.flightHoursUsed})}</td>
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                <div
                                                    className={`h-full ${ratio > 85 ? 'bg-rose-500' : 'bg-blue-600'}`}
                                                    style={{width: `${Math.min(100, ratio)}%`}}
                                                />
                                            </div>
                                            <span className="tabular-nums text-slate-600 font-semibold">{ratio}%</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5 tabular-nums text-slate-700">
                                        {q.concurrentUavsUsed} / {q.concurrentUavsLimit}
                                    </td>
                                    <td className="px-5 py-3.5 text-right">
                                        <button
                                            type="button"
                                            onClick={() => handleOpenEdit(q)}
                                            className="px-2.5 py-1 text-primary hover:bg-primary/5 rounded border border-border transition font-medium inline-flex items-center gap-1 cursor-pointer"
                                        >
                                            <Edit3 size={12}/> {t('admin.billing.edit')}
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Quota Modal */}
            {editingUser && (
                <Drawer title={t('admin.billing.drawerTitle')} onClose={() => setEditingUser(null)}>
                    <div className="space-y-4">
                        <div className="space-y-3 text-xs">
                            <div>
                                <span className="text-slate-500 block mb-1">{t('admin.billing.customer')}</span>
                                <strong
                                    className="text-slate-800 text-sm">{editingUser.fullName || editingUser.username}</strong>
                            </div>

                            <div>
                                <label htmlFor="quota-plan" className="text-slate-700 font-semibold block mb-1">{t('admin.billing.servicePlan')}<RequiredMark/></label>
                                <select
                                    id="quota-plan"
                                    required
                                    value={newPlan}
                                    onChange={e => setNewPlan(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-primary"
                                >
                                    {plans.map(p => (
                                        <option key={p.code}
                                                value={p.code}>{t('admin.billing.planOption', {name: planName(p.name), code: p.code, hours: p.maxMonthlyFlightHours})}</option>
                                    ))}
                                </select>
                            </div>

                            {updateQuota.error && (
                                <div
                                    className="bg-rose-50 border border-rose-200 rounded-lg p-2.5 flex items-start gap-2 text-rose-700">
                                    <AlertCircle size={14} className="shrink-0 mt-0.5"/>
                                    <span>{t('admin.billing.saveFailed', {message: updateQuota.error instanceof Error ? updateQuota.error.message : t('admin.billing.unknownError')})}</span>
                                </div>
                            )}

                            <div>
                                <label htmlFor="quota-limit" className="text-slate-700 font-semibold block mb-1">{t('admin.billing.limitLabel')}<RequiredMark/></label>
                                <input
                                    id="quota-limit"
                                    required
                                    type="number"
                                    min="5"
                                    max="1000"
                                    value={newLimit}
                                    onChange={e => setNewLimit(Number(e.target.value))}
                                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs tabular-nums font-bold text-slate-800 focus:outline-none focus:border-primary"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setEditingUser(null)}
                                className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-border bg-card hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            >
                                {t('admin.billing.cancel')}
                            </button>
                            <button
                                type="button"
                                disabled={updateQuota.isPending}
                                onClick={handleSaveQuota}
                                className="px-3.5 py-1.5 text-xs font-bold text-primary-foreground bg-primary hover:bg-primary-hover rounded-lg transition shadow-sm disabled:opacity-50 cursor-pointer"
                            >
                                {updateQuota.isPending ? t('admin.billing.saving') : t('admin.billing.saveChanges')}
                            </button>
                        </div>
                    </div>
                </Drawer>
            )}
        </div>
    );
}

function BillingTabs() {
    const {t} = useI18n();
    const [tab, setTab] = useState<'plans' | 'invoices'>('plans');
    return (
        <div className="space-y-5">
            <div className="flex border-b border-slate-200" role="tablist" aria-label={t('admin.invoices.tabs.label')}>
                {(['plans', 'invoices'] as const).map(key => (
                    <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
                            className={cn('-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors',
                                tab === key ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-900')}>
                        {t(`admin.invoices.tabs.${key}`)}
                    </button>
                ))}
            </div>
            {tab === 'plans' ? <AdminBillingContent/> : <AdminInvoicesPanel/>}
        </div>
    );
}

export default function AdminBillingPage() {
    return (
        <AdminPage
            title="admin.pages.billing.title"
            meta="admin.pages.billing.meta"
            permission="PERMISSION_MANAGE"
            activeResource="billing"
        >
            <BillingTabs/>
        </AdminPage>
    );
}
