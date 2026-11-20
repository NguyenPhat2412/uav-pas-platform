'use client';

import {useState} from 'react';
import Link from 'next/link';
import {ArrowDownToLine, Landmark, Lock, ShieldCheck, Wallet} from 'lucide-react';
import {Button} from '@/components/customer/CustomerUi';
import {OptionalMark, RequiredMark} from '@/components/ui';
import {ProviderStudioShell} from '@/components/marketplace/provider/ProviderStudioShell';
import {ProviderWalletLedger} from '@/components/marketplace/escrow/ProviderWalletLedger';
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
        {icon: Wallet, title: 'Số dư khả dụng (Rút ngay)', amount: wallet.availableBalanceVnd, sub: `Đã đối soát theo Phụ lục Biểu phí (${(Number(wallet.platformFeeRate || 0) * 100).toFixed(1)}%)`, tone: 'text-on-surface'},
        {icon: Lock, title: 'Đang tạm giữ chờ nghiệm thu', amount: wallet.escrowHeldVnd, sub: 'Mở khoá tự động khi khách nghiệm thu kết quả', tone: 'text-amber-700'},
        {icon: Landmark, title: 'Chờ giải ngân ngân hàng', amount: wallet.pendingPayoutVnd, sub: `Đã rút luỹ kế: ${formatVndCompact(wallet.totalWithdrawnVnd)}`, tone: 'text-on-surface'},
        {icon: ShieldCheck, title: 'Tổng doanh thu ròng luỹ kế', amount: wallet.totalEarnedVnd, sub: 'Ghi nhận minh bạch trên sổ cái đối soát', tone: 'text-on-surface'},
    ] : [];

    return (
        <ProviderStudioShell
            title="Sổ cái Đối soát & Giải ngân Thanh toán"
            subtitle="Theo dõi khoản thanh toán tạm giữ, doanh thu ròng theo Phụ lục Biểu phí đã xác nhận và lệnh rút tiền về ngân hàng thụ hưởng."
        >
            {!profileQuery.isLoading && !profile ? (
                <div className="rounded-panel border border-amber-200 bg-amber-50/70 p-6 text-center" role="status">
                    <p className="m-0 text-sm font-semibold text-on-surface">Hãy khởi tạo Hồ sơ Đối tác để kích hoạt Ví Ký quỹ.</p>
                    <Link href="/customer/provider/onboarding" className="mt-3 inline-flex min-h-9 items-center justify-center rounded-control bg-primary px-4 text-xs font-semibold whitespace-nowrap text-primary-foreground">
                        Đăng ký Đối tác →
                    </Link>
                </div>
            ) : walletQuery.isLoading || !wallet ? (
                <div className="h-64 animate-pulse rounded-panel bg-slate-200/70" role="status" aria-label="Đang tải dữ liệu ví ký quỹ"/>
            ) : (
                <div className="mx-auto max-w-6xl space-y-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {balanceCards.map(card => {
                            const Icon = card.icon;
                            return (
                                <div key={card.title} className="uav-bezel">
                                    <div className={`uav-bezel-core h-full p-5 tabular-nums ${card.tone}`}>
                                        <span className="flex items-center gap-1.5 text-xs font-semibold">
                                            <Icon size={15} aria-hidden="true"/>
                                            {card.title}
                                        </span>
                                        <strong className="mt-2 block text-2xl font-bold">{formatVndCompact(card.amount)}</strong>
                                        <span className="mt-1 block text-xs text-muted">{card.sub}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {msg && <div className="rounded-panel border border-slate-300 bg-surface-container-low px-4 py-3 text-xs font-semibold text-on-surface" role="status">{msg}</div>}
                    {errorMsg && <div className="rounded-panel border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-danger" role="alert">{errorMsg}</div>}

                    <section className="rounded-panel border border-slate-200 bg-card p-5 sm:p-6">
                        <h2 className="m-0 text-base font-semibold text-on-surface">Tạo lệnh rút tiền về Ngân hàng</h2>
                        <p className="m-0 mt-0.5 text-xs text-muted tabular-nums">
                            Tài khoản thụ hưởng:{' '}
                            {wallet.bankName && wallet.bankAccountNumber ? (
                                <strong className="text-on-surface">{wallet.bankName} · {wallet.bankAccountNumber} ({wallet.bankAccountHolder})</strong>
                            ) : (
                                <Link href="/customer/provider/onboarding" className="font-semibold text-primary underline">Cập nhật tài khoản ngân hàng tại Hồ sơ Đối tác →</Link>
                            )}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs tabular-nums">
                            <span className="text-muted">Hạn mức: <strong className="text-on-surface">{formatVndCompact(minPayoutVnd)}</strong> – <strong className="text-on-surface">{formatVndCompact(maxPayoutVnd)}</strong></span>
                            {Number(wallet.availableBalanceVnd) >= minPayoutVnd && (
                                <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Chọn nhanh mức rút tiền">
                                    <button type="button" onClick={() => setAmountVnd(String(minPayoutVnd))} className="min-h-7 rounded-badge border border-slate-200 bg-surface-container-low px-2.5 py-0.5 font-semibold whitespace-nowrap text-on-surface hover:border-slate-400">Tối thiểu</button>
                                    <button type="button" onClick={() => setAmountVnd(String(Math.max(minPayoutVnd, Math.min(maxPayoutVnd, Math.floor(Number(wallet.availableBalanceVnd) / 2)))))} className="min-h-7 rounded-badge border border-slate-200 bg-surface-container-low px-2.5 py-0.5 font-semibold whitespace-nowrap text-on-surface hover:border-slate-400">50% khả dụng</button>
                                    <button type="button" onClick={() => setAmountVnd(String(Math.min(maxPayoutVnd, Math.floor(Number(wallet.availableBalanceVnd)))))} className="min-h-7 rounded-badge border border-slate-900 bg-slate-900 px-2.5 py-0.5 font-semibold whitespace-nowrap text-white hover:bg-slate-800">Rút tối đa khả dụng</button>
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleWithdraw} className="mt-3 grid grid-cols-1 items-end gap-3 sm:grid-cols-3">
                            <label className="grid gap-1 text-xs font-semibold text-on-surface">
                                <span>Số tiền rút (VNĐ)<RequiredMark/></span>
                                <input required type="number" aria-label="Số tiền rút (VNĐ)" min={minPayoutVnd} max={maxPayoutVnd} step={10000} value={effectiveAmountInput} onChange={e => setAmountVnd(e.target.value)} placeholder={`Tối thiểu ${formatVndCompact(minPayoutVnd)}`} className="h-10 rounded-control border border-border-input bg-card px-3 text-xs font-semibold text-on-surface tabular-nums"/>
                            </label>
                            <label className="grid gap-1 text-xs font-semibold text-on-surface">
                                <span>Ghi chú đối soát<OptionalMark/></span>
                                <input type="text" aria-label="Ghi chú đối soát" value={providerNote} onChange={e => setProviderNote(e.target.value)} placeholder="Ghi chú đối soát" className="h-10 rounded-control border border-border-input bg-card px-3 text-xs font-normal text-on-surface"/>
                            </label>
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
