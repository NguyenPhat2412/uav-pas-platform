'use client';

import React from 'react';
import {Alert, Badge, Button, Card, FormField, Input, Select} from '@/components/ui';
import {Drawer} from '@/components/data/Drawer';
import {
    canSubmitUserQuota,
    quotaFieldErrors,
    type UserQuotaDraft,
} from '@/forms/billing/billing-form';
import {planName} from '@/lib/presentation';
import {useI18n} from '@/providers/I18nContext';
import type {UserQuota} from '@/types/admin';

export interface QuotaPlanOption {
    code: string;
    name: string;
    maxMonthlyFlightHours: number;
}

export interface AdminBillingQuotaDrawerProps {
    editingUser: UserQuota;
    plans: ReadonlyArray<QuotaPlanOption>;
    quotaDraft: UserQuotaDraft;
    onDraftChange: React.Dispatch<React.SetStateAction<UserQuotaDraft>>;
    onClose: () => void;
    onSave: () => void;
    isPending: boolean;
    error: unknown;
}

export function AdminBillingQuotaDrawer({
    editingUser,
    plans,
    quotaDraft,
    onDraftChange,
    onClose,
    onSave,
    isPending,
    error,
}: AdminBillingQuotaDrawerProps) {
    const {t} = useI18n();
    const quotaErrors = quotaFieldErrors(error);

    return (
        <Drawer title={t('admin.billing.drawerTitle')} onClose={onClose}>
            <form
                noValidate
                className="space-y-4"
                onSubmit={e => {
                    e.preventDefault();
                    onSave();
                }}
            >
                <Card className="bg-slate-50/70 p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div>
                            <span className="mb-0.5 block text-slate-500">
                                {t('admin.billing.customer')}
                            </span>
                            <strong className="text-sm font-semibold text-slate-900">
                                {editingUser.fullName || editingUser.username}
                            </strong>
                            <span className="ml-2 font-mono text-[11px] text-slate-500">
                                @{editingUser.username}
                            </span>
                        </div>
                        <Badge variant="primary" size="sm">
                            {editingUser.planCode}
                        </Badge>
                    </div>
                </Card>

                <div className="space-y-4">
                    <FormField
                        id="quota-plan"
                        label={t('admin.billing.servicePlan')}
                        required
                        error={quotaErrors?.planCode}
                    >
                        <Select
                            id="quota-plan"
                            required
                            aria-invalid={Boolean(quotaErrors?.planCode) || undefined}
                            value={quotaDraft.planCode}
                            onChange={e =>
                                onDraftChange(prev => ({
                                    ...prev,
                                    planCode: e.target.value,
                                }))
                            }
                        >
                            {plans.map(p => (
                                <option key={p.code} value={p.code}>
                                    {t('admin.billing.planOption', {
                                        name: planName(p.name),
                                        code: p.code,
                                        hours: p.maxMonthlyFlightHours,
                                    })}
                                </option>
                            ))}
                        </Select>
                    </FormField>

                    {Boolean(error) && !quotaErrors && (
                        <Alert variant="error">
                            {t('admin.billing.saveFailed', {
                                message:
                                    error instanceof Error
                                        ? error.message
                                        : t('admin.billing.unknownError'),
                            })}
                        </Alert>
                    )}

                    <FormField
                        id="quota-limit"
                        label={t('admin.billing.limitLabel')}
                        required
                        error={quotaErrors?.flightHoursLimit}
                    >
                        <Input
                            id="quota-limit"
                            required
                            aria-invalid={Boolean(quotaErrors?.flightHoursLimit) || undefined}
                            type="number"
                            value={quotaDraft.flightHoursLimit}
                            onChange={e =>
                                onDraftChange(prev => ({
                                    ...prev,
                                    flightHoursLimit: e.target.value,
                                }))
                            }
                            className="h-11 font-bold tabular-nums"
                        />
                    </FormField>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                    <Button type="button" variant="outline" size="sm" onClick={onClose}>
                        {t('admin.billing.cancel')}
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        isLoading={isPending}
                        loadingText={t('admin.billing.saving')}
                        disabled={isPending || !canSubmitUserQuota(quotaDraft)}
                    >
                        {t('admin.billing.saveChanges')}
                    </Button>
                </div>
            </form>
        </Drawer>
    );
}
