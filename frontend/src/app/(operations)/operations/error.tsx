'use client';

import Link from 'next/link';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export default function OperationsErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string; code?: string; status?: number };
  reset: () => void;
}) {
  return (
    <main className="min-h-[80vh] flex items-center justify-center p-6 bg-slate-50">
      <div className="max-w-lg w-full bg-white rounded-2xl border border-slate-200 border-t-4 border-t-[#ab2523] p-8 shadow-sm text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#fef2f2] border border-[#fecaca] text-[#ab2523] flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={28} />
        </div>
        <span className="inline-block text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 mb-2">
          {error?.code || (error?.status ? `HTTP_${error.status}` : 'OPERATIONS_RUNTIME_EXCEPTION')}
        </span>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight mb-2">
          Gián đoạn hiển thị khu vực điều hành
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed mb-6">
          {error?.message || 'Đã xảy ra ngoại lệ trong quá trình tải dữ liệu tác chiến. Vui lòng thử tải lại hoặc quay về trang tổng quan.'}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#ab2523] hover:bg-[#8f1c1a] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            <RotateCcw size={15} /> Thử tải lại
          </button>
          <Link
            href="/operations/overview"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 transition"
          >
            <Home size={15} /> Về Tổng quan
          </Link>
        </div>
      </div>
    </main>
  );
}
