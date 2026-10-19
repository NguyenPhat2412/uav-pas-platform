import "@/styles/styles.css";
import "@/styles/customer/globals.css";
import "@/styles/portal.css";
import "@/styles/consistency.css";
import { PortalProviders } from '@/providers/PortalProviders';
export const metadata = { title: 'UAV PAS · Tài khoản', description: 'Đặt và theo dõi dịch vụ UAV' };
export default function Layout({ children }: { children: React.ReactNode }) { return <html lang="vi"><body className="uav-portal"><PortalProviders area="customer">{children}</PortalProviders></body></html>; }
