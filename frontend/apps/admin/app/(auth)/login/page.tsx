import { PortalAuthLayout } from '@uav/ui';
import { LoginForm } from '@/features/auth/components/LoginForm';

export default function Page() {
  return <PortalAuthLayout portal="Cổng quản trị" title="Một hệ thống. Quản trị nhất quán." description="Quản lý tài khoản, phân quyền và theo dõi hoạt động để các đội ngũ phối hợp rõ ràng." homeUrl={process.env.NEXT_PUBLIC_AUTH_ORIGIN || "http://localhost:3100"}>
    <LoginForm />
  </PortalAuthLayout>;
}
