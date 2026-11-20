'use client';

import Link from 'next/link';
import {
    Calendar,
    ClipboardList,
    FolderKanban,
    Layers,
    MapPin,
    ShieldCheck,
    User,
    XCircle,
} from 'lucide-react';
import {Drawer, Metadata} from '@/components/data/Drawer';
import {Alert, Button} from '@/components/ui';
import {
    IllustrativeTag,
    MarketplaceCardListSkeleton,
    MarketplaceErrorPanel,
} from '@/components/marketplace/MarketplaceShared';
import {
    canAdminCancelSubscription,
    formatMarketplaceVnd,
    sanitizeMarketplaceText,
} from '@/forms/marketplace/admin-marketplace-form';
import {
    useAdminProjectSubscriptions,
    useCancelAdminProjectSubscription,
} from '@/hooks/marketplace/useAdminMarketplace';
import {useAuth} from '@/providers/AuthContext';
import {confirmDialog} from '@/providers/ConfirmContext';
import {useI18n} from '@/providers/I18nContext';
import {toast} from '@/providers/ToastContext';
import type {
    AdminCustomerProject,
    AdminProjectSubscription,
} from '@/types/marketplace/marketplace.types';

export function ProjectSubscriptionsDrawer({
    project,
    onClose,
}: {
    project: AdminCustomerProject;
    onClose: () => void;
}) {
    const {t, formatDate} = useI18n();
    const {can} = useAuth();
    const canCancel = can('USER_MANAGE') || can('MARKETPLACE_MODERATE');

    const subsQuery = useAdminProjectSubscriptions(project.id);
    const cancelMutation = useCancelAdminProjectSubscription();
    const subs = subsQuery.data?.content ?? [];

    const customerDisplay =
        sanitizeMarketplaceText(project.customerFullName) ||
        project.customerUsername ||
        (project.customerId ? `#${project.customerId}` : '—');

    const handleCancelSub = async (sub: AdminProjectSubscription) => {
        const title = sanitizeMarketplaceText(sub.listingTitle) || `#${sub.listingId}`;
        const confirmed = await confirmDialog({
            title: t('adminCommerce.marketplace.projects.cancelConfirmTitle'),
            description: t('adminCommerce.marketplace.projects.cancelConfirmDesc', {
                title,
                code: project.code,
            }),
            confirmLabel: t('adminCommerce.marketplace.projects.cancelSubBtn'),
            cancelLabel: t('adminCommerce.marketplace.close'),
            variant: 'danger',
        });
        if (!confirmed) return;
        try {
            await cancelMutation.mutateAsync({
                projectId: project.id,
                subscriptionId: sub.id,
            });
            toast.success(t('adminCommerce.marketplace.projects.cancelledToast'));
        } catch (err) {
            toast.error(
                err instanceof Error && err.message
                    ? err.message
                    : t('adminCommerce.marketplace.projects.cancelError'),
            );
        }
    };

    return (
        <Drawer
            wide
            title={t('adminCommerce.marketplace.projects.drawerTitle', {code: project.code})}
            onClose={onClose}
        >
            <Alert variant="info" icon={<ShieldCheck size={15} aria-hidden="true"/>} className="text-xs">
                {t('adminCommerce.marketplace.projects.readOnlyHint')}
            </Alert>

            <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="m-0 flex items-center gap-2 text-sm font-semibold text-on-surface">
                        <FolderKanban size={16} className="text-primary" aria-hidden="true"/>
                        {t('adminCommerce.marketplace.projects.projectInfoSection')}
                    </h3>
                    <Link
                        href={`/admin/marketplace/orders?projectId=${project.id}`}
                        className="inline-flex min-h-8 items-center gap-1.5 rounded-control border border-border bg-surface-container-low px-3 text-xs font-semibold whitespace-nowrap text-on-surface transition-colors hover:border-slate-400"
                    >
                        <ClipboardList size={13} aria-hidden="true"/>
                        {t('adminCommerce.marketplace.projects.viewOrdersBtn')}
                    </Link>
                </div>

                <Metadata
                    items={[
                        [
                            t('adminCommerce.marketplace.projects.customerLabel'),
                            <span key="cust" className="inline-flex items-center gap-1.5">
                                <User size={13} className="text-muted" aria-hidden="true"/>
                                <span>{customerDisplay}</span>
                                {project.customerUsername && project.customerFullName && (
                                    <span className="font-mono text-xs text-muted">@{project.customerUsername}</span>
                                )}
                            </span>,
                        ],
                        [
                            t('adminCommerce.marketplace.projects.provinceLabel'),
                            <span key="prov" className="inline-flex items-center gap-1">
                                <MapPin size={13} className="text-muted" aria-hidden="true"/>
                                <span>{project.province || '—'}</span>
                            </span>,
                        ],
                        [
                            t('adminCommerce.marketplace.projects.statusFilter'),
                            project.status === 'ACTIVE'
                                ? t('adminCommerce.marketplace.projects.statusActive')
                                : t('adminCommerce.marketplace.projects.statusArchived'),
                        ],
                        [
                            t('adminCommerce.marketplace.projects.createdLabel'),
                            project.createdAt ? formatDate(project.createdAt) : '—',
                        ],
                    ]}
                />

                {project.note && (
                    <p className="m-0 rounded-panel border border-border bg-slate-50/70 p-3 text-xs text-muted">
                        {sanitizeMarketplaceText(project.note)}
                    </p>
                )}
            </section>

            <section className="space-y-3">
                <h3 className="m-0 flex items-center gap-2 text-sm font-semibold text-on-surface tabular-nums">
                    <Layers size={16} className="text-primary" aria-hidden="true"/>
                    {t('adminCommerce.marketplace.projects.subsSection', {
                        count: subsQuery.data?.totalElements ?? subs.length,
                    })}
                </h3>

                {subsQuery.isLoading ? (
                    <MarketplaceCardListSkeleton rows={2}/>
                ) : subsQuery.isError ? (
                    <MarketplaceErrorPanel
                        message={t('adminCommerce.marketplace.projects.subsLoadError')}
                        error={subsQuery.error}
                        onRetry={() => void subsQuery.refetch()}
                    />
                ) : subs.length === 0 ? (
                    <div className="rounded-panel border border-dashed border-border p-5 text-center text-xs text-muted">
                        {t('adminCommerce.marketplace.projects.subsEmpty')}
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {subs.map(sub => {
                            const cancellable = canCancel && canAdminCancelSubscription(sub.status);
                            return (
                                <article
                                    key={sub.id}
                                    className="space-y-2.5 rounded-panel border border-border bg-card p-3.5"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-2.5">
                                        <div className="min-w-0 flex-1 space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <strong className="line-clamp-2 text-sm font-semibold text-on-surface">
                                                    {sanitizeMarketplaceText(sub.listingTitle) || `#${sub.listingId}`}
                                                </strong>
                                                <span
                                                    className={`rounded-badge px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${
                                                        sub.status === 'ACTIVE'
                                                            ? 'bg-slate-900 text-white'
                                                            : sub.status === 'PAUSED'
                                                              ? 'bg-amber-100 text-amber-800'
                                                              : 'bg-slate-100 text-muted'
                                                    }`}
                                                >
                                                    {t(`adminCommerce.marketplace.projects.subStatus.${sub.status}`)}
                                                </span>
                                                <span className="rounded-badge border border-slate-200 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-on-surface">
                                                    {t(`adminCommerce.marketplace.projects.schedule.${sub.scheduleType}`)}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted tabular-nums">
                                                {sub.startDate && (
                                                    <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                                        <Calendar size={12} aria-hidden="true"/>
                                                        {t('adminCommerce.marketplace.projects.startDateLabel')}: {formatDate(sub.startDate)}
                                                    </span>
                                                )}
                                                {sub.nextRunDate && (
                                                    <span className="whitespace-nowrap">
                                                        {t('adminCommerce.marketplace.projects.nextRunLabel')}: {formatDate(sub.nextRunDate)}
                                                    </span>
                                                )}
                                                <span className="whitespace-nowrap">
                                                    {t('adminCommerce.marketplace.projects.unitsLabel')}: {Number(sub.units ?? 1)} ·{' '}
                                                    {t(`adminCommerce.marketplace.pricingModel.${sub.pricingModel}`)}
                                                </span>
                                                {sub.firstMissionCode && (
                                                    <span className="font-mono whitespace-nowrap">
                                                        {t('adminCommerce.marketplace.projects.firstOrderLabel')}: {sub.firstMissionCode}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 tabular-nums">
                                            <div className="flex items-center gap-1.5">
                                                <strong className="text-sm font-bold text-primary whitespace-nowrap">
                                                    {formatMarketplaceVnd(Number(sub.estimatedTotalVnd ?? 0))}
                                                </strong>
                                                <IllustrativeTag/>
                                            </div>
                                            {cancellable && (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="danger"
                                                    disabled={cancelMutation.isPending}
                                                    leftIcon={<XCircle size={13} aria-hidden="true"/>}
                                                    onClick={() => void handleCancelSub(sub)}
                                                    className="whitespace-nowrap"
                                                >
                                                    {t('adminCommerce.marketplace.projects.cancelSubBtn')}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>
        </Drawer>
    );
}
