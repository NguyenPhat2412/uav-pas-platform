import { PortalAuthLayout } from "@/components/shared";
import { LoginForm } from "@/features/auth/components/operations/LoginForm";
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

export default function LoginPage() {
  return <PortalAuthLayout title="Từ kế hoạch đến nhiệm vụ hoàn tất." description="Kết nối điều phối, nguồn lực và tiến độ nhiệm vụ trong một không gian làm việc thống nhất." homeUrl={"/"} tools={<LanguageSwitcher variant="compact" />}>
    <LoginForm redirectTo="/operations/overview" />
  </PortalAuthLayout>;
}
