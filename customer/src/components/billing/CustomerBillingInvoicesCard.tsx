'use client';

import {Download, FileText, Mail, MessageCircleMore} from 'lucide-react';
import {Badge, Button, Card, CardContent, CardHeader, CardTitle, StatusBadge} from '@/components/ui';
import {openPublicSupportWidget} from '@/hooks/support/usePublicSupport';
import {planName} from '@/lib/presentation';
import {useI18n} from '@/providers/I18nContext';
import type {Invoice} from '@/types/customer';
import {buildInvoiceSupportPrompt} from '@/utils/billing/invoice-print';

export interface CustomerBillingInvoicesCardProps {
    testId: string;
    invoices: Invoice[];
    isLoading: boolean;
    hasError: boolean;
    transferEnabled: boolean;
    wsConnected?: boolean;
    awaitingTransferHint: string;
    downloadingInvoiceId: number | null;
    sendingEmailInvoiceId?: number | null;
    onPay: (invoice: Invoice) => void;
    onDownloadReceipt: (id: number, code: string) => void;
    onSendEmail?: (id: number) => void;
}

export function CustomerBillingInvoicesCard({
    testId,
    invoices,
    isLoading,
    hasError,
    transferEnabled,
    wsConnected = false,
    awaitingTransferHint,
    downloadingInvoiceId,
    sendingEmailInvoiceId = null,
    onPay,
    onDownloadReceipt,
    onSendEmail,
}: CustomerBillingInvoicesCardProps) {
    const {t, formatDate: formatLocalDate, formatCurrency} = useI18n();
    const formatDate = (value?: string) => (value ? formatLocalDate(value, {dateStyle: 'short'}) : '—');

    const handleContactAdmin = (inv: Invoice) => {
        openPublicSupportWidget({
            topic: 'PRICING_PLAN',
            prompt: buildInvoiceSupportPrompt(inv.code, formatCurrency(inv.amount), transferEnabled),
        });
    };

    return (
        <Card data-testid={testId} className="flex-1 rounded-none border-0 bg-white">
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0 border-b border-slate-200 bg-slate-50/70 px-5 py-3.5">
                <CardTitle className="m-0 flex items-center gap-2 text-sm font-bold text-slate-800">
                    <FileText size={17} className="text-slate-500" aria-hidden="true" />
                    {t('billingPage.invoiceHistory')}
                </CardTitle>
                <div className="flex items-center gap-2">
                    {wsConnected && (
                        <span className="inline-flex items-center gap-1.5 rounded-badge border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                            <span className="h-2 w-2 rounded-full bg-uav-blue" aria-hidden="true" />
                            <span>{t('payment.realtimeBadge')}</span>
                        </span>
                    )}
                    <Badge variant="outline" className="shrink-0 whitespace-nowrap font-semibold normal-case tracking-normal text-slate-500">
                        {t('billingPage.recordCount', {count: invoices.length})}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[860px] border-collapse text-left text-[13px]">
                        <thead>
                        <tr className="border-b border-border bg-slate-50 text-[11px] text-slate-500">
                            <th className="whitespace-nowrap px-4 py-3 font-bold sm:px-5">{t('billingPage.invoiceNo')}</th>
                            <th className="whitespace-nowrap px-4 py-3 font-bold sm:px-5">{t('billingPage.description')}</th>
                            <th className="whitespace-nowrap px-4 py-3 font-bold sm:px-5">{t('billingPage.issuedOn')}</th>
                            <th className="whitespace-nowrap px-4 py-3 font-bold sm:px-5">{t('billingPage.dueDate')}</th>
                            <th className="whitespace-nowrap px-4 py-3 font-bold sm:px-5">{t('billingPage.amount')}</th>
                            <th className="whitespace-nowrap px-4 py-3 font-bold sm:px-5">{t('common.status')}</th>
                            <th className="whitespace-nowrap px-4 py-3 text-right font-bold sm:px-5">{t('billingPage.actions')}</th>
                        </tr>
                        </thead>
                        <tbody>
                        {invoices.map((inv) => (
                            <tr key={inv.id} className="border-b border-slate-100 transition-colors hover:bg-slate-50">
                                <td className="whitespace-nowrap px-4 py-4 align-middle font-extrabold tabular-nums text-slate-900 sm:px-5">{inv.code}</td>
                                <td className="min-w-[180px] max-w-[280px] px-4 py-4 align-middle text-xs leading-relaxed text-slate-700 sm:px-5">
                                    {inv.missionTitle ?? (inv.planName ? planName(inv.planName) : inv.notes ?? '—')}
                                </td>
                                <td className="whitespace-nowrap px-4 py-4 align-middle text-xs tabular-nums text-slate-500 sm:px-5">{formatDate(inv.createdAt)}</td>
                                <td className="whitespace-nowrap px-4 py-4 align-middle text-xs tabular-nums text-slate-500 sm:px-5">{formatDate(inv.dueDate)}</td>
                                <td className="whitespace-nowrap px-4 py-4 align-middle font-extrabold tabular-nums text-slate-900 sm:px-5">
                                    {formatCurrency(inv.amount)}
                                </td>
                                <td className="whitespace-nowrap px-4 py-4 align-middle text-xs text-slate-700 sm:px-5">
                                    <StatusBadge
                                        status={inv.status === 'PAID' ? 'COMPLETED' : inv.status}
                                        label={t(`billingPage.status.${inv.status}`)}
                                        className={inv.status === 'PAID' ? 'border-slate-900 bg-slate-900 text-white [&>span]:bg-white' : undefined}
                                    />
                                    {inv.lastEmailedTo && (
                                        <span className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                                            <Mail size={11} className="shrink-0 text-uav-blue" aria-hidden="true" />
                                            <span>{t('billingPage.emailedTo', {email: inv.lastEmailedTo})}</span>
                                        </span>
                                    )}
                                </td>
                                <td className="min-w-[240px] px-4 py-4 text-right align-middle sm:px-5">
                                    <div className="flex flex-wrap items-center justify-end gap-2">
                                        {inv.status === 'PENDING' && transferEnabled ? (
                                            <>
                                                <Button
                                                    type="button"
                                                    variant="primary"
                                                    size="sm"
                                                    onClick={() => onPay(inv)}
                                                    className="min-h-8 px-3.5 py-1.5 text-xs"
                                                >
                                                    {t('billingPage.viewPayment')}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    leftIcon={<MessageCircleMore size={13} aria-hidden="true" />}
                                                    onClick={() => handleContactAdmin(inv)}
                                                    className="min-h-8 px-2.5 py-1.5 text-xs"
                                                >
                                                    {t('payment.contactAdminReconcile')}
                                                </Button>
                                            </>
                                        ) : inv.status === 'PENDING' ? (
                                            <>
                                                <Button
                                                    type="button"
                                                    variant="primary"
                                                    size="sm"
                                                    leftIcon={<MessageCircleMore size={13} aria-hidden="true" />}
                                                    onClick={() => handleContactAdmin(inv)}
                                                    title={awaitingTransferHint}
                                                    className="min-h-8 px-3 py-1.5 text-xs"
                                                >
                                                    {t('payment.contactAdminReconcile')}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => onPay(inv)}
                                                    className="min-h-8 px-2.5 py-1.5 text-xs"
                                                >
                                                    {t('billingPage.viewPayment')}
                                                </Button>
                                            </>
                                        ) : (
                                            <span className="whitespace-nowrap text-xs tabular-nums text-slate-400">{formatDate(inv.paidAt)}</span>
                                        )}
                                        {onSendEmail && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                isLoading={sendingEmailInvoiceId === inv.id}
                                                leftIcon={<Mail size={13} aria-hidden="true" />}
                                                onClick={() => onSendEmail(inv.id)}
                                                aria-label={t('billingPage.sendEmailAria', {code: inv.code})}
                                                title={t('billingPage.sendEmailAria', {code: inv.code})}
                                                className="min-h-8 px-2.5 py-1.5 text-xs"
                                            >
                                                {t('billingPage.sendEmail')}
                                            </Button>
                                        )}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            isLoading={downloadingInvoiceId === inv.id}
                                            leftIcon={<Download size={13} aria-hidden="true" />}
                                            onClick={() => onDownloadReceipt(inv.id, inv.code)}
                                            aria-label={t('billingPage.downloadPdfAria', {code: inv.code})}
                                            title={t('billingPage.downloadPdfAria', {code: inv.code})}
                                            className="min-h-8 px-2.5 py-1.5 text-xs"
                                        >
                                            {t('billingPage.downloadPdf')}
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
                {invoices.length === 0 && !isLoading && !hasError && (
                    <p role="status" className="m-0 px-5 py-8 text-center text-slate-500">
                        {t('billingPage.noInvoices')}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
