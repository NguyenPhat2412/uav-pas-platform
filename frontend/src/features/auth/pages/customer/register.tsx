import { PortalAuthLayout } from "@/components/shared";
import { RegisterForm } from "@/features/auth/components/customer/AuthForms";

export default function RegisterPage() {
  return <PortalAuthLayout title="Bắt đầu hành trình nhiệm vụ của bạn." description="Tạo tài khoản để lựa chọn dịch vụ UAV, gửi yêu cầu và kết nối với đội ngũ vận hành." homeUrl={"/"}>
    <h2>Tạo tài khoản</h2>
    <p>Đăng ký để bắt đầu đặt dịch vụ UAV.</p>
    <RegisterForm />
  </PortalAuthLayout>;
}
