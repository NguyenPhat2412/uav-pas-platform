'use client';

import {useState} from 'react';
import Link from 'next/link';
import {AlertTriangle, Download, Lock, QrCode, RefreshCcw, ShieldCheck} from 'lucide-react';
import {BankTransferDialog} from '@/components/billing/BankTransferDialog';
import {Button} from '@/components/customer/CustomerUi';
import {CustomerMissionRfqBids} from '@/components/marketplace/escrow/CustomerMissionRfqBids';
import {useBankTransferStatus, useBilling, useDownloadInvoiceReceipt} from '@/hooks/billing/useCustomerBilling';
import {useAcceptMissionBid, useMissionBids} from '@/hooks/marketplace/useMarketplace';
import {useSiteInfo} from '@/hooks/settings/useSiteInfo';
import {escrowStatusLabel, formatVndCompact, pricingUnitLabel, providerOrderStatusLabel} from '@/forms/marketplace/marketplace-forms';
import type {Mission} from '@/types/mission/mission.types';

const ESCROW_STEPS = [
    {step: 1, title: 'Chốt đơn & Hóa đơn'},
    {step: 2, title: 'Nạp Ký quỹ VietQR'},
    {step: 3, title: 'Thực hiện & Bàn giao'},
    {step: 4, title: 'Nghiệm thu & Giải ngân'},
] as const;

export function CustomerMissionMarketplaceCard({mission, isOwner}: { mission: Mission; isOwner: boolean }) {
    const isRfq = mission.providerResponseStatus === 'OPEN_RFQ';
    const hasMarketplaceContext = Boolean(mission.listingId || mission.providerId || isRfq || mission.quotedSubtotalVnd != null);

    const siteInfo = useSiteInfo();
    const {invoices} = useBilling();
    const transferStatus = useBankTransferStatus();
    const downloadReceipt = useDownloadInvoiceReceipt();
    const bidsQuery = useMissionBids(mission.id, hasMarketplaceContext);
    const acceptBid = useAcceptMissionBid(mission.id);
    const bids = bidsQuery.data ?? [];
    const [payDialogOpen, setPayDialogOpen] = useState(false);

    if (!hasMarketplaceContext && bids.length === 0) return null;

    const missionInvoice = isOwner ? (invoices.data?.content ?? []).find(inv => inv.missionId === mission.id) : undefined;
    const escrowStatus = missionInvoice?.escrowStatus;
    const canPayNow = missionInvoice?.status === 'PENDING';

    const activeStep = (() => {
        if (escrowStatus === 'RELEASED') return 4;
        if (mission.status === 'COMPLETED' || escrowStatus === 'DISPUTED') return 3;
        if (escrowStatus === 'HELD' || missionInvoice?.status === 'PAID') return mission.status === 'IN_PROGRESS' ? 3 : 2;
        if (missionInvoice) return 1;
        return 0;
    })();

    const badgeTone =
        escrowStatus === 'RELEASED' ? 'bg-slate-900 text-white'
        : escrowStatus === 'HELD' ? 'bg-sky-100 text-sky-800'
        : escrowStatus === 'DISPUTED' ? 'bg-amber-100 text-amber-900'
        : escrowStatus === 'REFUNDED' ? 'bg-rose-100 text-danger'
        : 'bg-amber-50 text-amber-800 ring-1 ring-amber-200';

    return (
        <section className="border-b border-border bg-slate-50/70 px-4 py-4 md:px-5" aria-label="Thông tin giao dịch Sàn UAV">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-extrabold text-slate-800">
                            <ShieldCheck size={13} aria-hidden="true"/> Giao dịch Sàn UAV & Ký quỹ Escrow
                        </span>
                        <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                            {providerOrderStatusLabel(mission.providerResponseStatus)}
                        </span>
                        {missionInvoice && (
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${badgeTone}`}>
                                <Lock size={11} aria-hidden="true"/> {escrowStatusLabel(escrowStatus)}
                            </span>
                        )}
                    </div>
                    {mission.listingTitle && <p className="m-0 text-sm font-extrabold text-slate-900">Gói dịch vụ: {mission.listingTitle}</p>}
                    <p className="m-0 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                        <ShieldCheck size={13} className="text-primary" aria-hidden="true"/>
                        Đối tác đã xác minh · Điều phối bởi nền tảng UAV PAS
                    </p>
                    {mission.providerResponseNote && (
                        <p className="m-0 text-xs text-slate-600">Ghi chú điều phối: <em>{mission.providerResponseNote}</em></p>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {(missionInvoice || mission.quotedSubtotalVnd != null) && (
                        <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-right">
                            <span className="block text-xs font-bold uppercase text-slate-400">
                                {missionInvoice ? `Hóa đơn ${missionInvoice.code} · minh hoạ` : 'Tạm tính · minh hoạ'}
                            </span>
                            <strong className="text-sm font-black text-primary">
                                {formatVndCompact(missionInvoice ? missionInvoice.amount : mission.quotedSubtotalVnd)}
                            </strong>
                            {mission.bookingUnits != null && mission.unitPriceSnapshotVnd != null && (
                                <span className="block text-xs text-slate-500">
                                    {mission.bookingUnits} {pricingUnitLabel(mission.pricingModelSnapshot)} × {formatVndCompact(mission.unitPriceSnapshotVnd)}
                                </span>
                            )}
                        </div>
                    )}

                    {isOwner && canPayNow && missionInvoice && (
                        <Button onClick={() => setPayDialogOpen(true)}>
                            <QrCode size={14} className="mr-1.5 inline" aria-hidden="true"/> Quét VietQR Nạp Ký quỹ
                        </Button>
                    )}

                    {isOwner && missionInvoice?.status === 'PAID' && (
                        <Button variant="secondary" disabled={downloadReceipt.isPending} onClick={() => downloadReceipt.mutate({id: missionInvoice.id, code: missionInvoice.code})}>
                            <Download size={14} className="mr-1.5 inline" aria-hidden="true"/> Biên lai PDF
                        </Button>
                    )}

                    <Link href="/customer/billing" className="inline-flex min-h-9 items-center gap-1.5 rounded-control border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition-colors hover:border-primary hover:text-primary">
                        Sổ hóa đơn
                    </Link>
                </div>
            </div>

            {!isRfq && (
                <ol className="m-0 mt-3.5 grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-4" aria-label="Tiến trình bảo vệ Ký quỹ Escrow">
                    {ESCROW_STEPS.map(item => {
                        const done = activeStep >= item.step && escrowStatus !== 'REFUNDED';
                        return (
                            <li key={item.step} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${done ? 'border-slate-800 bg-white text-slate-900' : 'border-slate-200/80 bg-white/70 text-slate-500'}`}>
                                <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-black tabular-nums ${done ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                    {done ? '✓' : item.step}
                                </span>
                                <span className="truncate">{item.title}</span>
                            </li>
                        );
                    })}
                </ol>
            )}

            {mission.status === 'DRAFT' && !missionInvoice && (
                <p className="m-0 mt-3 rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 py-2 text-xs text-amber-900">
                    Nhấn <strong>Gửi xác nhận</strong> nhiệm vụ để hệ thống phát hành hóa đơn Ký quỹ VietQR tự động (hạn thanh toán {siteInfo.invoiceDueDays} ngày).
                </p>
            )}

            {siteInfo.requireEscrowBeforeStart && canPayNow && (
                <p className="m-0 mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2 text-xs font-semibold text-sky-900">
                    Cấu hình an toàn giao dịch đang bật: Vui lòng nạp Ký quỹ VietQR để đối tác được phép xuất phát bay tại hiện trường.
                </p>
            )}

            {escrowStatus === 'DISPUTED' && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-950" role="status">
                    <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true"/>
                    <span><strong>Đang khóa Ký quỹ bảo vệ khách hàng:</strong> Khoản tiền {formatVndCompact(missionInvoice?.amount)} vẫn được giữ an toàn trên sàn do bạn chưa tích chọn chấp nhận kết quả bàn giao.</span>
                </div>
            )}

            {escrowStatus === 'REFUNDED' && (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-danger" role="status">
                    <RefreshCcw size={14} className="shrink-0" aria-hidden="true"/>
                    <span>Nhiệm vụ đã hủy hoặc từ chối — khoản Ký quỹ đã được ghi nhận hoàn trả vào sổ đối soát.</span>
                </div>
            )}

            {(isRfq || bids.length > 0) && (
                <CustomerMissionRfqBids
                    isRfq={isRfq}
                    isOwner={isOwner}
                    bids={bids}
                    isLoading={bidsQuery.isLoading}
                    acceptError={acceptBid.isError ? acceptBid.error : null}
                    isAccepting={acceptBid.isPending}
                    onAcceptBid={id => acceptBid.mutate(id)}
                />
            )}

            {payDialogOpen && missionInvoice && (
                <BankTransferDialog
                    invoiceId={missionInvoice.id}
                    invoice={missionInvoice}
                    transferConfigured={transferStatus.data?.enabled ?? true}
                    onClose={() => { setPayDialogOpen(false); void invoices.refetch(); }}
                />
            )}
        </section>
    );
}
