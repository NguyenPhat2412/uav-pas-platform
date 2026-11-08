'use client';

import {useEffect, useRef, useState} from 'react';
import type {RefObject} from 'react';
import type {PDFDocumentProxy, RenderTask} from 'pdfjs-dist';
import {ChevronLeft, ChevronRight, Maximize2, Minimize2, MoveHorizontal, ZoomIn, ZoomOut} from 'lucide-react';
import {Button, Input} from '@/components/ui';
import {nextPdfZoom, PDF_ZOOM_STEPS} from '@/utils/training/course-helpers';
import {THUMB_WIDTH} from '@/components/training/training-pdf-helpers';

const iconBtnClass = 'h-8 w-8 shrink-0 px-0';

export interface TrainingPdfToolbarProps {
    loading: boolean;
    page: number;
    pageCount: number;
    pageDraft: string | null;
    zoom: number;
    fullscreen: boolean;
    onPageDraftChange: (draft: string | null) => void;
    onGoTo: (target: number | string | null) => void;
    onZoomChange: (updater: (current: number) => number) => void;
    onToggleFullscreen: () => void;
}

export function TrainingPdfToolbar({
    loading,
    page,
    pageCount,
    pageDraft,
    zoom,
    fullscreen,
    onPageDraftChange,
    onGoTo,
    onZoomChange,
    onToggleFullscreen,
}: TrainingPdfToolbarProps) {
    const minZoom = PDF_ZOOM_STEPS[0];
    const maxZoom = PDF_ZOOM_STEPS[PDF_ZOOM_STEPS.length - 1];

    return (
        <div className="flex flex-wrap items-center gap-1 border-b border-border px-2 py-1.5 text-xs text-foreground">
            <Button
                type="button"
                variant="ghost"
                size="sm"
                className={iconBtnClass}
                onClick={() => onGoTo(page - 1)}
                disabled={loading || page <= 1}
                aria-label="Trang trước"
                title="Trang trước (←)"
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <label className="inline-flex items-center gap-1.5 tabular-nums">
                <span>Trang</span>
                <Input
                    type="text"
                    inputMode="numeric"
                    disabled={loading}
                    value={pageDraft ?? (loading ? '' : String(page))}
                    onChange={event => onPageDraftChange(event.target.value.replace(/[^\d]/g, ''))}
                    onFocus={event => event.currentTarget.select()}
                    onBlur={() => onGoTo(pageDraft)}
                    onKeyDown={event => {
                        if (event.key === 'Enter') onGoTo(pageDraft);
                        else if (event.key === 'Escape') onPageDraftChange(null);
                    }}
                    aria-label="Số trang"
                    className="h-7 w-11 px-1 text-center text-xs"
                />
                <span aria-live="polite">/ {loading ? '…' : pageCount}</span>
            </label>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                className={iconBtnClass}
                onClick={() => onGoTo(page + 1)}
                disabled={loading || page >= pageCount}
                aria-label="Trang sau"
                title="Trang sau (→)"
            >
                <ChevronRight className="h-4 w-4" />
            </Button>

            <span className="mx-1 h-5 w-px bg-border" aria-hidden />
            <Button
                type="button"
                variant="ghost"
                size="sm"
                className={iconBtnClass}
                onClick={() => onZoomChange(current => nextPdfZoom(current, 'out'))}
                disabled={loading || zoom <= minZoom}
                aria-label="Thu nhỏ"
                title="Thu nhỏ (-)"
            >
                <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="w-10 text-center text-muted tabular-nums" aria-label="Mức thu phóng">
                {Math.round(zoom * 100)}%
            </span>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                className={iconBtnClass}
                onClick={() => onZoomChange(current => nextPdfZoom(current, 'in'))}
                disabled={loading || zoom >= maxZoom}
                aria-label="Phóng to"
                title="Phóng to (+)"
            >
                <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onZoomChange(() => 1)}
                disabled={loading || zoom === 1}
                aria-label="Vừa chiều rộng"
                title="Vừa chiều rộng"
                className="h-8 shrink-0 px-2"
            >
                <MoveHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">Vừa chiều rộng</span>
            </Button>

            <Button
                type="button"
                variant="ghost"
                size="sm"
                className={`${iconBtnClass} ml-auto`}
                onClick={onToggleFullscreen}
                aria-label={fullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
                title={fullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
            >
                {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
        </div>
    );
}

/** Page thumbnails, each drawn the first time it scrolls into view. */
export function TrainingPdfThumbnailStrip({
    doc,
    page,
    onSelect,
}: {
    doc: PDFDocumentProxy;
    page: number;
    onSelect: (page: number) => void;
}) {
    const stripRef = useRef<HTMLDivElement>(null);
    const thumbRefs = useRef<Array<HTMLButtonElement | null>>([]);

    // Keep the current page's thumbnail in view by scrolling the strip only (scrollIntoView would move the page).
    useEffect(() => {
        const strip = stripRef.current;
        const thumb = thumbRefs.current[page - 1];
        if (strip && thumb && (thumb.offsetLeft < strip.scrollLeft || thumb.offsetLeft + thumb.offsetWidth > strip.scrollLeft + strip.clientWidth)) {
            strip.scrollTo({left: thumb.offsetLeft - (strip.clientWidth - thumb.offsetWidth) / 2, behavior: 'smooth'});
        }
    }, [page]);

    return (
        <div ref={stripRef} className="relative flex gap-2 overflow-x-auto border-t border-border bg-white px-3 py-2" aria-label="Các trang">
            {Array.from({length: doc.numPages}, (_, index) => (
                <button
                    key={index}
                    ref={element => {
                        thumbRefs.current[index] = element;
                    }}
                    type="button"
                    onClick={() => onSelect(index + 1)}
                    aria-label={`Trang ${index + 1}`}
                    aria-current={index + 1 === page ? 'page' : undefined}
                    className={`relative flex h-20 w-14 shrink-0 items-center justify-center overflow-hidden rounded-badge border bg-slate-50 ${
                        index + 1 === page ? 'border-foreground ring-1 ring-foreground' : 'border-border opacity-70 hover:opacity-100'
                    }`}
                >
                    <PdfThumbnail doc={doc} pageNumber={index + 1} root={stripRef} />
                    <span className="absolute right-0.5 bottom-0.5 rounded-badge bg-white/90 px-1 text-[10px] text-muted tabular-nums">
                        {index + 1}
                    </span>
                </button>
            ))}
        </div>
    );
}

function PdfThumbnail({doc, pageNumber, root}: {doc: PDFDocumentProxy; pageNumber: number; root: RefObject<HTMLDivElement | null>}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || visible) return;
        if (typeof IntersectionObserver === 'undefined') {
            const timer = window.setTimeout(() => setVisible(true), 0);
            return () => window.clearTimeout(timer);
        }
        const observer = new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting)) setVisible(true);
        }, {root: root.current, rootMargin: '0px 200px'});
        observer.observe(canvas);
        return () => observer.disconnect();
    }, [root, visible]);

    useEffect(() => {
        if (!visible) return;
        let cancelled = false;
        let task: RenderTask | null = null;
        doc.getPage(pageNumber)
            .then(pdfPage => {
                const canvas = canvasRef.current;
                if (cancelled || !canvas) return;
                const natural = pdfPage.getViewport({scale: 1});
                const viewport = pdfPage.getViewport({scale: THUMB_WIDTH / natural.width});
                const ratio = Math.min(window.devicePixelRatio || 1, 2);
                canvas.width = Math.floor(viewport.width * ratio);
                canvas.height = Math.floor(viewport.height * ratio);
                task = pdfPage.render({canvas, viewport, transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined});
                return task.promise;
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
            task?.cancel();
        };
    }, [doc, pageNumber, visible]);

    return <canvas ref={canvasRef} aria-hidden className="block h-auto w-full" />;
}
