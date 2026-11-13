'use client';

import {useState} from 'react';
import {AlertTriangle, CheckCircle2, Download, FilePlus2, Landmark, Radio, Settings2} from 'lucide-react';
import {
    ConfirmBankTransferDialog,
    CreateInvoiceDialog,
    PaymentGatewayModal,
} from '@/components/billing/AdminInvoiceDialogs';
import {Pagination} from '@/components/data/Pagination';
import {QueryState} from '@/components/data/WorkspaceState';
import {FilterSelect} from '@/components/shared/FilterSelect';
import {Alert, Badge, Button, Card, CardContent, StatusBadge} from '@/components/ui';
import {
    useAdminBillingRealtime,
    useAdminInvoices,
    useDownloadAdminInvoiceReceipt,
    usePaymentGatewayConfig,
} from '@/hooks/billing/useBillingAdmin';
import {formatShortDate} from '@/lib/format';
import {planName} from '@/lib/presentation';
import {cn} from '@/lib/utils';
import {useI18n} from '@/providers/I18nContext';
import {toast} from '@/providers/ToastContext';
import type {Invoice} from '@/types';
import type {InvoiceFilterKey, InvoiceFilters} from '@/types/billing/billing.types';

const filters: InvoiceFilterKey[] = ['ALL', 'PENDING', 'OVERDUE', 'PAID', 'FAILED', 'CANCELLED'];

const toFilters = (key: InvoiceFilterKey): InvoiceFilters =>
    key === 'ALL' ? {} : key === 'OVERDUE' ? {overdue: true} : {status: key};

export function AdminInvoicesPanel() {
    const {t, formatDate, formatCurrency} = useI18n();
    const [filter, setFilter] = useState<InvoiceFilterKey>('ALL');
    const [page, setPage] = useState(0);
    const [creating, setCreating] = useState(false);
    const [configuringGateway, setConfiguringGateway] = useState(false);
    const [confirmingInvoice, setConfirmingInvoice] = useState<Invoice | null>(null);
    const [notice, setNotice] = useState('');

    const {wsConnected} = useAdminBillingRealtime(true);
    const gatewayQuery = usePaymentGatewayConfig();
    const gateway = gatewayQuery.data;

    const downloadReceipt = useDownloadAdminInvoiceReceipt({
        onError: error => toast.error(error instanceof Error ? error.message : t('admin.invoices.downloadPdfFailed')),
    });

    const query = useAdminInvoices(page, toFilters(filter));
    const [now] = useState(() => Date.now());
    const isOverdue = (inv: Invoice) => inv.status === 'PENDING' && !!inv.dueDate && new Date(inv.dueDate).getTime() < now;
    const date = (value?: string) => formatShortDate(value, formatDate);

    return (
        <div className="space-y-4">
            {gateway && !gateway.bankTransferConfigured && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-amber-300 bg-amber-50/75 px-4 py-3 text-xs text-amber-900">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <AlertTriangle size={17} className="shrink-0 text-amber-600"/>
                        <div>
                            <strong className="font-bold">Tài khoản nhận chuyển khoản VietQR chưa được thiết lập</strong>
                            <p className="m-0 mt-0.5 text-amber-800">
                                Thiết lập mã BIN ngân hàng, số tài khoản và chủ tài khoản để khách hàng quét mã VietQR trực tiếp trên hóa đơn.
                            </p>
                        </div>
                    </div>
                    <Button type="button" variant="primary" size="sm" leftIcon={<Landmark size={14}/>}
                            onClick={() => setConfiguringGateway(true)}>
                        Thiết lập VietQR ngay
                    </Button>
                </div>
            )}

            {gateway && gateway.bankTransferConfigured && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-border bg-card px-4 py-2.5 text-xs">
                    <div className="flex flex-wrap items-center gap-2 text-slate-700">
                        <span className="inline-flex items-center gap-1.5 font-bold text-slate-900">
                            <CheckCircle2 size={15} className="text-uav-blue"/>
                            VietQR / NAPAS 247:
                        </span>
                        <span className="font-semibold">{gateway.bankName || gateway.bankBin}</span>
                        <span className="text-slate-300">·</span>
                        <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono font-bold text-slate-900">{gateway.accountNumber}</code>
                        <span className="text-slate-300">·</span>
                        <span className="font-medium text-slate-600">{gateway.accountName}</span>
                        <Badge variant="outline" size="sm">GTGT {Math.round(gateway.vatRate * 1000) / 10}%</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                            <Radio size={12} className={cn(wsConnected ? 'text-primary' : 'text-slate-400')}/>
                            {wsConnected ? 'Đồng bộ thời gian thực' : 'Đang kết nối lại'}
                        </span>
                        <Button type="button" variant="outline" size="sm" leftIcon={<Settings2 size={13}/>}
                                onClick={() => setConfiguringGateway(true)} className="h-7 px-2.5 text-xs">
                            Cấu hình thanh toán
                        </Button>
                    </div>
                </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
                <FilterSelect
                    label={t('admin.invoices.col.status')}
                    value={filter}
                    onChange={key => {
                        setFilter(key);
                        setPage(0);
                    }}
                    options={filters.map(key => ({value: key, label: t(`admin.invoices.filter.${key}`)}))}
                />
                <div className="ml-auto flex flex-wrap items-center gap-2">
                    {!gateway && (
                        <Button type="button" variant="outline" size="sm" leftIcon={<Landmark size={14}/>}
                                onClick={() => setConfiguringGateway(true)}>
                            Cổng thanh toán VietQR
                        </Button>
                    )}
                    <Button type="button" variant="primary" size="sm" leftIcon={<FilePlus2 size={15} aria-hidden="true"/>}
                            onClick={() => setCreating(true)}>
                        {t('admin.invoices.create')}
                    </Button>
                </div>
            </div>

            {notice && <Alert variant="info" role="status">{notice}</Alert>}

            <Card>
                <CardContent className="p-0">
                    <QueryState query={query}>{query.data && <>
                        {query.data.content.length ? (
                            <div className="overflow-x-auto" tabIndex={0} aria-label={t('admin.invoices.table')}>
                                <table className="w-full min-w-[880px] border-collapse text-left text-[13px]">
                                    <thead className="bg-slate-50 text-[11.5px] font-semibold uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3">{t('admin.invoices.col.code')}</th>
                                        <th className="px-4 py-3">{t('admin.invoices.col.customer')}</th>
                                        <th className="px-4 py-3">{t('admin.invoices.col.item')}</th>
                                        <th className="px-4 py-3 text-right">{t('admin.invoices.col.amount')}</th>
                                        <th className="px-4 py-3">{t('admin.invoices.col.status')}</th>
                                        <th className="px-4 py-3">{t('admin.invoices.col.due')}</th>
                                        <th className="px-4 py-3">{t('admin.invoices.col.paid')}</th>
                                        <th className="sticky right-0 bg-slate-50 px-4 py-3 text-right">{t('admin.invoices.col.actions')}</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {query.data.content.map(inv => (
                                        <tr key={inv.id} className="group border-t border-slate-100 align-top hover:bg-slate-50/70">
                                            <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-900">
                                                {inv.code}
                                                {inv.notes && <span className="mt-0.5 block font-sans text-[11.5px] font-normal text-slate-500">{inv.notes}</span>}
                                            </td>
                                            <td className="px-4 py-3 text-slate-800">@{inv.username}</td>
                                            <td className="px-4 py-3 text-slate-600">{inv.missionTitle || (inv.planName ? planName(inv.planName) : '—')}</td>
                                            <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">{formatCurrency(inv.amount)}</td>
                                            <td className="px-4 py-3">
                                                <StatusBadge
                                                    status={inv.status === 'PAID' ? 'COMPLETED' : inv.status}
                                                    label={t(`admin.invoices.status.${inv.status}`)}
                                                    className={inv.status === 'PAID' ? 'border-slate-900 bg-slate-900 text-white [&>span]:bg-white' : undefined}
                                                />
                                                {isOverdue(inv) && (
                                                    <Badge variant="error" size="sm" icon={<AlertTriangle size={12} aria-hidden="true"/>} className="ml-1.5">
                                                        {t('admin.invoices.overdue')}
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className={cn('whitespace-nowrap px-4 py-3', isOverdue(inv) ? 'font-semibold text-red-700' : 'text-slate-500')}>{date(inv.dueDate)}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-slate-500">{date(inv.paidAt)}</td>
                                            <td className="sticky right-0 bg-white px-4 py-3 text-right group-hover:bg-slate-50">
                                                <div className="inline-flex items-center justify-end gap-1.5">
                                                    {inv.status === 'PENDING' && (
                                                        <Button type="button" variant="primary" size="sm"
                                                                onClick={() => setConfirmingInvoice(inv)} className="h-7 whitespace-nowrap px-2.5 text-xs">
                                                            {t('admin.invoices.confirm')}
                                                        </Button>
                                                    )}
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        isLoading={downloadReceipt.isPending && downloadReceipt.variables?.id === inv.id}
                                                        leftIcon={<Download size={13} aria-hidden="true"/>}
                                                        onClick={() => downloadReceipt.mutate({id: inv.id, code: inv.code})}
                                                        aria-label={t('admin.invoices.downloadPdfAria', {code: inv.code})}
                                                        title={t('admin.invoices.downloadPdfAria', {code: inv.code})}
                                                        className="h-7 whitespace-nowrap px-2 text-xs"
                                                    >
                                                        {t('admin.invoices.downloadPdf')}
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="px-6 py-12 text-center text-[13px] text-slate-500">
                                {t(filter === 'ALL' ? 'admin.invoices.empty' : 'admin.invoices.emptyFilter')}
                            </p>
                        )}
                        {query.data.totalPages > 1 && (
                            <div className="border-t border-slate-100 px-4 py-2">
                                <Pagination page={page} totalPages={query.data.totalPages} total={query.data.totalElements} onChange={setPage}/>
                            </div>
                        )}
                    </>}</QueryState>
                </CardContent>
            </Card>

            {creating && (
                <CreateInvoiceDialog
                    onClose={() => setCreating(false)}
                    onCreated={code => {
                        setCreating(false);
                        setNotice(t('admin.invoices.created', {code}));
                    }}
                />
            )}

            {confirmingInvoice && (
                <ConfirmBankTransferDialog
                    invoice={confirmingInvoice}
                    onClose={() => setConfirmingInvoice(null)}
                />
            )}

            {configuringGateway && (
                <PaymentGatewayModal onClose={() => setConfiguringGateway(false)}/>
            )}
        </div>
    );
}
