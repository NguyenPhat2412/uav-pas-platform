import { UavPhoto, serviceScenes } from '../../src/components/uav-photo';
import { pageMetadata } from '../../src/content/metadata';
export const metadata = pageMetadata("Dịch vụ UAV", "Tìm hiểu các loại nhiệm vụ được hỗ trợ và xác nhận danh mục đang hoạt động tại cổng khách hàng.", "/services", true);
import Link from 'next/link';
import { services } from '../../src/content/site-content';
import { PublicPage, CustomerCta } from '../../src/components/public-page';
export default function ServicesPage(){return <PublicPage eyebrow="Dịch vụ" title="Chọn dịch vụ phù hợp với nhiệm vụ." intro="Đây là các loại yêu cầu được hỗ trợ, không phải danh sách thiết bị sẵn có. Đăng nhập để xem danh mục đang hoạt động; đội vận hành xác nhận phạm vi và khả năng thực hiện."><div className="detail-grid">{services.map((item)=><Link className="detail-card service-photo-card" href={`/services/${item.slug}`} key={item.slug}><UavPhoto scene={serviceScenes[item.slug]} compact /><span className="status">Đã hỗ trợ gửi yêu cầu</span><h2>{item.title}</h2><p>{item.text}</p><span className="text-link">Xem chi tiết ↗</span></Link>)}</div><CustomerCta/></PublicPage>}
