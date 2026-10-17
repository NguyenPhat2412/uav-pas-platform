import { PortalAuthLayout } from '@uav/ui';
import { RegisterForm } from '@/features/auth/components/AuthForms';

export default function RegisterPage() {
  return <PortalAuthLayout portal="Cổng khách hàng" title="Bắt đầu hành trình nhiệm vụ của bạn." description="Tạo tài khoản để lựa chọn dịch vụ UAV, gửi yêu cầu và kết nối với đội ngũ vận hành." homeUrl={process.env.NEXT_PUBLIC_AUTH_ORIGIN || "http://localhost:3100"}>
    <h2>Tạo tài khoản</h2>
    <p>Đăng ký để bắt đầu đặt dịch vụ UAV.</p>
    <RegisterForm />
  </PortalAuthLayout>;
}
