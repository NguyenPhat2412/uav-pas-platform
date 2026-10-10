import '@uav/design-tokens/styles.css';
import './globals.css';
import { Providers } from './providers';

export const metadata = { title: 'UAV PAS Operations', description: 'Operations workspace for UAV PAS' };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="vi"><body><Providers>{children}</Providers></body></html>;
}
