'use client';

import {
    formatVndCompact,
    payoutStatusLabel,
    walletTxLabel,
} from '@/forms/marketplace/marketplace-forms';
import {formatDate} from '@/lib/presentation';
import type {ProviderWallet} from '@/types/marketplace/marketplace.types';

export function ProviderWalletLedger({wallet}: { wallet: ProviderWallet }) {
    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="m-0 text-sm font-extrabold text-slate-900">
                    Sổ cái Biến động Số dư ({wallet.recentTransactions.length})
                </h2>
                {wallet.recentTransactions.length === 0 ? (
                    <p className="m-0 mt-3 text-xs text-slate-500">Chưa phát sinh giao dịch ký quỹ nào.</p>
                ) : (
                    <ul className="m-0 mt-3 list-none divide-y divide-slate-100 p-0">
                        {wallet.recentTransactions.map(tx => (
                            <li key={tx.id} className="flex items-start justify-between gap-3 py-3 text-xs">
                                <div>
                                    <strong className="font-bold text-slate-900">
                                        {walletTxLabel(tx.transactionType)}
                                    </strong>
                                    {tx.description && (
                                        <p className="m-0 mt-0.5 text-slate-500">{tx.description}</p>
                                    )}
                                    {tx.createdAt && (
                                        <span className="text-xs text-slate-400">{formatDate(tx.createdAt)}</span>
                                    )}
                                </div>
                                <div className="text-right">
                                    <strong className="block font-black text-primary">
                                        {formatVndCompact(tx.netAmountVnd)}
                                    </strong>
                                    {Number(tx.feeAmountVnd) > 0 && (
                                        <span className="block text-xs text-slate-500">
                                            Phí sàn: -{formatVndCompact(tx.feeAmountVnd)}
                                        </span>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="m-0 text-sm font-extrabold text-slate-900">
                    Lịch sử Lệnh rút tiền ({wallet.payouts.length})
                </h2>
                {wallet.payouts.length === 0 ? (
                    <p className="m-0 mt-3 text-xs text-slate-500">Chưa có lệnh rút tiền nào.</p>
                ) : (
                    <ul className="m-0 mt-3 list-none divide-y divide-slate-100 p-0">
                        {wallet.payouts.map(po => (
                            <li key={po.id} className="flex items-start justify-between gap-3 py-3 text-xs">
                                <div>
                                    <strong className="font-mono font-bold text-slate-900">{po.code}</strong>
                                    <p className="m-0 mt-0.5 text-slate-600">
                                        {po.bankName} · {po.bankAccountNumber}
                                    </p>
                                    {po.bankTransferRef && (
                                        <span className="text-xs font-semibold text-emerald-700">
                                            Mã UNC: {po.bankTransferRef}
                                        </span>
                                    )}
                                </div>
                                <div className="text-right">
                                    <strong className="block font-black text-slate-900">
                                        {formatVndCompact(po.amountVnd)}
                                    </strong>
                                    <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                                        {payoutStatusLabel(po.status)}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}
