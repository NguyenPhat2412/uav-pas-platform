import { PortalAuthLayout } from '@/components/brand/PortalAuthLayout';
import { LoginForm } from '@/features/auth/components/LoginForm';

export const metadata = {
  title: 'Đăng nhập | UAV PAS Platform',
  description: 'Đăng nhập vào hệ thống điều hành bay tự động UAV PAS',
};

export default function LoginPage() {
  return <PortalAuthLayout portal="Không gian làm việc" title="Kết nối toàn bộ hành trình nhiệm vụ." description="Theo dõi yêu cầu, điều phối nguồn lực và quản lý kết quả UAV trong cùng một hệ thống." homeUrl={process.env.NEXT_PUBLIC_AUTH_ORIGIN || "http://localhost:3100"}>
    <LoginForm />
  </PortalAuthLayout>;
}
