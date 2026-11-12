'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {ChevronLeft, ChevronRight, ImageOff, Maximize2, Minimize2} from 'lucide-react';
import {Button} from '@/components/ui';
import type {TrainingLessonSlide} from '@/types/training/training.types';
import {isLastSlide, slideCounter, slideIndexAfter} from '@/utils/training/course-helpers';
import type {SlideMove} from '@/utils/training/course-helpers';
import {isEditableTarget} from '@/components/training/training-pdf-helpers';
import {LessonMediaEmpty, STAGE_FRAME} from '@/components/training/TrainingVideoAndStage';

/**
 * Slides one at a time: prev/next buttons, ←/→ keys, a "3/12" counter, the caption, a thumbnail
 * strip and a fullscreen toggle. `onReachedEnd` fires once when the last slide is shown.
 */
export function SlidesLesson({
    slides,
    title,
    completed,
    onReachedEnd,
}: {
    slides: TrainingLessonSlide[];
    title: string;
    completed: boolean;
    onReachedEnd: () => void;
}) {
    const count = slides.length;
    const [index, setIndex] = useState(0);
    const [fullscreen, setFullscreen] = useState(false);
    const frameRef = useRef<HTMLDivElement>(null);
    const stripRef = useRef<HTMLDivElement>(null);
    const thumbRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const reportedEnd = useRef(completed);
    const onReachedEndRef = useRef(onReachedEnd);

    useEffect(() => {
        onReachedEndRef.current = onReachedEnd;
    }, [onReachedEnd]);

    const go = useCallback((move: SlideMove) => setIndex(current => slideIndexAfter(current, count, move)), [count]);

    useEffect(() => {
        if (isLastSlide(index, count) && !reportedEnd.current) {
            reportedEnd.current = true;
            onReachedEndRef.current();
        }
        // Keep the current thumbnail in view by scrolling the strip only (scrollIntoView would move the page).
        const strip = stripRef.current;
        const thumb = thumbRefs.current[index];
        if (strip && thumb && (thumb.offsetLeft < strip.scrollLeft || thumb.offsetLeft + thumb.offsetWidth > strip.scrollLeft + strip.clientWidth)) {
            strip.scrollTo({left: thumb.offsetLeft - (strip.clientWidth - thumb.offsetWidth) / 2, behavior: 'smooth'});
        }
    }, [index, count]);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || isEditableTarget(event.target)) return;
            if (event.key === 'ArrowLeft') go('prev');
            else if (event.key === 'ArrowRight') go('next');
            else return;
            event.preventDefault();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [go]);

    useEffect(() => {
        const onChange = () => setFullscreen(document.fullscreenElement !== null && document.fullscreenElement === frameRef.current);
        document.addEventListener('fullscreenchange', onChange);
        return () => document.removeEventListener('fullscreenchange', onChange);
    }, []);

    const toggleFullscreen = () => {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void frameRef.current?.requestFullscreen?.().catch(() => undefined);
    };

    if (count === 0) {
        return <LessonMediaEmpty icon={<ImageOff className="h-8 w-8" strokeWidth={1.5} />} title="Bài này chưa có slide" />;
    }

    const slide = slides[Math.min(index, count - 1)];
    const navButton = 'inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#1c1d1f] shadow-sm transition-opacity hover:bg-white disabled:pointer-events-none disabled:opacity-25';

    return (
        <div
            ref={frameRef}
            role="region"
            aria-roledescription="carousel"
            aria-label={title}
            className={`flex flex-col bg-black ${fullscreen ? 'h-screen' : ''}`}
        >
            <div className={`relative w-full ${fullscreen ? 'min-h-0 flex-1' : STAGE_FRAME}`}>
                {slide.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={slide.url} alt={slide.caption || `Slide ${index + 1}`} className="absolute inset-0 h-full w-full object-contain" />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/60">
                        <ImageOff className="h-8 w-8" strokeWidth={1.5} />
                        <span className="text-xs">Ảnh chưa xem được: kho lưu trữ chưa được cấu hình.</span>
                    </div>
                )}
                <button type="button" onClick={() => go('prev')} disabled={index === 0} aria-label="Slide trước" className={`${navButton} absolute top-1/2 left-3 -translate-y-1/2`}>
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => go('next')} disabled={isLastSlide(index, count)} aria-label="Slide tiếp" className={`${navButton} absolute top-1/2 right-3 -translate-y-1/2`}>
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>

            <div className="flex items-center gap-3 border-t border-white/10 bg-[#1c1d1f] px-3 py-2 text-xs text-white/80">
                <span className="shrink-0 font-semibold tabular-nums" aria-live="polite">{slideCounter(index, count)}</span>
                <span className="min-w-0 flex-1 truncate">{slide.caption}</span>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={toggleFullscreen}
                    aria-label={fullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
                    title={fullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
                    className="h-7 w-7 shrink-0 px-0 text-white/80 hover:bg-white/10 hover:text-white"
                >
                    {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
            </div>

            {count > 1 && (
                <div ref={stripRef} className="relative flex gap-2 overflow-x-auto border-t border-white/10 bg-[#1c1d1f] px-3 py-2">
                    {slides.map((item, slideIndex) => (
                        <button
                            key={slideIndex}
                            ref={element => {
                                thumbRefs.current[slideIndex] = element;
                            }}
                            type="button"
                            onClick={() => go(slideIndex)}
                            aria-label={`Slide ${slideIndex + 1}`}
                            aria-current={slideIndex === index ? 'true' : undefined}
                            className={`relative h-12 w-20 shrink-0 overflow-hidden rounded-badge border bg-white/5 ${
                                slideIndex === index ? 'border-white ring-1 ring-white' : 'border-white/20 opacity-60 hover:opacity-100'
                            }`}
                        >
                            {item.url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={item.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                            ) : (
                                <span className="text-[11px] text-white/60">{slideIndex + 1}</span>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
