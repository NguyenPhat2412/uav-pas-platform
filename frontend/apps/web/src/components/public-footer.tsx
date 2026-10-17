import Link from 'next/link';
import { customerUrl } from '../content/site-content';

export function PublicFooter() {
  return <footer className="site-footer"><div className="shell footer-grid">
    <div><Link className="brand" href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><img src="/vju-logo.svg" alt="Biểu trưng Đại học Việt Nhật" width={30} height={30} style={{ width: 30, height: 30, objectFit: 'contain' }} /><span>UAV PAS</span></Link><p className="footer-note">Nền tảng kết nối yêu cầu dịch vụ với hoạt động điều phối nhiệm vụ UAV.</p></div>
    <div><h2>Khám phá</h2><Link href="/services">Dịch vụ</Link><Link href="/solutions">Giải pháp</Link><Link href="/how-it-works">Quy trình thực hiện</Link><Link href="/faq">Câu hỏi thường gặp</Link></div>
    <div><h2>Tiếp tục</h2><a href={`${customerUrl}/login`}>Cổng khách hàng</a><a href={`${customerUrl}/register`}>Tạo tài khoản</a><Link href="/contact">Liên hệ</Link></div>
    <div><h2>Thông tin pháp lý</h2><Link href="/privacy">Quyền riêng tư</Link><Link href="/terms">Điều khoản</Link><p className="footer-note">Bảng giá và thông tin liên hệ sẽ được công bố sau khi phê duyệt.</p></div>
  </div><div className="shell footer-bottom"><span>© {new Date().getFullYear()} UAV PAS</span><span>Các tính năng được ghi rõ trạng thái sẵn sàng.</span></div></footer>;
}
