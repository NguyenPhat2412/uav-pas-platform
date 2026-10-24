import {serviceScenes, UavPhoto} from "@/features/marketing/components/uav-photo";
import {pageMetadata} from "@/features/marketing/content/metadata";
import Link from 'next/link';
import {services} from "@/features/marketing/content/site-content";
import {CustomerCta, PublicPage} from "@/features/marketing/components/public-page";

export const metadata = pageMetadata("Dịch vụ UAV", "Tìm hiểu các loại nhiệm vụ được hỗ trợ và xác nhận danh mục đang hoạt động sau khi đăng nhập.", "/services", true);

export default function ServicesPage() {
    return (
        <PublicPage
            eyebrow="Dịch vụ"
            title="Chọn dịch vụ phù hợp với nhiệm vụ."
            intro="Đây là các loại yêu cầu được hỗ trợ, không phải danh sách thiết bị sẵn có. Đăng nhập để xem danh mục đang hoạt động; đội vận hành xác nhận phạm vi và khả năng thực hiện."
        >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {services.map((item) => (
                    <Link
                        className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xs hover:border-primary/40 hover:shadow-md transition-all"
                        href={`/services/${item.slug}`}
                        key={item.slug}
                    >
                        <UavPhoto scene={serviceScenes[item.slug]} compact className="mb-0"/>
                        <div className="flex flex-1 flex-col gap-2.5 p-6">
                            <span className="inline-flex self-start rounded-full border border-rose-200 bg-uav-red-light px-2.5 py-0.5 text-xs font-bold text-primary">
                                Đã hỗ trợ gửi yêu cầu
                            </span>
                            <h2 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">{item.title}</h2>
                            <p className="flex-1 text-sm leading-relaxed text-slate-600">{item.text}</p>
                            <span className="pt-2 text-sm font-bold text-primary group-hover:underline">Xem chi tiết</span>
                        </div>
                    </Link>
                ))}
            </div>
            <CustomerCta/>
        </PublicPage>
    );
}
