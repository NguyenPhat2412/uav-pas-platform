'use client';

import {useState} from 'react';
import {CheckCircle2, Wallet, XCircle} from 'lucide-react';
import {Alert, Button, Card, CardContent, CardHeader, CardTitle, Spinner} from '@/components/ui';
import {useAdminPayouts, useProcessPayout} from '@/hooks/marketplace/useAdminMarketplace';
import type {PayoutStatus} from '@/types/marketplace/marketplace.types';

function formatVnd(amount: number): string {
    return `${new Intl.NumberFormat('vi-VN').format(Math.round(amount || 0))} ₫`;
}

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
        const ref = refById[id]?.trim();
        const note = noteById[id]?.trim();
        if (approve && !ref) {
            setLocalError('Vui lòng nhập mã giao dịch UNC ngân hàng trước khi xác nhận đã chuyển khoản.');
            return;
        }
        if (!approve && !note) {
            setLocalError('Vui lòng nhập ghi chú lý do kế toán khi từ chối và hoàn số dư về ví đối tác.');
            return;
        }
        processPayout.mutate({
            id,
            payload: {
                approve,
                bankTransferRef: ref || undefined,
                adminNote: note || undefined,
            },
        });
    };

    return (
        <div className="space-y-4 p-4 sm:p-6">
            <Card>
                <CardHeader className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-lg font-extrabold">
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
                        className="h-9 rounded-control border border-border bg-white px-3 text-xs font-semibold"
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
                                            <strong className="font-mono text-sm font-extrabold text-primary">{po.code}</strong>
                                            <span
                                                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                                    po.status === 'PAID'
                                                        ? 'bg-emerald-100 text-emerald-800'
                                                        : po.status === 'PENDING'
                                                          ? 'bg-amber-100 text-amber-800'
                                                          : 'bg-rose-100 text-danger'
                                                }`}
                                            >
                                                {po.status}
                                            </span>
                                        </div>
                                        <p className="m-0 mt-1 text-sm font-bold text-slate-900">{po.providerDisplayName}</p>
                                        <p className="m-0 mt-0.5 text-xs text-slate-600">
                                            Ngân hàng nhận: <strong>{po.bankName} · {po.bankAccountNumber} ({po.bankAccountHolder})</strong>
                                        </p>
                                        {po.providerNote && (
                                            <p className="m-0 mt-0.5 text-xs text-slate-500">Ghi chú đối tác: {po.providerNote}</p>
                                        )}
                                        {po.bankTransferRef && (
                                            <p className="m-0 mt-0.5 text-xs font-bold text-emerald-700">
                                                Mã UNC ngân hàng: {po.bankTransferRef} (Xử lý bởi: {po.processedBy})
                                            </p>
                                        )}
                                    </div>

                                    <div className="text-right">
                                        <strong className="text-lg font-black text-slate-900">
                                            {formatVnd(Number(po.amountVnd))}
                                        </strong>
                                    </div>
                                </div>

                                {po.status === 'PENDING' && (
                                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                                        <div className="flex flex-1 flex-wrap items-center gap-2">
                                            <input
                                                type="text"
                                                aria-label={`Mã giao dịch UNC ngân hàng cho lệnh ${po.code}`}
                                                value={refById[po.id] ?? ''}
                                                onChange={e => setRefById(s => ({...s, [po.id]: e.target.value}))}
                                                placeholder="Mã giao dịch UNC ngân hàng (VD: FT26319...)"
                                                className="h-9 min-w-[220px] flex-1 rounded-control border border-slate-300 bg-white px-3 text-xs"
                                            />
                                            <input
                                                type="text"
                                                aria-label={`Ghi chú kế toán cho lệnh ${po.code}`}
                                                value={noteById[po.id] ?? ''}
                                                onChange={e => setNoteById(s => ({...s, [po.id]: e.target.value}))}
                                                placeholder="Ghi chú kế toán..."
                                                className="h-9 min-w-[180px] flex-1 rounded-control border border-slate-300 bg-white px-3 text-xs"
                                            />
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
                                )}
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
