import { pageMetadata } from '../../src/content/metadata';
export const metadata = pageMetadata("Giải pháp UAV", "Tìm hiểu quy trình thuê UAV, kiểm tra từ trên cao và các ứng dụng AI, tìm kiếm cứu nạn dự kiến.", "/solutions", true);
import Link from 'next/link';
import { readinessLabels, solutions } from '../../src/content/site-content';
import { PublicPage } from '../../src/components/public-page';
export default function SolutionsPage(){return <PublicPage eyebrow="Giải pháp" title="Giải pháp cho từng mục tiêu nhiệm vụ." intro="Tìm hiểu quy trình yêu cầu hiện có và ứng dụng dự kiến. Nguồn lực sẵn có và quyền thực hiện nhiệm vụ cần đội vận hành xem xét."><div className="detail-grid">{solutions.map((item)=><Link className="detail-card" href={`/solutions/${item.slug}`} key={item.slug}><span className={`status status-${item.status.toLowerCase().replaceAll(' ', '-')}`}>{item.status==='AVAILABLE'?'Đã hỗ trợ gửi yêu cầu':readinessLabels[item.status]}</span><h2>{item.title}</h2><p>{item.text}</p></Link>)}</div></PublicPage>}
