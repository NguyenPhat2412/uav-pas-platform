import type {ReactNode} from 'react';
import '@/styles/globals.css';

export default function RootLayout({children}: { children: ReactNode }) {
    return (
        <html lang="vi">
            <body className="min-h-screen bg-background font-sans text-sm leading-relaxed text-foreground antialiased">
                {children}
            </body>
        </html>
    );
}
