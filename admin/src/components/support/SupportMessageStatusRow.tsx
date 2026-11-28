'use client';

import {useState} from 'react';
import {AlertCircle, Check, CheckCheck, Clock} from 'lucide-react';
import {cn} from '@/lib/utils';
import type {ResolvedMessageReceipt} from '@/utils/message-status';

interface SupportMessageStatusRowProps {
    receipt: ResolvedMessageReceipt | null;
    onRetry?: () => void;
    className?: string;
}

export function SupportMessageStatusRow({
    receipt,
    onRetry,
    className,
}: SupportMessageStatusRowProps) {
    const [expanded, setExpanded] = useState(false);
    if (!receipt) return null;

    if (receipt.status === 'sending') {
        return (
            <span
                role="status"
                className={cn(
                    'mt-1 inline-flex items-center gap-1 px-0.5 text-[10.5px] font-medium text-slate-400',
                    className,
                )}
            >
                <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span>{receipt.label}</span>
            </span>
        );
    }

    if (receipt.status === 'failed') {
        return (
            <button
                type="button"
                onClick={onRetry}
                className={cn(
                    'mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold text-rose-700 transition-colors hover:bg-rose-50 hover:underline cursor-pointer',
                    className,
                )}
            >
                <AlertCircle className="h-3 w-3 shrink-0 text-danger" aria-hidden="true" />
                <span>{receipt.label}</span>
            </button>
        );
    }

    if (receipt.status === 'sent') {
        return (
            <span
                className={cn(
                    'mt-1 inline-flex items-center gap-1 px-0.5 text-[10.5px] font-medium text-slate-400',
                    className,
                )}
            >
                <Check className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span>{receipt.label}</span>
            </span>
        );
    }

    if (receipt.status === 'delivered') {
        return (
            <button
                type="button"
                title={receipt.detail ?? receipt.label}
                onClick={() => receipt.detail && setExpanded((prev) => !prev)}
                className={cn(
                    'mt-1 inline-flex items-center gap-1 px-0.5 text-[10.5px] font-medium text-slate-500 transition-colors hover:text-slate-700 cursor-pointer',
                    className,
                )}
            >
                <CheckCheck className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
                <span>{expanded && receipt.detail ? receipt.detail : receipt.label}</span>
            </button>
        );
    }

    return (
        <button
            type="button"
            title={receipt.detail ?? receipt.label}
            onClick={() => receipt.detail && setExpanded((prev) => !prev)}
            className={cn(
                'mt-1 inline-flex items-center gap-1.5 px-0.5 text-[10.5px] font-semibold text-slate-600 transition-colors hover:text-slate-900 cursor-pointer',
                className,
            )}
        >
            <span
                aria-hidden="true"
                className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-slate-900 text-[8px] font-extrabold leading-none text-white shadow-2xs"
            >
                {receipt.viewerInitials}
            </span>
            <CheckCheck className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            <span>{expanded && receipt.detail ? receipt.detail : receipt.label}</span>
        </button>
    );
}
