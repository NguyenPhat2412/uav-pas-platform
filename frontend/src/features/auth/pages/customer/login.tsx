import { PortalAuthLayout } from "@/components/shared";
import { LoginForm } from "@/features/auth/components/customer/AuthForms";

export default function LoginPage() {
  return <PortalAuthLayout title="Kết nối yêu cầu. Theo dõi từng nhiệm vụ." description="Đặt dịch vụ UAV, theo dõi tiến độ và nhận kết quả trong cùng một không gian." homeUrl={"/"}>
    <h2>Chào mừng trở lại</h2>
    <p>Đăng nhập để quản lý dịch vụ và nhiệm vụ của bạn.</p>
    <LoginForm />
  </PortalAuthLayout>;
}
