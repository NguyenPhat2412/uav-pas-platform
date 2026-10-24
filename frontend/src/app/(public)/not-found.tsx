import Link from 'next/link';

export default function NotFound() {
    return (
        <section className="py-20 px-4">
            <div className="mx-auto max-w-xl text-center space-y-4">
                <p className="text-xs font-extrabold uppercase tracking-widest text-primary">404</p>
                <h1 className="text-2xl font-extrabold text-foreground">Không tìm thấy trang này.</h1>
                <p className="text-sm text-slate-600">Quay về trang chủ hoặc tìm hiểu các dịch vụ được hỗ trợ.</p>
                <div className="pt-2">
                    <Link
                        className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover transition-colors"
                        href="/"
                    >
                        Về trang chủ
                    </Link>
                </div>
            </div>
        </section>
    );
}
