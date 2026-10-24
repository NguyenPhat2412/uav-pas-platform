import Link from 'next/link';
import {customerUrl} from "@/features/marketing/content/site-content";

export function PublicFooter() {
    return (
        <footer className="border-t border-border bg-slate-50/70 pt-14 pb-8 text-sm text-slate-600">
            <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
                <div className="space-y-3">
                    <Link className="inline-flex items-center gap-2.5 text-base font-extrabold tracking-wider text-foreground" href="/">
                        <img
                            src="/vju-logo.svg"
                            alt="Biểu trưng Đại học Việt Nhật"
                            width={30}
                            height={30}
                            className="h-[30px] w-[30px] object-contain"
                        />
                        <span>UAV PAS</span>
                    </Link>
                    <p className="text-xs leading-relaxed text-slate-500">
                        Nền tảng kết nối yêu cầu dịch vụ với hoạt động điều phối nhiệm vụ UAV.
                    </p>
                </div>
                <div className="flex flex-col gap-2">
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">Khám phá</h2>
                    <Link className="hover:text-primary transition-colors" href="/services">Dịch vụ</Link>
                    <Link className="hover:text-primary transition-colors" href="/solutions">Giải pháp</Link>
                    <Link className="hover:text-primary transition-colors" href="/how-it-works">Quy trình thực hiện</Link>
                    <Link className="hover:text-primary transition-colors" href="/faq">Câu hỏi thường gặp</Link>
                </div>
                <div className="flex flex-col gap-2">
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">Tiếp tục</h2>
                    <Link className="hover:text-primary transition-colors" href="/?auth=login">Đăng nhập</Link>
                    <Link className="hover:text-primary transition-colors" href="/?auth=register">Tạo tài khoản</Link>
                    <Link className="hover:text-primary transition-colors" href="/contact">Liên hệ</Link>
                </div>
                <div className="flex flex-col gap-2">
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">Thông tin pháp lý</h2>
                    <Link className="hover:text-primary transition-colors" href="/privacy">Quyền riêng tư</Link>
                    <Link className="hover:text-primary transition-colors" href="/terms">Điều khoản</Link>
                    <p className="text-xs leading-relaxed text-slate-500">
                        Bảng giá và thông tin liên hệ sẽ được công bố sau khi phê duyệt.
                    </p>
                </div>
            </div>
            <div className="mx-auto mt-10 flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 border-t border-border px-4 pt-6 text-xs text-slate-500 sm:px-6">
                <span>© {new Date().getFullYear()} UAV PAS</span>
                <span>NguyenPhat2412</span>
            </div>
        </footer>
    );
}
