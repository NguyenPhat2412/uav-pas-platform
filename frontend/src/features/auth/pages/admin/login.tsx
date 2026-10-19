import { PortalAuthLayout } from "@/components/shared";
import { LoginForm } from "@/features/auth/components/admin/LoginForm";

export default function Page() {
  return <PortalAuthLayout title="Một hệ thống. Quản trị nhất quán." description="Quản lý tài khoản, phân quyền và theo dõi hoạt động để các đội ngũ phối hợp rõ ràng." homeUrl={"/"}>
    <LoginForm />
  </PortalAuthLayout>;
}
