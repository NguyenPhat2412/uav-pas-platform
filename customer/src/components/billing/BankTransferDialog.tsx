'use client';

import {useEffect, useRef} from 'react';
import {Landmark, X} from 'lucide-react';
import {BankTransferBody} from '@/components/billing/BankTransferBody';
import {BankTransferUnconfiguredState} from '@/components/billing/BankTransferUnconfiguredState';
import {Alert, Button, Spinner} from '@/components/ui';
import {
    isBankTransferUnconfiguredError,
    useBankTransferInstructions,
} from '@/hooks/billing/useCustomerBilling';
import {useDialogFocusTrap} from '@/hooks/useDialogFocusTrap';
import {useI18n} from '@/providers/I18nContext';
import {toast} from '@/providers/ToastContext';
import type {Invoice} from '@/types/customer';

export interface BankTransferDialogProps {
    invoiceId: number;
    invoice?: Invoice | null;
    transferConfigured?: boolean;
    onClose: () => void;
}

/** VietQR / NAPAS 247 payment for one invoice with instant WebSocket confirmation and 1-click Admin support. */
export function BankTransferDialog({
    invoiceId,
    invoice,
    transferConfigured = true,
    onClose,
}: BankTransferDialogProps) {
    const {t} = useI18n();
    const dialogRef = useRef<HTMLElement>(null);
    useDialogFocusTrap(dialogRef, true, onClose);
    const query = useBankTransferInstructions(invoiceId, transferConfigured);
    const prevStatusRef = useRef<{invoiceId: number; status?: string}>({invoiceId});

    const settledNow =
        query.lastSettledInvoice?.invoiceId === invoiceId && query.lastSettledInvoice.status === 'PAID';
    const effectiveStatus = settledNow ? 'PAID' : query.data?.status;

    useEffect(() => {
        if (
            prevStatusRef.current.invoiceId === invoiceId &&
            prevStatusRef.current.status === 'PENDING' &&
            effectiveStatus === 'PAID'
        ) {
            toast.success(t('payment.paidSuccess'));
        }
        prevStatusRef.current = {invoiceId, status: effectiveStatus};
    }, [effectiveStatus, invoiceId, t]);

    const handleCheckNow = async () => {
        const result = await query.refetch();
        if (result.data?.status === 'PENDING' && !settledNow) {
            toast.info(t('payment.stillPending'));
        }
    };

    const unconfigured =
        !transferConfigured ||
        (query.isError && isBankTransferUnconfiguredError(query.error)) ||
        (Boolean(query.data) && !query.data?.accountNumber && !query.data?.qrPayload && effectiveStatus === 'PENDING');

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
            role="presentation"
            onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
            <section
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="bank-transfer-title"
                tabIndex={-1}
                className="flex max-h-[calc(100dvh-32px)] w-full max-w-3xl flex-col overflow-y-auto bg-card text-card-foreground shadow-2xl"
            >
                <header className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
                    <h2 id="bank-transfer-title" className="m-0 flex items-center gap-2 text-lg font-extrabold text-slate-900">
                        <Landmark size={20} className="text-primary" aria-hidden="true" />
                        {t('payment.title')}
                    </h2>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        aria-label={t('payment.close')}
                        data-autofocus="true"
                        className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700"
                    >
                        <X size={18} />
                    </Button>
                </header>

                {unconfigured ? (
                    <BankTransferUnconfiguredState invoiceId={invoiceId} invoice={invoice} onClose={onClose} />
                ) : query.isPending ? (
                    <div className="grid gap-0 md:grid-cols-[300px_minmax(0,1fr)]">
                        <Spinner size="sm" label={t('payment.loading')} className="sr-only" />
                        <div className="flex flex-col items-center gap-3 border-b border-border bg-slate-50 p-6 md:border-b-0 md:border-r">
                            <div className="h-60 w-60 animate-pulse bg-slate-200" />
                            <div className="h-3.5 w-44 animate-pulse rounded-control bg-slate-200" />
                            <div className="h-7 w-32 animate-pulse rounded-control bg-slate-200" />
                        </div>
                        <div className="space-y-4 p-6">
                            <div className="space-y-2">
                                {[0, 1, 2, 3, 4].map((i) => (
                                    <div key={i} className="h-9 animate-pulse rounded-control bg-slate-100" />
                                ))}
                            </div>
                            <div className="h-28 animate-pulse rounded-control bg-slate-100" />
                        </div>
                    </div>
                ) : query.isError ? (
                    <Alert variant="error" className="rounded-none border-0 border-l-4">
                        {query.error instanceof Error ? query.error.message : t('payment.loadError')}
                    </Alert>
                ) : (
                    <BankTransferBody
                        data={{...query.data, status: effectiveStatus ?? query.data.status}}
                        wsConnected={query.wsConnected}
                        isChecking={query.isFetching}
                        onCheckNow={handleCheckNow}
                        onClose={onClose}
                    />
                )}
            </section>
        </div>
    );
}
