import { UavPhoto, serviceScenes } from '../../../src/components/uav-photo';
import { pageMetadata } from '../../../src/content/metadata';
import { notFound } from 'next/navigation';
import { serviceDetails } from '../../../src/content/service-details';
import { services } from '../../../src/content/site-content';
import { PublicPage, CustomerCta } from '../../../src/components/public-page';
export function generateStaticParams(){return services.map(({slug})=>({slug}))}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const service=services.find((item)=>item.slug===slug);if(!service)notFound();return pageMetadata(`Dịch vụ: ${service.title}`,service.text,`/services/${slug}`)}
export default async function ServiceDetail({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const service=services.find((item)=>item.slug===slug);
  if(!service)notFound();
  const detail=serviceDetails[slug];
  return <PublicPage eyebrow="Loại yêu cầu được hỗ trợ" title={service.title} intro={service.text}><UavPhoto scene={serviceScenes[slug]} className="service-detail-photo" /><div className="page-copy">
    <p>Đã hỗ trợ gửi yêu cầu cho loại nhiệm vụ này. Đây không phải danh sách thiết bị sẵn có. Xem danh mục dịch vụ đang hoạt động tại cổng khách hàng.</p>
    <h2>Đối tượng phù hợp</h2><p>{detail.audience}</p>
    <h2>Gợi ý mô tả yêu cầu</h2><p>{detail.example}</p>
    <h2>Kết quả dự kiến</h2><p>{detail.output}</p>
    <h2>Cách gửi yêu cầu</h2><p>Đăng nhập cổng khách hàng, chọn dịch vụ đang hoạt động, tạo bản nháp nhiệm vụ rồi gửi để đội vận hành xem xét.</p>
    <CustomerCta/>
  </div></PublicPage>;
}
