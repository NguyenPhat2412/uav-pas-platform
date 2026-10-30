'use client';

import React, {useState} from 'react';
import {planName} from '@/components/shared/presentation';
import {AdminPage} from '@/components/layout/AdminPage';
import {
    AlertCircle,
    CheckCircle2,
    Edit3,
    Search,
    Users,
} from 'lucide-react';
import {useBillingPlans, useUpdateQuota, useUserQuotas} from '@/features/billing/hooks/useBillingAdmin';
import {Drawer} from '@/components/data/Drawer';
import type {UserQuota} from '@/types/admin';
import {RequiredMark} from '@/components/shared/RequiredMark';
import {useI18n} from '@/providers/I18nContext';
import {AdminInvoicesPanel} from '@/features/billing/components/AdminInvoicesPanel';
import {AdminPlansManager} from '@/features/billing/components/AdminPlansManager';

export function AdminQuotasManagerSection() {
    const {t} = useI18n();
    const plansQuery = useBillingPlans();
    const quotasQuery = useUserQuotas();
    const updateQuota = useUpdateQuota();

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
            {onSuccess: () => setEditingUser(null)},
        );
    };

    const filteredQuotas = quotas.filter(
        (q) =>
            (q.fullName ?? '').toLowerCase().includes(search.toLowerCase()) ||
            q.username.toLowerCase().includes(search.toLowerCase()),
    );

    const totalAllocatedHours = quotas.reduce((sum, q) => sum + (q.flightHoursLimit || 0), 0);
    const totalUsedHours = quotas.reduce((sum, q) => sum + (q.flightHoursUsed || 0), 0);
    const highUsageAccounts = quotas.filter(
        (q) => q.flightHoursLimit > 0 && q.flightHoursUsed / q.flightHoursLimit >= 0.85,
    ).length;

    return (
        <div className="space-y-4">
            {/* 4-Card Quota KPI Strip */}
            <div className="grid grid-cols-1 divide-y divide-border border border-border bg-card sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
                <div className="p-4">
                    <span className="text-[11px] font-semibold text-slate-500">{t('admin.billing.kpi.accounts')}</span>
                    <div className="mt-1 font-mono text-2xl font-bold text-slate-900">
                        {quotas.length}
                    </div>
                </div>
                <div className="p-4">
                    <span className="text-[11px] font-semibold text-slate-500">{t('admin.billing.kpi.allocated')}</span>
                    <div className="mt-1 font-mono text-2xl font-bold text-slate-900">
                        {totalAllocatedHours.toFixed(1)}h
                    </div>
                </div>
                <div className="p-4">
                    <span className="text-[11px] font-semibold text-slate-500">{t('admin.billing.kpi.used')}</span>
                    <div className="mt-1 font-mono text-2xl font-bold text-blue-700">
                        {totalUsedHours.toFixed(1)}h
                    </div>
                </div>
                <div className="p-4">
                    <span className="text-[11px] font-semibold text-slate-500">{t('admin.billing.kpi.nearLimit')}</span>
                    <div className="mt-1 font-mono text-2xl font-bold text-amber-700">
                        {highUsageAccounts}
                    </div>
                </div>
            </div>

            {isLoading && (
                <div className="rounded-panel border border-border bg-card p-6 text-center text-xs text-slate-500">
                    {t('admin.billing.loading')}
                </div>
            )}

            {queryError && !isLoading && (
                <div className="flex items-center gap-2 rounded-panel border border-rose-300 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
                    <AlertCircle size={16} className="shrink-0 text-rose-500" />
                    <span>
                        {t('admin.billing.loadError', {
                            message:
                                queryError instanceof Error
                                    ? queryError.message
                                    : t('admin.billing.unknownError'),
                        })}
                    </span>
                </div>
            )}

            {updateQuota.isSuccess && (
                <div className="flex items-center gap-2 rounded-panel border border-blue-200 bg-uav-blue-light px-4 py-2.5 text-xs font-semibold text-uav-blue">
                    <CheckCircle2 size={16} className="text-uav-blue" />
                    <span>{t('admin.billing.quotaUpdated')}</span>
                </div>
            )}

            {/* User Quotas Management Table */}
            <div className="overflow-hidden rounded-panel border border-border bg-card">
                <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                        <Users size={16} className="text-primary" />{' '}
                        {t('admin.billing.quotasHeading')}
                    </h3>

                    <div className="relative">
                        <Search
                            size={14}
                            className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                        />
                        <input
                            type="text"
                            aria-label={t('admin.billing.searchCustomer')}
                            placeholder={t('admin.billing.searchPlaceholder')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-60 rounded-control border border-border bg-slate-50 py-1.5 pr-3 pl-8 text-xs text-slate-800 placeholder-slate-400 transition focus:border-primary focus:outline-none"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto" tabIndex={0} aria-label={t('admin.billing.dataTable')}>
                    <table className="w-full border-collapse text-left text-xs">
                        <thead className="border-b border-border bg-slate-50 font-semibold text-slate-600 uppercase">
                            <tr>
                                <th className="px-5 py-3">{t('admin.billing.col.customer')}</th>
                                <th className="px-5 py-3">{t('admin.billing.col.plan')}</th>
                                <th className="px-5 py-3">{t('admin.billing.col.monthlyLimit')}</th>
                                <th className="px-5 py-3">{t('admin.billing.col.flown')}</th>
                                <th className="px-5 py-3">{t('admin.billing.col.usage')}</th>
                                <th className="px-5 py-3">{t('admin.billing.col.concurrent')}</th>
                                <th className="px-5 py-3 text-right">
                                    {t('admin.billing.col.actions')}
                                </th>
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
                            {filteredQuotas.map((q) => {
                                const ratio = Math.round(
                                    (q.flightHoursUsed / Math.max(q.flightHoursLimit, 0.01)) * 100,
                                );
                                return (
                                    <tr key={q.userId} className="transition hover:bg-slate-50/70">
                                        <td className="px-5 py-3.5">
                                            <strong className="block font-semibold text-slate-900">
                                                {q.fullName ?? q.username}
                                            </strong>
                                            <span className="text-[11px] text-slate-400 tabular-nums">
                                                @{q.username}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className="rounded-panel border border-border bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 tabular-nums">
                                                {q.planCode}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 font-bold text-slate-800 tabular-nums">
                                            {t('admin.billing.hours', {hours: q.flightHoursLimit})}
                                        </td>
                                        <td className="px-5 py-3.5 text-slate-700 tabular-nums">
                                            {t('admin.billing.hours', {hours: q.flightHoursUsed})}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-2">
                                                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                                                    <div
                                                        className={`h-full ${
                                                            ratio > 85
                                                                ? 'bg-rose-500'
                                                                : 'bg-blue-600'
                                                        }`}
                                                        style={{width: `${Math.min(100, ratio)}%`}}
                                                    />
                                                </div>
                                                <span className="font-semibold text-slate-600 tabular-nums">
                                                    {ratio}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 text-slate-700 tabular-nums">
                                            {q.concurrentUavsUsed} / {q.concurrentUavsLimit}
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            <button
                                                type="button"
                                                onClick={() => handleOpenEdit(q)}
                                                className="inline-flex cursor-pointer items-center gap-1 rounded-control border border-border px-2.5 py-1 font-medium text-primary transition hover:bg-primary/5"
                                            >
                                                <Edit3 size={12} /> {t('admin.billing.edit')}
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
                                <span className="mb-1 block text-slate-500">
                                    {t('admin.billing.customer')}
                                </span>
                                <strong className="text-sm text-slate-800">
                                    {editingUser.fullName || editingUser.username}
                                </strong>
                            </div>

                            <div>
                                <label
                                    htmlFor="quota-plan"
                                    className="mb-1 block font-semibold text-slate-700"
                                >
                                    {t('admin.billing.servicePlan')}
                                    <RequiredMark />
                                </label>
                                <select
                                    id="quota-plan"
                                    aria-required
                                    value={newPlan}
                                    onChange={(e) => setNewPlan(e.target.value)}
                                    className="w-full rounded-control border border-slate-300 bg-slate-50 p-2 text-xs text-slate-800 focus:border-primary focus:outline-none"
                                >
                                    {plans.map((p) => (
                                        <option key={p.code} value={p.code}>
                                            {t('admin.billing.planOption', {
                                                name: planName(p.name),
                                                code: p.code,
                                                hours: p.maxMonthlyFlightHours,
                                            })}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {updateQuota.error && (
                                <div className="flex items-start gap-2 rounded-panel border border-rose-200 bg-rose-50 p-2.5 text-rose-700">
                                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                                    <span>
                                        {t('admin.billing.saveFailed', {
                                            message:
                                                updateQuota.error instanceof Error
                                                    ? updateQuota.error.message
                                                    : t('admin.billing.unknownError'),
                                        })}
                                    </span>
                                </div>
                            )}

                            <div>
                                <label
                                    htmlFor="quota-limit"
                                    className="mb-1 block font-semibold text-slate-700"
                                >
                                    {t('admin.billing.limitLabel')}
                                    <RequiredMark />
                                </label>
                                <input
                                    id="quota-limit"
                                    aria-required
                                    type="number"
                                    value={newLimit}
                                    onChange={(e) => setNewLimit(Number(e.target.value))}
                                    className="w-full rounded-control border border-slate-300 bg-slate-50 p-2 text-xs font-bold text-slate-800 tabular-nums focus:border-primary focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-2">
                            <button
                                type="button"
                                onClick={() => setEditingUser(null)}
                                className="cursor-pointer rounded-control border border-border bg-card px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                            >
                                {t('admin.billing.cancel')}
                            </button>
                            <button
                                type="button"
                                disabled={updateQuota.isPending}
                                onClick={handleSaveQuota}
                                className="cursor-pointer rounded-control bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
                            >
                                {updateQuota.isPending
                                    ? t('admin.billing.saving')
                                    : t('admin.billing.saveChanges')}
                            </button>
                        </div>
                    </div>
                </Drawer>
            )}
        </div>
    );
}

export function AdminBillingPlansWorkspace() {
    const {t} = useI18n();
    return (
        <AdminPage
            title={t('admin.pages.billing.title')}
            permission="USER_MANAGE"
            activeResource="/admin/billing/plans"
        >
            <div className="space-y-4">
                <AdminPlansManager />
            </div>
        </AdminPage>
    );
}

export function AdminBillingQuotasWorkspace() {
    const {t} = useI18n();
    return (
        <AdminPage
            title={t('adminNav.billingQuotas')}
            permission="USER_MANAGE"
            activeResource="/admin/billing/quotas"
        >
            <div className="space-y-4">
                <AdminQuotasManagerSection />
            </div>
        </AdminPage>
    );
}

export function AdminBillingInvoicesWorkspace() {
    const {t} = useI18n();
    return (
        <AdminPage
            title={t('adminNav.billingInvoices')}
            permission="USER_MANAGE"
            activeResource="/admin/billing/invoices"
        >
            <div className="space-y-4">
                <AdminInvoicesPanel />
            </div>
        </AdminPage>
    );
}

export default function AdminBillingPage() {
    return <AdminBillingPlansWorkspace />;
}
