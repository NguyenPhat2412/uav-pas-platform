import { pageMetadata } from '../../src/content/metadata';
export const metadata = pageMetadata("Liên hệ và yêu cầu dịch vụ", "Gửi yêu cầu qua quy trình tại cổng khách hàng. Trang giới thiệu chưa thiết lập kênh tiếp nhận liên hệ.", "/contact", true);
import { PublicPage, CustomerCta } from '../../src/components/public-page';
export default function ContactPage(){return <PublicPage eyebrow="Liên hệ" title="Bắt đầu từ thông tin nhiệm vụ bạn đã có." intro="Trang này chưa thiết lập địa chỉ liên hệ công khai đã xác minh hoặc kênh tiếp nhận liên hệ."><div className="page-copy"><p>Để gửi yêu cầu dịch vụ, hãy sử dụng cổng khách hàng theo quy trình hiện có. Bạn có thể tìm hiểu thông tin sản phẩm trên các trang giới thiệu và mục câu hỏi thường gặp.</p><CustomerCta/></div></PublicPage>}
