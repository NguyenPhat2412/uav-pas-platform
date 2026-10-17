import { pageMetadata } from '../../src/content/metadata';
export const metadata = pageMetadata("Quy trình thực hiện", "Theo dõi hành trình yêu cầu UAV từ tìm hiểu dịch vụ, xem xét bởi đội vận hành đến cập nhật tiến độ.", "/how-it-works", true);
import { steps } from '../../src/content/site-content';
import { PublicPage, CustomerCta } from '../../src/components/public-page';
export default function HowItWorksPage(){return <PublicPage eyebrow="Quy trình thực hiện" title="Yêu cầu được xem xét trước khi triển khai nhiệm vụ." intro="Tìm hiểu dịch vụ, cung cấp yêu cầu và để đội vận hành điều phối bước tiếp theo."><ol className="steps">{steps.map((step)=><li key={step.number}><span>{step.number}</span><div><h3>{step.title}</h3><p>{step.text}</p></div></li>)}</ol><CustomerCta/></PublicPage>}
