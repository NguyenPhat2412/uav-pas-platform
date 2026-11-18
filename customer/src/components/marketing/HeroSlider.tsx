'use client';

import {useEffect, useState} from 'react';
import Image from 'next/image';
import {useI18n} from '@/providers/I18nContext';

const SLIDES = [
    {
        src: '/images/hero-slides/uav-hero-1.webp',
        alt: 'UAV Khảo sát địa hình chuyên dụng',
    },
    {
        src: '/images/hero-slides/uav-hero-2.webp',
        alt: 'UAV Giám sát nông nghiệp và công nghiệp',
    },
    {
        src: '/images/hero-slides/uav-hero-3.webp',
        alt: 'UAV Điều phối và bay tuần tra',
    },
];

export function HeroSlider() {
    const {t} = useI18n();
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % SLIDES.length);
        }, 4500);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
            {SLIDES.map((slide, index) => {
                const isActive = index === currentIndex;
                return (
                    <div
                        key={slide.src}
                        className={`absolute inset-0 transition-[opacity,transform] duration-1000 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                            isActive ? 'scale-105 opacity-100' : 'scale-100 opacity-0'
                        }`}
                    >
                        <Image
                            src={slide.src}
                            alt={slide.alt}
                            fill
                            priority={index === 0}
                            sizes="100vw"
                            className="h-full w-full object-cover object-center"
                        />
                    </div>
                );
            })}

            <div className="absolute inset-0 z-10 bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-slate-900/40" />

            <div className="pointer-events-auto absolute right-10 bottom-8 z-20 hidden items-center gap-2 sm:flex lg:right-16">
                {SLIDES.map((_, index) => (
                    <button
                        key={index}
                        type="button"
                        aria-label={t('publicSite.header.slideAria', {index: index + 1})}
                        className={`h-1.5 cursor-pointer rounded-full transition-[width,background-color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                            index === currentIndex
                                ? 'w-10 bg-primary shadow-sm shadow-primary'
                                : 'w-6 bg-white/40 hover:bg-white/75'
                        }`}
                        onClick={() => setCurrentIndex(index)}
                    />
                ))}
            </div>
        </div>
    );
}
