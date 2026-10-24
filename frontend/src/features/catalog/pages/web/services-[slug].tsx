import {serviceScenes} from "@/features/marketing/components/uav-photo";
import {pageMetadata} from "@/features/marketing/content/metadata";
import {notFound} from 'next/navigation';
import {serviceDetails} from "@/features/marketing/content/service-details";
import {services} from "@/features/marketing/content/site-content";
import {CustomerCta, PublicPage} from "@/features/marketing/components/public-page";

export function generateStaticParams() {
    return services.map(({slug}) => ({slug}))
}

export async function generateMetadata({params}: { params: Promise<{ slug: string }> }) {
    const {slug} = await params;
    const service = services.find((item) => item.slug === slug);
    if (!service) notFound();
    return pageMetadata(`Dịch vụ: ${service.title}`, service.text, `/services/${slug}`)
}

export default async function ServiceDetail({params}: { params: Promise<{ slug: string }> }) {
    const {slug} = await params;
    const service = services.find((item) => item.slug === slug);
    if (!service) notFound();
    const detail = serviceDetails[slug];
    return <PublicPage eyebrow="Loại yêu cầu được hỗ trợ" title={service.title} intro={service.text}
                       scene={serviceScenes[slug]}>
        <div className="page-copy">
            <p>Đã hỗ trợ gửi yêu cầu cho loại nhiệm vụ này. Đây không phải danh sách thiết bị sẵn có. Xem danh mục dịch
                vụ đang hoạt động sau khi đăng nhập.</p>
            <h2>Đối tượng phù hợp</h2><p>{detail.audience}</p>
            <h2>Gợi ý mô tả yêu cầu</h2><p>{detail.example}</p>
            <h2>Kết quả dự kiến</h2><p>{detail.output}</p>
            <h2>Cách gửi yêu cầu</h2><p>Đăng nhập tài khoản, chọn dịch vụ đang hoạt động, tạo bản nháp nhiệm vụ rồi gửi
            để đội vận hành xem xét.</p>
            <CustomerCta/>
        </div>
    </PublicPage>;
}
