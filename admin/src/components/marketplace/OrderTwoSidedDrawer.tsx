'use client';

import {useState} from 'react';
import {Calendar, MapPin, Plane, Store, User, XCircle} from 'lucide-react';
import {Drawer, Metadata} from '@/components/data/Drawer';
import {Alert, Button, RequiredMark, StatusBadge} from '@/components/ui';
import {IllustrativeTag} from '@/components/marketplace/MarketplaceShared';
import {
    canAdminCancelMarketplaceOrder,
    formatMarketplaceVnd,
    sanitizeMarketplaceText,
    validateAdminOrderCancelReason,
} from '@/forms/admin-marketplace-form';
import {useAdminMarketplaceOrderDetail, useCancelMarketplaceOrder} from '@/hooks/useAdminMarketplace';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {toast} from '@/providers/ToastContext';
import type {AdminMarketplaceOrder} from '@/types/marketplace.types';

export function OrderTwoSidedDrawer({
    initialOrder,
    onClose,
}: {
    initialOrder: AdminMarketplaceOrder;
    onClose: () => void;
}) {
    const {t, formatDate} = useI18n();
    const {can} = useAuth();
    const detailQuery = useAdminMarketplaceOrderDetail(initialOrder.id);
    const cancelMutation = useCancelMarketplaceOrder();
    const order = detailQuery.data ?? initialOrder;

    const [cancelReason, setCancelReason] = useState('');
    const [localError, setLocalError] = useState<string | null>(null);

    const canCancel =
        can('MISSION_CANCEL') && canAdminCancelMarketplaceOrder(order.status, order.statusGroup);

    const handleCancel = () => {
        setLocalError(null);
        const checked = validateAdminOrderCancelReason(cancelReason);
        if (!checked.ok) {
            setLocalError(t('adminCommerce.marketplace.orders.cancelReasonRequired'));
            return;
        }
        cancelMutation.mutate(
            {id: order.id, reason: checked.reason},
            {
                onSuccess: () => {
                    toast.success(t('adminCommerce.marketplace.orders.cancelledToast', {code: order.code}));
                    setCancelReason('');
                },
            },
        );
    };

    return (
        <Drawer
            wide
            title={t('adminCommerce.marketplace.orders.drawerTitle', {code: order.code})}
            onClose={onClose}
        >
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0 space-y-1">
                    <h3 className="m-0 line-clamp-2 text-base font-semibold text-on-surface">{sanitizeMarketplaceText(order.title)}</h3>
                    {order.listingTitle && (
                        <p className="m-0 text-xs text-muted">{sanitizeMarketplaceText(order.listingTitle)}</p>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={order.status}/>
                    {order.providerResponseStatus && order.providerResponseStatus !== 'NOT_APPLICABLE' && (
                        <StatusBadge status={order.providerResponseStatus}/>
                    )}
                </div>
            </div>

            <section className="space-y-3">
                <h4 className="m-0 flex items-center gap-2 text-sm font-semibold text-on-surface">
                    <User size={15} className="text-primary" aria-hidden="true"/>
                    {t('adminCommerce.marketplace.orders.customerSide')}
                </h4>
                <Metadata
                    items={[
                        [
                            t('adminCommerce.marketplace.orders.customerName'),
                            sanitizeMarketplaceText(order.customerName) || (order.customerId ? `#${order.customerId}` : '—'),
                        ],
                        [
                            t('adminCommerce.marketplace.orders.projectName'),
                            sanitizeMarketplaceText(order.projectName) || (order.projectId ? `#${order.projectId}` : '—'),
                        ],
                        [
                            t('adminCommerce.marketplace.orders.location'),
                            order.locationName ? (
                                <span key="loc" className="inline-flex items-center gap-1">
                                    <MapPin size={13} className="shrink-0 text-muted" aria-hidden="true"/>
                                    <span>{sanitizeMarketplaceText(order.locationName)}</span>
                                </span>
                            ) : (
                                '—'
                            ),
                        ],
                        [
                            t('adminCommerce.marketplace.orders.schedule'),
                            order.requestedDate ? (
                                <span key="sched" className="inline-flex items-center gap-1 tabular-nums">
                                    <Calendar size={13} className="shrink-0 text-muted" aria-hidden="true"/>
                                    <span>{formatDate(order.requestedDate)}</span>
                                </span>
                            ) : (
                                '—'
                            ),
                        ],
                        [
                            t('adminCommerce.marketplace.orders.quotedPrice'),
                            order.quotedSubtotalVnd != null ? (
                                <span key="price" className="inline-flex items-center gap-1.5 tabular-nums">
                                    <strong className="text-primary">
                                        {formatMarketplaceVnd(Number(order.quotedSubtotalVnd))}
                                    </strong>
                                    <IllustrativeTag/>
                                </span>
                            ) : (
                                '—'
                            ),
                        ],
                    ]}
                />
                {order.notes && (
                    <p className="m-0 rounded-panel border border-border bg-slate-50/70 p-3 text-xs text-muted">
                        {order.notes}
                    </p>
                )}
            </section>

            <section className="space-y-3">
                <h4 className="m-0 flex items-center gap-2 text-sm font-semibold text-on-surface">
                    <Store size={15} className="text-primary" aria-hidden="true"/>
                    {t('adminCommerce.marketplace.orders.providerSide')}
                </h4>
                <Metadata
                    items={[
                        [
                            t('adminCommerce.marketplace.orders.providerName'),
                            sanitizeMarketplaceText(order.providerDisplayName) || t('adminCommerce.marketplace.orders.unassignedProvider'),
                        ],
                        [
                            t('adminCommerce.marketplace.orders.providerStatus'),
                            order.providerResponseStatus && order.providerResponseStatus !== 'NOT_APPLICABLE' ? (
                                <StatusBadge key="pstatus" status={order.providerResponseStatus}/>
                            ) : (
                                '—'
                            ),
                        ],
                        [
                            t('adminCommerce.marketplace.orders.assignedUav'),
                            order.uavId ? (
                                <span key="uav" className="inline-flex items-center gap-1 font-mono tabular-nums">
                                    <Plane size={13} className="text-muted" aria-hidden="true"/>
                                    UAV #{order.uavId}
                                </span>
                            ) : (
                                '—'
                            ),
                        ],
                        [
                            t('adminCommerce.marketplace.orders.assignedPilot'),
                            order.operatorId ? `#${order.operatorId}` : '—',
                        ],
                    ]}
                />
                {(order.providerResponseNote || order.completionNote || order.failureNotes) && (
                    <div className="space-y-1.5 rounded-panel border border-border bg-slate-50/70 p-3 text-xs text-muted">
                        {order.providerResponseNote && <p className="m-0">{order.providerResponseNote}</p>}
                        {order.completionNote && <p className="m-0">{order.completionNote}</p>}
                        {order.failureNotes && <p className="m-0 text-danger">{order.failureNotes}</p>}
                    </div>
                )}
            </section>

            {canCancel && (
                <section className="uav-bezel">
                    <div className="uav-bezel-core space-y-3 p-4">
                        <h4 className="m-0 text-sm font-semibold text-on-surface">
                            {t('adminCommerce.marketplace.orders.cancelTitle', {code: order.code})}
                        </h4>
                        {(localError || cancelMutation.isError) && (
                            <Alert variant="error" role="alert" className="text-xs">
                                {localError ??
                                    (cancelMutation.error instanceof Error
                                        ? cancelMutation.error.message
                                        : t('adminCommerce.marketplace.orders.cancelError'))}
                            </Alert>
                        )}
                        <label className="block space-y-1 text-xs font-semibold text-on-surface">
                            <span className="block">
                                {t('adminCommerce.marketplace.orders.cancelReasonLabel')}
                                <RequiredMark/>
                            </span>
                            <input
                                type="text"
                                value={cancelReason}
                                onChange={e => setCancelReason(e.target.value)}
                                placeholder={t('adminCommerce.marketplace.orders.cancelReasonPlaceholder')}
                                className="h-9 w-full rounded-control border border-border-input bg-card px-3 text-xs font-normal"
                            />
                        </label>
                        <div className="flex justify-end">
                            <Button
                                type="button"
                                size="sm"
                                variant="danger"
                                disabled={cancelMutation.isPending}
                                leftIcon={<XCircle size={14} aria-hidden="true"/>}
                                onClick={handleCancel}
                                className="whitespace-nowrap"
                            >
                                {t('adminCommerce.marketplace.orders.confirmCancelBtn')}
                            </Button>
                        </div>
                    </div>
                </section>
            )}
        </Drawer>
    );
}
