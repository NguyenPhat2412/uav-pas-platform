'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

export function ScrollToTopButton() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setVisible(window.scrollY > 320);
        };

        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <button
            type="button"
            onClick={scrollToTop}
            aria-label="Cuộn lên đầu trang"
            title="Lên đầu trang"
            className={`fixed bottom-6 right-6 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-1 ring-white/25 transition-all duration-200 hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                visible
                    ? 'translate-y-0 opacity-100 pointer-events-auto hover:-translate-y-0.5'
                    : 'translate-y-3 opacity-0 pointer-events-none'
            }`}
        >
            <ArrowUp className="h-5 w-5" aria-hidden="true" />
        </button>
    );
}
