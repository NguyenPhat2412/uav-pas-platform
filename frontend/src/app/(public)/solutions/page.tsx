import {keepVietnamesePhrases} from "@/lib/typography";
import {pageMetadata} from "@/features/marketing/content/metadata";
import Link from 'next/link';
import {readinessLabels, solutions} from "@/features/marketing/content/site-content";
import {PublicPage} from "@/features/marketing/components/public-page";

export const metadata = pageMetadata("Giải pháp UAV", "Tìm hiểu quy trình thuê UAV, kiểm tra từ trên cao và các ứng dụng AI, tìm kiếm cứu nạn dự kiến.", "/solutions", true);

export default function SolutionsPage() {
    return (
        <PublicPage
            eyebrow="Giải pháp"
            title="Giải pháp cho từng mục tiêu nhiệm vụ."
            intro="Tìm hiểu quy trình yêu cầu hiện có và ứng dụng dự kiến. Nguồn lực sẵn có và quyền thực hiện nhiệm vụ cần đội vận hành xem xét."
            scene="tracking"
        >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {solutions.map((item) => {
                    const isAvailable = item.status === 'AVAILABLE';
                    return (
                        <Link
                            className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 shadow-xs hover:border-primary/40 hover:shadow-md transition-all"
                            href={`/solutions/${item.slug}`}
                            key={item.slug}
                        >
                            <span
                                className={`inline-flex self-start rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                                    isAvailable
                                        ? 'border-rose-200 bg-uav-red-light text-primary'
                                        : 'border-amber-200 bg-amber-50 text-warning'
                                }`}
                            >
                                {isAvailable ? 'Đã hỗ trợ gửi yêu cầu' : readinessLabels[item.status]}
                            </span>
                            <h2 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                                {keepVietnamesePhrases(item.title)}
                            </h2>
                            <p className="text-sm leading-relaxed text-slate-600">{item.text}</p>
                        </Link>
                    );
                })}
            </div>
        </PublicPage>
    );
}
