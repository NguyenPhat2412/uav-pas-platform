import Link from 'next/link';

export default function OperationsNotFoundPage() {
  return (
    <main className="min-h-[80vh] flex items-center justify-center p-6 bg-slate-50">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center">
        <span className="inline-block text-xs font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-[#fef2f2] text-[#ab2523] border border-[#fecaca] mb-3">
          404 · RESOURCE_NOT_FOUND
        </span>
        <h1 className="text-xl font-extrabold text-slate-900 mb-2">Không tìm thấy phân hệ điều hành</h1>
        <p className="text-sm text-slate-600 mb-6">
          Đường dẫn hoặc tài nguyên tác chiến bạn yêu cầu không tồn tại hoặc đã được di chuyển.
        </p>
        <Link
          href="/operations/overview"
          className="inline-flex items-center justify-center px-4 py-2.5 bg-[#ab2523] hover:bg-[#8f1c1a] text-white text-xs font-bold rounded-xl shadow-xs transition"
        >
          Quay về Tổng quan Điều hành
        </Link>
      </div>
    </main>
  );
}
