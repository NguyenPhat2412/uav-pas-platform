'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

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
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % SLIDES.length);
    }, 4500);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Background slide images with auto crossfade and scale animation */}
      {SLIDES.map((slide, index) => {
        const isActive = index === currentIndex;
        return (
          <div
            key={slide.src}
            className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
              isActive ? 'opacity-100 scale-105' : 'opacity-0 scale-100'
            }`}
          >
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              priority={index === 0}
              sizes="100vw"
              className="object-cover object-center w-full h-full"
            />
          </div>
        );
      })}

      {/* Cinematic dark overlay gradient for readability */}
      <div className="absolute inset-0 z-10 bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-slate-900/40" />

      {/* Slide pagination dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 pointer-events-auto">
        {SLIDES.map((_, index) => (
          <button
            key={index}
            type="button"
            aria-label={`Chuyển tới ảnh ${index + 1}`}
            className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
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
