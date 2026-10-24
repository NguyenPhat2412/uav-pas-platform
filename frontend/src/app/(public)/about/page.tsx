import {UavPhoto} from "@/features/marketing/components/uav-photo";
import {pageMetadata} from "@/features/marketing/content/metadata";
import {CustomerCta, PublicPage} from "@/features/marketing/components/public-page";

export const metadata = pageMetadata("Giới thiệu UAV PAS", "Cách UAV PAS kết nối khách hàng, yêu cầu nhiệm vụ và quy trình xem xét của đội vận hành.", "/about", true);

export default function AboutPage() {
    return (
        <PublicPage
            eyebrow="Giới thiệu UAV PAS"
            title="Kết nối cùng một mục tiêu nhiệm vụ UAV."
            intro="UAV PAS giúp chuyển nhu cầu dịch vụ thành quy trình nhiệm vụ có cấu trúc."
        >
            <UavPhoto scene="team" className="max-w-3xl"/>
            <div className="max-w-3xl space-y-6 text-slate-600">
                <p className="text-base leading-relaxed">
                    Trang giới thiệu trình bày các tính năng hiện có. Khách hàng quản lý tài khoản và nhiệm vụ trong tài khoản riêng; đội vận hành xem xét yêu cầu trong không gian làm việc riêng.
                </p>
                <h2 className="pt-4 text-xl font-bold text-foreground">Nền tảng kết nối những ai</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <article className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-2">
                        <h2 className="text-lg font-bold text-foreground">Khách hàng</h2>
                        <p className="text-sm leading-relaxed text-slate-600">
                            Mô tả nhu cầu dịch vụ, cung cấp thông tin nhiệm vụ và theo dõi các cập nhật được chia sẻ.
                        </p>
                    </article>
                    <article className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-2">
                        <h2 className="text-lg font-bold text-foreground">Đội vận hành</h2>
                        <p className="text-sm leading-relaxed text-slate-600">
                            Xem xét yêu cầu, điều phối bước tiếp theo và quản lý kết quả gắn với nhiệm vụ.
                        </p>
                    </article>
                </div>
                <CustomerCta/>
            </div>
        </PublicPage>
    );
}
