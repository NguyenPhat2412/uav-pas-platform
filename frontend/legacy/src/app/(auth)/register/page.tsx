import { PortalAuthLayout } from '@/components/brand/PortalAuthLayout';
import { RegisterForm } from '@/features/auth/components/RegisterForm';

export const metadata = {
  title: 'Đăng ký | UAV PAS Platform',
  description: 'Tạo tài khoản UAV PAS Platform',
};

export default function RegisterPage() {
  return <PortalAuthLayout portal="Không gian làm việc" title="Kết nối toàn bộ hành trình nhiệm vụ." description="Theo dõi yêu cầu, điều phối nguồn lực và quản lý kết quả UAV trong cùng một hệ thống." homeUrl={process.env.NEXT_PUBLIC_AUTH_ORIGIN || "http://localhost:3100"}>
    <RegisterForm />
  </PortalAuthLayout>;
}
