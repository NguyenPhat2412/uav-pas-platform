'use client';

import React, {useCallback, useMemo, useState} from 'react';
import {Activity, Clock, ShieldAlert, Users} from 'lucide-react';
import {Alert, KpiCard, MetricStrip} from '@/components/ui';
import {AdminPage} from '@/components/layout/AdminPage';
import {useBillingPlans, useUpdateQuota, useUserQuotas} from '@/hooks/billing/useBillingAdmin';
import {
    canSubmitUserQuota,
    toUserQuotaDraft,
    toUserQuotaPayload,
    type UserQuotaDraft,
} from '@/forms/billing/billing-form';
import type {UserQuota} from '@/types/admin';
import {useI18n} from '@/providers/I18nContext';
import {AdminInvoicesPanel} from '@/components/billing/AdminInvoicesPanel';
import {AdminPlansManager} from '@/components/billing/AdminPlansManager';
import {AdminBillingQuotaDrawer} from '@/components/billing/AdminBillingQuotaDrawer';
import {AdminBillingQuotaTable} from '@/components/billing/AdminBillingQuotaTable';

export function AdminQuotasManagerSection() {
    const {t} = useI18n();
    const plansQuery = useBillingPlans();
    const quotasQuery = useUserQuotas();
    const updateQuota = useUpdateQuota();

    const [editingUser, setEditingUser] = useState<UserQuota | null>(null);
    const [quotaDraft, setQuotaDraft] = useState<UserQuotaDraft>({
        planCode: 'PRO',
        flightHoursLimit: '50',
    });

    const plans = plansQuery.data ?? [];
    const quotas = useMemo(() => quotasQuery.data?.content ?? [], [quotasQuery.data]);
    const isLoading = plansQuery.isLoading || quotasQuery.isLoading;
    const queryError = plansQuery.error ?? quotasQuery.error;

    const handleOpenEdit = useCallback(
        (q: UserQuota) => {
            updateQuota.reset();
            setEditingUser(q);
            setQuotaDraft(toUserQuotaDraft(q));
        },
        [updateQuota],
    );

    const handleSaveQuota = () => {
        if (!editingUser || !canSubmitUserQuota(quotaDraft)) return;
        updateQuota.mutate(toUserQuotaPayload(editingUser.userId, quotaDraft), {
            onSuccess: () => setEditingUser(null),
        });
    };

    const totalAllocatedHours = quotas.reduce((sum, q) => sum + (q.flightHoursLimit || 0), 0);
    const totalUsedHours = quotas.reduce((sum, q) => sum + (q.flightHoursUsed || 0), 0);
    const highUsageAccounts = quotas.filter(
        q => q.flightHoursLimit > 0 && q.flightHoursUsed / q.flightHoursLimit >= 0.85,
    ).length;

    return (
        <div className="space-y-4">
            <MetricStrip>
                <KpiCard
                    label={t('admin.billing.kpi.accounts')}
                    value={quotas.length}
                    icon={<Users size={16} aria-hidden="true" />}
                    tone="red"
                />
                <KpiCard
                    label={t('admin.billing.kpi.allocated')}
                    value={`${totalAllocatedHours.toFixed(1)}h`}
                    icon={<Clock size={16} aria-hidden="true" />}
                    tone="slate"
                />
                <KpiCard
                    label={t('admin.billing.kpi.used')}
                    value={`${totalUsedHours.toFixed(1)}h`}
                    icon={<Activity size={16} aria-hidden="true" />}
                    tone="blue"
                />
                <KpiCard
                    label={t('admin.billing.kpi.nearLimit')}
                    value={highUsageAccounts}
                    icon={<ShieldAlert size={16} aria-hidden="true" />}
                    tone="amber"
                />
            </MetricStrip>

            {isLoading && <Alert variant="info">{t('admin.billing.loading')}</Alert>}

            {queryError && !isLoading && (
                <Alert variant="error">
                    {t('admin.billing.loadError', {
                        message:
                            queryError instanceof Error
                                ? queryError.message
                                : t('admin.billing.unknownError'),
                    })}
                </Alert>
            )}

            {updateQuota.isSuccess && (
                <Alert variant="success">{t('admin.billing.quotaUpdated')}</Alert>
            )}

            {/* User Quotas Management */}
            <AdminBillingQuotaTable quotas={quotas} onEdit={handleOpenEdit} />

            {editingUser && (
                <AdminBillingQuotaDrawer
                    editingUser={editingUser}
                    plans={plans}
                    quotaDraft={quotaDraft}
                    onDraftChange={setQuotaDraft}
                    onClose={() => setEditingUser(null)}
                    onSave={handleSaveQuota}
                    isPending={updateQuota.isPending}
                    error={updateQuota.error}
                />
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
