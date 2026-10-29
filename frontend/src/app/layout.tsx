import type {ReactNode} from 'react';
import {Inter} from 'next/font/google';
import '@/styles/globals.css';

// Inter (variable, with Vietnamese glyphs) is bundled at build time, so browsers never call Google Fonts.
const inter = Inter({
    variable: '--font-inter',
    subsets: ['latin', 'vietnamese'],
    style: ['normal', 'italic'],
    display: 'swap',
});

export default function RootLayout({children}: { children: ReactNode }) {
    return (
        <html lang="vi" className={inter.variable}>
            <body className="min-h-screen bg-background font-sans text-sm leading-relaxed text-foreground antialiased">
                {children}
            </body>
        </html>
    );
}
