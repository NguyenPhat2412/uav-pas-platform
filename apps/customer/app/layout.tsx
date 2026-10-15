import '@uav/design-tokens/styles.css';
import './globals.css';
import { Providers } from './providers';
export const metadata = { title: 'UAV PAS Cổng khách hàng', description: 'Đặt và theo dõi dịch vụ UAV' };
export default function Layout({ children }: { children: React.ReactNode }) { return <html lang="vi"><body><Providers>{children}</Providers></body></html>; }
