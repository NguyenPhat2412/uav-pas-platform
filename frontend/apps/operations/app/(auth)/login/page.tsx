import { PortalAuthLayout } from '@uav/ui';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

export default function LoginPage() {
  return <PortalAuthLayout portal="Cổng vận hành" title="Từ kế hoạch đến nhiệm vụ hoàn tất." description="Kết nối điều phối, nguồn lực và tiến độ nhiệm vụ trong một không gian làm việc thống nhất." homeUrl={process.env.NEXT_PUBLIC_AUTH_ORIGIN || "http://localhost:3100"} tools={<LanguageSwitcher variant="compact" />}>
    <LoginForm redirectTo="/overview" />
  </PortalAuthLayout>;
}
