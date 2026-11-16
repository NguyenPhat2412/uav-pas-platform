'use client';

import {useState} from 'react';
import {CheckCircle2, Wallet, XCircle} from 'lucide-react';
import {Alert, Button, Card, CardContent, CardHeader, CardTitle, OptionalMark, RequiredMark, Spinner} from '@/components/ui';
import {useAdminPayouts, useProcessPayout} from '@/hooks/marketplace/useAdminMarketplace';
import {formatMarketplaceVnd, validatePayoutProcessInput} from '@/forms/marketplace/admin-marketplace-form';
import type {PayoutStatus} from '@/types/marketplace/marketplace.types';

export function AdminMarketplacePayouts() {
    const [status, setStatus] = useState<PayoutStatus | ''>('');
    const [refById, setRefById] = useState<Record<number, string>>({});
    const [noteById, setNoteById] = useState<Record<number, string>>({});
    const [localError, setLocalError] = useState<string | null>(null);

    const query = useAdminPayouts(status);
    const processPayout = useProcessPayout();
    const payouts = query.data?.content ?? [];

    const handleProcess = (id: number, approve: boolean) => {
        setLocalError(null);
        const checked = validatePayoutProcessInput({
            approve,
            rawBankTransferRef: refById[id],
            rawAdminNote: noteById[id],
        });
        if (!checked.ok) {
            setLocalError(checked.message);
            return;
        }
        processPayout.mutate({id, payload: checked.payload});
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                            <Wallet size={20} className="text-primary" aria-hidden="true"/>
                            Đối soát & Giải ngân Doanh thu Đối tác (Escrow Payouts)
                        </CardTitle>
                        <p className="m-0 mt-1 text-xs text-muted">
                            Xác nhận mã bút toán UNC chuyển khoản ngân hàng hoặc từ chối để hoàn số dư tự động về ví đối tác.
                        </p>
                    </div>
                    <select
                        aria-label="Lọc trạng thái lệnh rút tiền"
                        value={status}
                        onChange={e => setStatus(e.target.value as PayoutStatus | '')}
                        className="h-9 rounded-control border border-border bg-card px-3 text-xs font-semibold tabular-nums"
                    >
                        <option value="">Tất cả lệnh rút ({query.data?.totalElements ?? 0})</option>
                        <option value="PENDING">Chờ giải ngân</option>
                        <option value="PAID">Đã chuyển khoản</option>
                        <option value="REJECTED">Đã từ chối (Hoàn ví)</option>
                    </select>
                </CardHeader>
                {(localError || processPayout.isError) && (
                    <div className="px-5 pt-2">
                        <Alert variant="error" role="alert" className="text-xs">
                            {localError ?? (processPayout.error instanceof Error ? processPayout.error.message : 'Không thể xử lý lệnh giải ngân.')}
                        </Alert>
                    </div>
                )}
                <CardContent className="divide-y divide-border p-0">
                    {query.isLoading ? (
                        <div className="flex justify-center p-10" role="status"><Spinner size="lg"/></div>
                    ) : payouts.length === 0 ? (
                        <div className="p-8 text-center text-xs text-muted" role="status">Chưa có lệnh rút tiền nào từ đối tác.</div>
                    ) : (
                        payouts.map(po => (
                            <div key={po.id} className="space-y-3 p-5">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <strong className="font-mono text-sm font-semibold text-on-surface">{po.code}</strong>
                                            <span
                                                className={`rounded-badge px-2 py-0.5 text-xs font-semibold ${
                                                    po.status === 'PAID'
                                                        ? 'bg-slate-900 text-white'
                                                        : po.status === 'PENDING'
                                                          ? 'bg-amber-100 text-amber-800'
                                                          : 'bg-rose-100 text-danger'
                                                }`}
                                            >
                                                {po.status}
                                            </span>
                                        </div>
                                        <p className="m-0 mt-1 text-sm font-semibold text-on-surface">{po.providerDisplayName}</p>
                                        <p className="m-0 mt-0.5 text-xs text-muted tabular-nums">
                                            Ngân hàng nhận: <strong className="text-on-surface">{po.bankName} · {po.bankAccountNumber} ({po.bankAccountHolder})</strong>
                                        </p>
                                        {po.providerNote && (
                                            <p className="m-0 mt-0.5 text-xs text-muted">Ghi chú đối tác: {po.providerNote}</p>
                                        )}
                                        {po.bankTransferRef && (
                                            <p className="m-0 mt-0.5 font-mono text-xs font-semibold text-on-surface">
                                                Mã UNC ngân hàng: {po.bankTransferRef} (Xử lý bởi: {po.processedBy})
                                            </p>
                                        )}
                                    </div>

                                    <div className="text-right tabular-nums">
                                        <strong className="text-lg font-semibold text-on-surface">
                                            {formatMarketplaceVnd(Number(po.amountVnd))}
                                        </strong>
                                    </div>
                                </div>

                                {po.status === 'PENDING' && (
                                    <div className="uav-bezel">
                                        <div className="uav-bezel-core flex flex-wrap items-end justify-between gap-3 p-3.5">
                                            <div className="flex flex-1 flex-wrap items-end gap-2.5">
                                                <label className="min-w-[220px] flex-1 space-y-1 text-xs font-semibold text-on-surface">
                                                    <span className="block">Mã giao dịch UNC ngân hàng<RequiredMark/></span>
                                                    <input
                                                        type="text"
                                                        aria-label={`Mã giao dịch UNC ngân hàng cho lệnh ${po.code}`}
                                                        value={refById[po.id] ?? ''}
                                                        onChange={e => setRefById(s => ({...s, [po.id]: e.target.value}))}
                                                        placeholder="Mã giao dịch UNC ngân hàng (VD: FT26319...)"
                                                        className="h-9 w-full rounded-control border border-border-input bg-card px-3 font-mono text-xs font-normal"
                                                    />
                                                </label>
                                                <label className="min-w-[180px] flex-1 space-y-1 text-xs font-semibold text-on-surface">
                                                    <span className="block">Ghi chú kế toán (bắt buộc khi từ chối)<OptionalMark/></span>
                                                    <input
                                                        type="text"
                                                        aria-label={`Ghi chú kế toán cho lệnh ${po.code}`}
                                                        value={noteById[po.id] ?? ''}
                                                        onChange={e => setNoteById(s => ({...s, [po.id]: e.target.value}))}
                                                        placeholder="Ghi chú kế toán..."
                                                        className="h-9 w-full rounded-control border border-border-input bg-card px-3 text-xs font-normal"
                                                    />
                                                </label>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    disabled={processPayout.isPending}
                                                    leftIcon={<CheckCircle2 size={14} aria-hidden="true"/>}
                                                    onClick={() => handleProcess(po.id, true)}
                                                >
                                                    Xác nhận Đã chuyển khoản
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="danger"
                                                    disabled={processPayout.isPending}
                                                    leftIcon={<XCircle size={14} aria-hidden="true"/>}
                                                    onClick={() => handleProcess(po.id, false)}
                                                >
                                                    Từ chối & Hoàn ví
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
