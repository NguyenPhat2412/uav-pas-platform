'use client';
import {Button} from "@/components/shared";

export default function ErrorPage({reset}: { reset: () => void }) {
    return (
        <section className="py-20 px-4">
            <div className="mx-auto max-w-xl text-center space-y-4">
                <h1 className="text-2xl font-extrabold text-foreground">Không thể tải trang này.</h1>
                <p className="text-sm text-slate-600">Vui lòng thử lại hoặc quay về trang chủ.</p>
                <div className="flex items-center justify-center gap-3 pt-2">
                    <Button
                        className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover transition-colors cursor-pointer"
                        onClick={reset}
                    >
                        Thử lại
                    </Button>
                    <a
                        className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                        href="/"
                    >
                        Trang chủ
                    </a>
                </div>
            </div>
        </section>
    );
}
