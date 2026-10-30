'use client';

import Link from 'next/link';
import {AlertTriangle, Home, RotateCcw} from 'lucide-react';
import {useI18n} from '@/providers/I18nContext';

export default function OperationsErrorPage({
                                                error,
                                                reset,
                                            }: {
    error: Error & { digest?: string; code?: string; status?: number };
    reset: () => void;
}) {
    const {t} = useI18n();
    return (
        <main className="min-h-[80vh] flex items-center justify-center p-6 bg-slate-50">
            <div
                className="max-w-lg w-full bg-white rounded-panel border border-slate-200 border-t-4 border-t-primary p-8 text-center">
                <div
                    className="w-14 h-14 rounded-panel bg-uav-red-light border border-red-200 text-primary flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle size={28}/>
                </div>
                <span
                    className="inline-block text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-badge bg-slate-100 text-slate-700 border border-slate-200 mb-2">
          {error?.code || (error?.status ? `HTTP_${error.status}` : 'OPERATIONS_RUNTIME_EXCEPTION')}
        </span>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight mb-2">
                    {t('opsShared.routes.operations.errorTitle')}
                </h1>
                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                    {error?.message || t('opsShared.routes.operations.errorDetail')}
                </p>
                <div className="flex items-center justify-center gap-3">
                    <button
                        type="button"
                        onClick={reset}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold rounded-control transition cursor-pointer"
                    >
                        <RotateCcw size={15}/> {t('opsShared.routes.operations.reload')}
                    </button>
                    <Link
                        href="/operations/overview"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-control border border-slate-200 transition"
                    >
                        <Home size={15}/> {t('opsShared.routes.operations.backOverview')}
                    </Link>
                </div>
            </div>
        </main>
    );
}
