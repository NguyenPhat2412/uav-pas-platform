'use client';

import Link from 'next/link';
import {
    ArrowUpRight,
    Clock,
    CreditCard,
    Landmark,
    Lock,
    RefreshCw,
    ShieldAlert,
    ShieldCheck,
    Wallet,
} from 'lucide-react';
import {Button} from '@/components/ui';
import {ProviderStudioShell} from '@/components/marketplace/provider/ProviderStudioShell';
import {useMyProviderProfile, useMyProviderWallet} from '@/hooks/marketplace/useMarketplace';
import {extractActionableError, formatVndCompact} from '@/forms/marketplace/marketplace-forms';
import {useI18n} from '@/providers/I18nContext';

export function ProviderWalletView() {
    const {t, formatDate} = useI18n();
    const profileQuery = useMyProviderProfile();
    const profile = profileQuery.data;
    const walletQuery = useMyProviderWallet(Boolean(profile));
    const wallet = walletQuery.data;

    const balanceCards = wallet
        ? [
              {
                  icon: Wallet,
                  label: t('opsMarketplace.wallet.cards.available'),
                  amount: wallet.availableBalanceVnd,
              },
              {
                  icon: Lock,
                  label: t('opsMarketplace.wallet.cards.escrowHeld'),
                  amount: wallet.escrowHeldVnd,
              },
              {
                  icon: Clock,
                  label: t('opsMarketplace.wallet.cards.pendingPayout'),
                  amount: wallet.pendingPayoutVnd,
              },
              {
                  icon: ShieldCheck,
                  label: t('opsMarketplace.wallet.cards.totalEarned'),
                  amount: wallet.totalEarnedVnd,
              },
          ]
        : [];

    return (
        <ProviderStudioShell
            title={t('opsMarketplace.wallet.title')}
            subtitle={t('opsMarketplace.wallet.subtitle')}
            activeResource="providerWallet"
        >
            {profileQuery.isLoading || (Boolean(profile) && walletQuery.isLoading) ? (
                <div className="mx-auto max-w-6xl space-y-4" role="status" aria-label={t('opsMarketplace.common.loading')}>
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        {[1, 2, 3, 4].map(n => (
                            <div key={n} className="h-28 animate-pulse rounded-2xl bg-slate-200/70"/>
                        ))}
                    </div>
                    <div className="h-56 animate-pulse rounded-2xl bg-slate-200/70"/>
                </div>
            ) : !profile ? (
                <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-center" role="status">
                    <CreditCard size={28} className="mx-auto text-primary" aria-hidden="true"/>
                    <h2 className="m-0 mt-2 text-base font-semibold text-slate-900">
                        {t('opsMarketplace.common.requiredOnboardingTitle')}
                    </h2>
                    <p className="m-0 mt-1 text-[13px] text-slate-600">
                        {t('opsMarketplace.common.requiredOnboardingDesc')}
                    </p>
                    <Link
                        href="/operations/provider/onboarding"
                        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-control bg-primary px-5 text-xs font-semibold whitespace-nowrap text-white"
                    >
                        {t('opsMarketplace.common.goToOnboarding')}
                    </Link>
                </div>
            ) : walletQuery.isError || !wallet ? (
                <div className="mx-auto max-w-xl rounded-2xl border border-rose-200 bg-white p-6 text-center" role="alert">
                    <ShieldAlert size={28} className="mx-auto text-danger" aria-hidden="true"/>
                    <p className="m-0 mt-2 text-sm font-semibold text-slate-900">
                        {extractActionableError(walletQuery.error, t('opsMarketplace.common.retry'))}
                    </p>
                    <Button type="button" variant="secondary" className="mt-4" onClick={() => void walletQuery.refetch()}>
                        <RefreshCw size={14} className="mr-1.5 inline" aria-hidden="true"/>
                        {t('opsMarketplace.common.retry')}
                    </Button>
                </div>
            ) : (
                <div className="mx-auto max-w-6xl space-y-5">
                    {/* Nhãn thông báo chỉ hiển thị & Minh hoạ */}
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-700">
                        <span className="font-medium">{t('opsMarketplace.wallet.readOnlyNotice')}</span>
                        <span className="rounded-full bg-uav-red-light px-2.5 py-0.5 text-xs font-bold whitespace-nowrap text-primary">
                            {t('opsMarketplace.common.illustrationBadge')}
                        </span>
                    </div>

                    {/* 4 thẻ số dư Icon + Số + Nhãn Minh hoạ */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {balanceCards.map(card => {
                            const Icon = card.icon;
                            return (
                                <div
                                    key={card.label}
                                    className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-uav-red-light text-primary">
                                            <Icon size={18} aria-hidden="true"/>
                                        </span>
                                        <span className="rounded bg-uav-red-light px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-primary">
                                            {t('opsMarketplace.common.illustrationBadge')}
                                        </span>
                                    </div>
                                    <div className="mt-3">
                                        <span className="block truncate text-xs font-medium text-slate-500">
                                            {card.label}
                                        </span>
                                        <strong className="mt-0.5 block text-xl font-bold text-primary tabular-nums">
                                            {formatVndCompact(card.amount)}
                                        </strong>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Tài khoản ngân hàng thụ hưởng */}
                    <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5">
                        <div className="flex items-center gap-3">
                            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                                <Landmark size={20} aria-hidden="true"/>
                            </span>
                            <div>
                                <h2 className="m-0 text-sm font-semibold text-slate-900">
                                    {t('opsMarketplace.wallet.bankSection.title')}
                                </h2>
                                <p className="m-0 mt-0.5 text-xs text-slate-600 tabular-nums">
                                    {wallet.bankName && wallet.bankAccountNumber
                                        ? `${wallet.bankName} · ${wallet.bankAccountNumber} · ${wallet.bankAccountHolder ?? ''}`
                                        : t('opsMarketplace.wallet.bankSection.empty')}
                                </p>
                            </div>
                        </div>
                        <Link
                            href="/operations/provider/onboarding"
                            className="inline-flex min-h-9 items-center gap-1 rounded-control border border-slate-200 px-3 text-xs font-semibold whitespace-nowrap text-slate-700 hover:border-primary hover:text-primary"
                        >
                            <span>{t('opsMarketplace.wallet.bankSection.updateLink')}</span>
                            <ArrowUpRight size={13} aria-hidden="true"/>
                        </Link>
                    </section>

                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        {/* Lịch sử giao dịch minh hoạ */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-5">
                            <div className="mb-3 flex items-center justify-between gap-2">
                                <h2 className="m-0 text-base font-semibold text-slate-900">
                                    {t('opsMarketplace.wallet.transactions.title')}
                                </h2>
                                <span className="rounded bg-uav-red-light px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-primary">
                                    {t('opsMarketplace.common.illustrationBadge')}
                                </span>
                            </div>

                            {wallet.recentTransactions.length === 0 ? (
                                <p className="m-0 py-6 text-center text-xs text-slate-500">
                                    {t('opsMarketplace.wallet.transactions.empty')}
                                </p>
                            ) : (
                                <ul className="m-0 list-none divide-y divide-slate-100 p-0">
                                    {wallet.recentTransactions.map(tx => (
                                        <li key={tx.id} className="flex items-center justify-between gap-3 py-3 text-xs">
                                            <div className="min-w-0">
                                                <strong className="block truncate font-semibold text-slate-900">
                                                    {tx.description || tx.transactionType}
                                                </strong>
                                                {tx.createdAt && (
                                                    <span className="text-slate-400">
                                                        {formatDate(tx.createdAt)}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-right tabular-nums">
                                                <strong className="block font-bold text-primary">
                                                    {formatVndCompact(tx.netAmountVnd)}
                                                </strong>
                                                <span className="text-[11px] text-slate-400">
                                                    {t('opsMarketplace.common.illustrationBadge')}
                                                </span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>

                        {/* Lịch sử giải ngân minh hoạ */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-5">
                            <div className="mb-3 flex items-center justify-between gap-2">
                                <h2 className="m-0 text-base font-semibold text-slate-900">
                                    {t('opsMarketplace.wallet.payouts.title')}
                                </h2>
                                <span className="rounded bg-uav-red-light px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-primary">
                                    {t('opsMarketplace.common.illustrationBadge')}
                                </span>
                            </div>

                            {wallet.payouts.length === 0 ? (
                                <p className="m-0 py-6 text-center text-xs text-slate-500">
                                    {t('opsMarketplace.wallet.payouts.empty')}
                                </p>
                            ) : (
                                <ul className="m-0 list-none divide-y divide-slate-100 p-0">
                                    {wallet.payouts.map(payout => (
                                        <li key={payout.id} className="flex items-center justify-between gap-3 py-3 text-xs">
                                            <div className="min-w-0">
                                                <strong className="block font-mono font-semibold text-slate-900">
                                                    {payout.code}
                                                </strong>
                                                <span className="block truncate text-slate-500">
                                                    {payout.bankName} · {payout.bankAccountNumber}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2.5 tabular-nums">
                                                <strong className="font-bold text-primary whitespace-nowrap">
                                                    {formatVndCompact(payout.amountVnd)}
                                                </strong>
                                                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-slate-700">
                                                    {t(`opsMarketplace.wallet.payouts.status.${payout.status}`)}
                                                </span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    </div>
                </div>
            )}
        </ProviderStudioShell>
    );
}
export default ProviderWalletView;
