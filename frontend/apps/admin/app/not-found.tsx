import Link from 'next/link';

export default function AdminNotFoundPage() {
  return (
    <main className="min-h-[80vh] flex items-center justify-center p-8 bg-slate-50">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center space-y-4">
        <span className="inline-block text-xs font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-[#fef2f2] text-[#ab2523] border border-[#fecaca]">
          404 · RESOURCE_NOT_FOUND
        </span>
        <h1 className="text-xl font-extrabold text-slate-900">Không tìm thấy trang quản trị</h1>
        <p className="text-sm text-slate-600">
          Phân hệ quản trị hoặc tài nguyên cấu hình bạn yêu cầu không tồn tại.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center px-4 py-2.5 bg-[#ab2523] hover:bg-[#8f1c1a] text-white text-xs font-bold rounded-xl shadow-xs transition"
        >
          Quay về Bảng điều khiển Admin
        </Link>
      </div>
    </main>
  );
}
