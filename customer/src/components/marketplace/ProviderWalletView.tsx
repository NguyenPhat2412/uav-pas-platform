'use client';

import {useState} from 'react';
import Link from 'next/link';
import {ArrowDownToLine, Landmark, Lock, ShieldCheck, Wallet} from 'lucide-react';
import {Button} from '@/components/customer/CustomerUi';
import {ProviderStudioShell} from '@/components/marketplace/ProviderStudioShell';
import {ProviderWalletLedger} from '@/components/marketplace/ProviderWalletLedger';
import {useMyProviderProfile, useMyProviderWallet, useRequestPayout} from '@/hooks/marketplace/useMarketplace';
import {useSiteInfo} from '@/hooks/settings/useSiteInfo';
import {extractActionableError, formatVndCompact} from '@/forms/marketplace/marketplace-forms';

export default function ProviderWalletView() {
    const profileQuery = useMyProviderProfile();
    const profile = profileQuery.data;
    const walletQuery = useMyProviderWallet(Boolean(profile));
    const requestPayout = useRequestPayout();
    const {minPayoutVnd, maxPayoutVnd} = useSiteInfo();

    const [amountVnd, setAmountVnd] = useState<string>('');
    const [providerNote, setProviderNote] = useState('');
    const [msg, setMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const wallet = walletQuery.data;
    const effectiveAmountInput = amountVnd === '' ? String(minPayoutVnd) : amountVnd;

    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault();
        setMsg('');
        setErrorMsg('');
        if (!wallet?.bankName || !wallet?.bankAccountNumber) {
            setErrorMsg('Vui lòng cập nhật tài khoản ngân hàng thụ hưởng tại mục Hồ sơ & KYC trước khi tạo lệnh rút tiền.');
            return;
        }
        const numericAmount = Math.round(Number(effectiveAmountInput));
        const available = Number(wallet.availableBalanceVnd || 0);
        if (!Number.isFinite(numericAmount) || numericAmount < minPayoutVnd) {
            setErrorMsg(`Số tiền rút tối thiểu theo cấu hình sàn hiện tại là ${formatVndCompact(minPayoutVnd)}.`);
            return;
        }
        if (numericAmount > maxPayoutVnd) {
            setErrorMsg(`Số tiền rút tối đa mỗi lệnh theo cấu hình sàn hiện tại là ${formatVndCompact(maxPayoutVnd)}.`);
            return;
        }
        if (numericAmount > available) {
            setErrorMsg(`Số tiền yêu cầu vượt quá số dư khả dụng (${formatVndCompact(available)}).`);
            return;
        }
        try {
            await requestPayout.mutateAsync({amountVnd: numericAmount, providerNote: providerNote.trim() || undefined});
            setMsg('Đã tạo lệnh rút tiền thành công! Bộ phận tài chính sẽ đối soát và chuyển khoản.');
            setProviderNote('');
        } catch (err) {
            setErrorMsg(extractActionableError(err, 'Không thể tạo lệnh rút tiền.'));
        }
    };

    const balanceCards = wallet ? [
        {icon: Wallet, title: 'Số dư khả dụng (Rút ngay)', amount: wallet.availableBalanceVnd, sub: `Đã trừ phí vận hành sàn ${(Number(wallet.platformFeeRate || 0) * 100).toFixed(1)}%`, tone: 'border-emerald-200 text-emerald-700'},
        {icon: Lock, title: 'Đang giữ Ký quỹ (Escrow)', amount: wallet.escrowHeldVnd, sub: 'Mở khoá tự động khi khách nghiệm thu kết quả', tone: 'border-amber-200 text-amber-700'},
        {icon: Landmark, title: 'Chờ giải ngân ngân hàng', amount: wallet.pendingPayoutVnd, sub: `Đã rút luỹ kế: ${formatVndCompact(wallet.totalWithdrawnVnd)}`, tone: 'border-slate-200 text-slate-900'},
        {icon: ShieldCheck, title: 'Tổng doanh thu ròng luỹ kế', amount: wallet.totalEarnedVnd, sub: 'Minh bạch trên sổ cái bất biến', tone: 'border-slate-200 text-slate-900'},
    ] : [];

    return (
        <ProviderStudioShell
            title="Ví Ký quỹ Escrow & Đối soát Doanh thu"
            subtitle="Theo dõi tiền ký quỹ đang giữ, doanh thu ròng sau chiết khấu sàn và rút tiền về tài khoản ngân hàng."
        >
            {!profileQuery.isLoading && !profile ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 text-center" role="status">
                    <p className="m-0 text-sm font-bold text-slate-900">Hãy khởi tạo Hồ sơ Đối tác để kích hoạt Ví Ký quỹ.</p>
                    <Link href="/customer/provider/onboarding" className="mt-3 inline-flex h-9 items-center justify-center rounded-control bg-primary px-4 text-xs font-bold text-primary-foreground">
                        Đăng ký Đối tác →
                    </Link>
                </div>
            ) : walletQuery.isLoading || !wallet ? (
                <div className="h-64 animate-pulse rounded-2xl bg-slate-200/70" role="status" aria-label="Đang tải dữ liệu ví ký quỹ"/>
            ) : (
                <div className="mx-auto max-w-6xl space-y-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {balanceCards.map(card => {
                            const Icon = card.icon;
                            return (
                                <div key={card.title} className={`rounded-2xl border bg-white p-5 ${card.tone}`}>
                                    <span className="flex items-center gap-1.5 text-xs font-bold">
                                        <Icon size={15} aria-hidden="true"/>
                                        {card.title}
                                    </span>
                                    <strong className="mt-2 block text-2xl font-black">{formatVndCompact(card.amount)}</strong>
                                    <span className="mt-1 block text-xs text-slate-500">{card.sub}</span>
                                </div>
                            );
                        })}
                    </div>

                    {msg && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800" role="status">{msg}</div>}
                    {errorMsg && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-danger" role="alert">{errorMsg}</div>}

                    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                        <h2 className="m-0 text-base font-extrabold text-slate-900">Tạo lệnh rút tiền về Ngân hàng</h2>
                        <p className="m-0 mt-0.5 text-xs text-slate-500">
                            Tài khoản thụ hưởng:{' '}
                            {wallet.bankName && wallet.bankAccountNumber ? (
                                <strong className="text-slate-800">{wallet.bankName} · {wallet.bankAccountNumber} ({wallet.bankAccountHolder})</strong>
                            ) : (
                                <Link href="/customer/provider/onboarding" className="font-bold text-primary underline">Cập nhật tài khoản ngân hàng tại Hồ sơ Đối tác →</Link>
                            )}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-slate-500">Hạn mức: <strong>{formatVndCompact(minPayoutVnd)}</strong> – <strong>{formatVndCompact(maxPayoutVnd)}</strong></span>
                            {Number(wallet.availableBalanceVnd) >= minPayoutVnd && (
                                <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Chọn nhanh mức rút tiền">
                                    <button type="button" onClick={() => setAmountVnd(String(minPayoutVnd))} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 font-bold text-slate-700 hover:border-primary hover:text-primary">Tối thiểu</button>
                                    <button type="button" onClick={() => setAmountVnd(String(Math.max(minPayoutVnd, Math.min(maxPayoutVnd, Math.floor(Number(wallet.availableBalanceVnd) / 2)))))} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 font-bold text-slate-700 hover:border-primary hover:text-primary">50% khả dụng</button>
                                    <button type="button" onClick={() => setAmountVnd(String(Math.min(maxPayoutVnd, Math.floor(Number(wallet.availableBalanceVnd)))))} className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 font-bold text-emerald-800 hover:border-emerald-400">Rút tối đa khả dụng</button>
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleWithdraw} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <input required type="number" aria-label="Số tiền rút (VNĐ)" min={minPayoutVnd} max={maxPayoutVnd} step={10000} value={effectiveAmountInput} onChange={e => setAmountVnd(e.target.value)} placeholder={`Số tiền rút (tối thiểu ${formatVndCompact(minPayoutVnd)})`} className="h-10 rounded-control border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900"/>
                            <input type="text" aria-label="Ghi chú đối soát" value={providerNote} onChange={e => setProviderNote(e.target.value)} placeholder="Ghi chú đối soát (tuỳ chọn)" className="h-10 rounded-control border border-slate-300 bg-white px-3 text-xs text-slate-900"/>
                            <Button type="submit" disabled={requestPayout.isPending || Number(wallet.availableBalanceVnd) < minPayoutVnd}>
                                <ArrowDownToLine size={14} className="mr-1 inline" aria-hidden="true"/>
                                Gửi yêu cầu rút tiền
                            </Button>
                        </form>
                    </section>

                    <ProviderWalletLedger wallet={wallet}/>
                </div>
            )}
        </ProviderStudioShell>
    );
}
