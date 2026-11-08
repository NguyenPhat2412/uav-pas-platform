'use client';

import {useEffect, useRef, useState} from 'react';
import type {RefObject} from 'react';
import type {PDFDocumentProxy, RenderTask} from 'pdfjs-dist';
import {
    BookOpen,
    ChevronLeft,
    ChevronRight,
    FileText,
    LayoutGrid,
    Maximize2,
    Minimize2,
    MoveHorizontal,
    ZoomIn,
    ZoomOut,
} from 'lucide-react';
import {Button, Input} from '@/components/ui';
import {nextPdfZoom, PDF_ZOOM_STEPS, pdfPageStep, pdfSpreadLabel} from '@/utils/training/course-helpers';
import {THUMB_WIDTH} from '@/components/training/training-pdf-helpers';

const iconBtnClass = 'h-8 w-8 shrink-0 px-0';

export interface TrainingPdfToolbarProps {
    loading: boolean;
    page: number;
    pageCount: number;
    spread: readonly number[];
    pageDraft: string | null;
    zoom: number;
    fullscreen: boolean;
    bookMode: boolean;
    canBookMode: boolean;
    showThumbnails: boolean;
    onPageDraftChange: (draft: string | null) => void;
    onGoTo: (target: number | string | null) => void;
    onZoomChange: (updater: (current: number) => number) => void;
    onToggleBookMode: () => void;
    onToggleThumbnails: () => void;
    onToggleFullscreen: () => void;
}

export function TrainingPdfToolbar({
    loading,
    page,
    pageCount,
    spread,
    pageDraft,
    zoom,
    fullscreen,
    bookMode,
    canBookMode,
    showThumbnails,
    onPageDraftChange,
    onGoTo,
    onZoomChange,
    onToggleBookMode,
    onToggleThumbnails,
    onToggleFullscreen,
}: TrainingPdfToolbarProps) {
    const minZoom = PDF_ZOOM_STEPS[0];
    const maxZoom = PDF_ZOOM_STEPS[PDF_ZOOM_STEPS.length - 1];
    const step = pdfPageStep(bookMode && canBookMode, pageCount);
    const firstSpreadPage = spread[0] ?? page;
    const lastSpreadPage = spread[spread.length - 1] ?? page;

    return (
        <div className="flex flex-wrap items-center gap-1 border-b border-border bg-card px-2.5 py-1.5 text-xs text-foreground">
            <Button
                type="button"
                variant="ghost"
                size="sm"
                className={iconBtnClass}
                onClick={() => onGoTo(firstSpreadPage - step)}
                disabled={loading || firstSpreadPage <= 1}
                aria-label="Trang trước"
                title="Lật trang trước (←)"
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <label className="inline-flex items-center gap-1.5 tabular-nums">
                <span>Trang</span>
                <Input
                    type="text"
                    inputMode="numeric"
                    disabled={loading}
                    value={pageDraft ?? (loading ? '' : String(firstSpreadPage))}
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
                <span aria-live="polite">
                    / {loading ? '…' : pageCount}
                    {!loading && spread.length > 1 && (
                        <span className="ml-1 text-[11px] text-muted-foreground">
                            (Mở {pdfSpreadLabel(spread)})
                        </span>
                    )}
                </span>
            </label>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                className={iconBtnClass}
                onClick={() => onGoTo(firstSpreadPage + step)}
                disabled={loading || lastSpreadPage >= pageCount}
                aria-label="Trang sau"
                title="Lật trang sau (→)"
            >
                <ChevronRight className="h-4 w-4" />
            </Button>

            {canBookMode && (
                <>
                    <span className="mx-1 h-5 w-px bg-border" aria-hidden />
                    <Button
                        type="button"
                        variant={bookMode ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={onToggleBookMode}
                        disabled={loading}
                        aria-pressed={bookMode}
                        title={bookMode ? 'Đang mở chế độ Sách 2 trang — bấm để chuyển về 1 trang' : 'Bấm để mở chế độ lật sách 2 trang'}
                        className="h-8 shrink-0 gap-1.5 px-2.5 text-xs"
                    >
                        {bookMode ? <BookOpen className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                        <span>{bookMode ? 'Sách 2 trang' : '1 trang'}</span>
                    </Button>
                </>
            )}

            {pageCount > 1 && (
                <Button
                    type="button"
                    variant={showThumbnails ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={onToggleThumbnails}
                    disabled={loading}
                    aria-pressed={showThumbnails}
                    title="Hiện hoặc ẩn thanh mục lục trang thu nhỏ"
                    className="h-8 shrink-0 gap-1.5 px-2.5 text-xs"
                >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span className="hidden md:inline">Mục lục trang</span>
                </Button>
            )}

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
                aria-label="Vừa trang"
                title="Vừa trọn trang trên màn hình"
                className="h-8 shrink-0 px-2"
            >
                <MoveHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">Vừa trang</span>
            </Button>

            <span
                className="ml-auto hidden items-center rounded-badge border border-border bg-slate-50 px-2 py-0.5 text-[11px] text-muted-foreground xl:inline-flex"
                title="Chỉ tải các trang đang mở (HTTP Range 64KB), không cần tải hết toàn bộ tệp PDF"
            >
                Tải theo trang (On-demand)
            </span>

            <Button
                type="button"
                variant="ghost"
                size="sm"
                className={`${iconBtnClass} xl:ml-1 ml-auto`}
                onClick={onToggleFullscreen}
                aria-label={fullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
                title={fullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
            >
                {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
        </div>
    );
}

/** Page thumbnails, each drawn only when the user opens the strip and scrolls it into view. */
export function TrainingPdfThumbnailStrip({
    doc,
    page,
    spread,
    onSelect,
}: {
    doc: PDFDocumentProxy;
    page: number;
    spread: readonly number[];
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
            {Array.from({length: doc.numPages}, (_, index) => {
                const pageNumber = index + 1;
                const active = spread.includes(pageNumber);
                return (
                    <button
                        key={index}
                        ref={element => {
                            thumbRefs.current[index] = element;
                        }}
                        type="button"
                        onClick={() => onSelect(pageNumber)}
                        aria-label={`Trang ${pageNumber}`}
                        aria-current={pageNumber === page ? 'page' : undefined}
                        className={`relative flex h-20 w-14 shrink-0 items-center justify-center overflow-hidden rounded-badge border bg-slate-50 ${
                            active ? 'border-foreground ring-1 ring-foreground' : 'border-border opacity-70 hover:opacity-100'
                        }`}
                    >
                        <PdfThumbnail doc={doc} pageNumber={pageNumber} root={stripRef} />
                        <span className="absolute right-0.5 bottom-0.5 rounded-badge bg-white/90 px-1 text-[10px] text-muted tabular-nums">
                            {pageNumber}
                        </span>
                    </button>
                );
            })}
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
        }, {root: root.current, rootMargin: '0px 120px'});
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
