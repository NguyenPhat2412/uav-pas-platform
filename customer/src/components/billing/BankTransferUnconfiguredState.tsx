'use client';

import {Landmark, MessageCircleMore} from 'lucide-react';
import {Badge, Button} from '@/components/ui';
import {openPublicSupportWidget} from '@/hooks/support/usePublicSupport';
import {useI18n} from '@/providers/I18nContext';
import type {Invoice} from '@/types/customer';
import {buildInvoiceSupportPrompt} from '@/utils/billing/invoice-print';

export interface BankTransferUnconfiguredStateProps {
    invoiceId: number;
    invoice?: Invoice | null;
    onClose: () => void;
}

export function BankTransferUnconfiguredState({
    invoiceId,
    invoice,
    onClose,
}: BankTransferUnconfiguredStateProps) {
    const {t, formatCurrency} = useI18n();
    const invoiceCode = invoice?.code ?? `#${invoiceId}`;
    const formattedAmount = invoice ? formatCurrency(invoice.amount) : 'theo hóa đơn';

    const handleContactAdmin = () => {
        const prompt = buildInvoiceSupportPrompt(invoiceCode, formattedAmount, false);
        onClose();
        openPublicSupportWidget({
            topic: 'PRICING_PLAN',
            prompt,
        });
    };

    return (
        <div className="flex flex-col items-start gap-4 p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                    <Landmark size={20} aria-hidden="true" />
                </span>
                <div>
                    <Badge variant="outline" className="border-amber-300 bg-amber-50 font-semibold text-amber-800 normal-case tracking-normal">
                        {invoiceCode}
                    </Badge>
                </div>
                {invoice && (
                    <strong className="text-base font-extrabold tabular-nums text-slate-900">
                        {formattedAmount}
                    </strong>
                )}
            </div>

            <div className="space-y-1.5">
                <h3 className="m-0 text-base font-bold text-slate-900">
                    {t('payment.notConfiguredTitle')}
                </h3>
                <p className="m-0 max-w-xl text-xs leading-relaxed text-slate-600">
                    {t('payment.notConfiguredDesc')}
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    leftIcon={<MessageCircleMore size={15} aria-hidden="true" />}
                    onClick={handleContactAdmin}
                >
                    {t('payment.contactAdminReconcile')}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={onClose}>
                    {t('payment.close')}
                </Button>
            </div>
        </div>
    );
}
