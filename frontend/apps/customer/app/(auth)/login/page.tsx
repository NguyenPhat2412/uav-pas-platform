import { PortalAuthLayout } from '@uav/ui';
import { LoginForm } from '@/features/auth/components/AuthForms';

export default function LoginPage() {
  return <PortalAuthLayout portal="Cổng khách hàng" title="Kết nối yêu cầu. Theo dõi từng nhiệm vụ." description="Đặt dịch vụ UAV, theo dõi tiến độ và nhận kết quả trong cùng một không gian." homeUrl={process.env.NEXT_PUBLIC_AUTH_ORIGIN || "http://localhost:3100"}>
    <h2>Chào mừng trở lại</h2>
    <p>Đăng nhập để quản lý dịch vụ và nhiệm vụ của bạn.</p>
    <LoginForm />
  </PortalAuthLayout>;
}
