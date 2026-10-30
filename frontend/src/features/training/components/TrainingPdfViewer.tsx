'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import type {KeyboardEvent as ReactKeyboardEvent, ReactNode, RefObject} from 'react';
import type {PDFDocumentProxy, RenderTask} from 'pdfjs-dist';
import {ChevronLeft, ChevronRight, LoaderCircle, Maximize2, Minimize2, MoveHorizontal, ZoomIn, ZoomOut} from 'lucide-react';
import {clampPdfPage, nextPdfZoom, PDF_ZOOM_STEPS} from '@/features/training/utils/course-helpers';

type PdfJs = typeof import('pdfjs-dist');

let pdfjsPromise: Promise<PdfJs> | null = null;

/**
 * pdf.js, fetched on first use only so it stays out of every other bundle. The legacy build carries
 * the polyfills older Safari and Android browsers need. The worker is referenced with
 * `new URL(…, import.meta.url)`, which both Turbopack and webpack turn into a hashed file under
 * /_next/static, so it loads from our own origin in dev and in production builds alike.
 */
function loadPdfjs(): Promise<PdfJs> {
    pdfjsPromise ??= import('pdfjs-dist/legacy/build/pdf.mjs')
        .then(pdfjs => {
            pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString();
            return pdfjs;
        })
        .catch(error => {
            pdfjsPromise = null;
            throw error;
        });
    return pdfjsPromise;
}

const PAGE_STORAGE_PREFIX = 'uav-training-pdf-page:';

function readStoredPage(storageKey: string, pageCount: number): number | null {
    try {
        return clampPdfPage(window.localStorage.getItem(PAGE_STORAGE_PREFIX + storageKey), pageCount);
    } catch {
        return null;
    }
}

function storePage(storageKey: string, page: number) {
    try {
        window.localStorage.setItem(PAGE_STORAGE_PREFIX + storageKey, String(page));
    } catch {
        // Private mode or blocked storage: the reader simply starts at page 1 next time.
    }
}

/** Browsers refuse canvases much past ~16 megapixels (iOS especially); stay under that when zoomed. */
const MAX_CANVAS_PIXELS = 16_000_000;
/** Horizontal padding around the page inside the stage (p-3 on both sides). */
const STAGE_PADDING = 24;

function isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

const toolButton = 'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-foreground hover:bg-surface-variant disabled:pointer-events-none disabled:opacity-30';

/**
 * A PDF read one page at a time with pdf.js: the page is drawn on a canvas fitted to the stage width
 * (sharp on high-DPI screens), with previous/next, "Trang x / y" and a page box, ←/→ (and PageUp/
 * PageDown, Home/End) while the reader has focus, zoom in/out and fit width, fullscreen and a lazy
 * thumbnail strip. The last page read is remembered per `storageKey`. If pdf.js cannot open the file
 * (the signed URL blocked by CORS, a broken file…) `fallback` is shown instead. `onReachedEnd` fires
 * once when the reader turns to the last page.
 *
 * Mount it with `key={lessonId}`: the URL is read once, so a refreshed signed URL does not reload it.
 */
export function PdfPageViewer({url, title, storageKey, completed, onReachedEnd, fallback}: {
    url: string;
    title: string;
    storageKey: string;
    completed: boolean;
    onReachedEnd?: () => void;
    fallback: ReactNode;
}) {
    const [source] = useState(url);
    const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
    const [failed, setFailed] = useState(false);
    const [page, setPage] = useState(1);
    const [pageDraft, setPageDraft] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const [stageWidth, setStageWidth] = useState(0);
    const [rendering, setRendering] = useState(true);
    const [pageError, setPageError] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const frameRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const reportedEnd = useRef(completed);
    const onReachedEndRef = useRef(onReachedEnd);
    const pageCount = doc?.numPages ?? 0;

    useEffect(() => {
        onReachedEndRef.current = onReachedEnd;
        if (completed) reportedEnd.current = true;
    }, [onReachedEnd, completed]);

    // Open the document once; reopen where the reader left off.
    useEffect(() => {
        let cancelled = false;
        let destroy: (() => Promise<void>) | null = null;
        loadPdfjs()
            .then(pdfjs => {
                if (cancelled) return null;
                const task = pdfjs.getDocument({url: source, withCredentials: false});
                destroy = () => task.destroy();
                return task.promise;
            })
            .then(pdf => {
                if (cancelled || !pdf) return;
                setPage(readStoredPage(storageKey, pdf.numPages) ?? 1);
                setDoc(pdf);
            })
            .catch(() => {
                if (!cancelled) setFailed(true);
            });
        return () => {
            cancelled = true;
            void destroy?.();
        };
    }, [source, storageKey]);

    useEffect(() => {
        if (doc) storePage(storageKey, page);
    }, [doc, page, storageKey]);

    // Track the stage width so "fit width" follows the layout (sidebar toggled, window resized, fullscreen).
    useEffect(() => {
        const stage = stageRef.current;
        if (!stage || typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(entries => {
            const width = Math.floor(entries[0]?.contentRect.width ?? 0);
            setStageWidth(current => (current === width ? current : width));
        });
        observer.observe(stage);
        return () => observer.disconnect();
    }, [doc]);

    // Draw the current page off-screen, then swap it in, so turning pages does not flash blank.
    useEffect(() => {
        if (!doc || stageWidth <= 0) return;
        let cancelled = false;
        let task: RenderTask | null = null;
        doc.getPage(page)
            .then(pdfPage => {
                if (cancelled) return;
                const natural = pdfPage.getViewport({scale: 1});
                const fit = Math.max(stageWidth - STAGE_PADDING, 100) / natural.width;
                const viewport = pdfPage.getViewport({scale: fit * zoom});
                const pixels = viewport.width * viewport.height;
                const ratio = Math.min(window.devicePixelRatio || 1, Math.sqrt(MAX_CANVAS_PIXELS / Math.max(pixels, 1)));
                const scratch = document.createElement('canvas');
                scratch.width = Math.max(1, Math.floor(viewport.width * ratio));
                scratch.height = Math.max(1, Math.floor(viewport.height * ratio));
                setRendering(true);
                task = pdfPage.render({
                    canvas: scratch,
                    viewport,
                    transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined,
                });
                return task.promise.then(() => {
                    const canvas = canvasRef.current;
                    if (cancelled || !canvas) return;
                    canvas.width = scratch.width;
                    canvas.height = scratch.height;
                    canvas.style.width = `${Math.floor(viewport.width)}px`;
                    canvas.style.height = `${Math.floor(viewport.height)}px`;
                    canvas.getContext('2d')?.drawImage(scratch, 0, 0);
                    // Free the off-screen copy now: iOS Safari caps total canvas memory per page.
                    scratch.width = 0;
                    scratch.height = 0;
                    setPageError(false);
                    setRendering(false);
                });
            })
            .catch(error => {
                if (cancelled || (error instanceof Error && error.name === 'RenderingCancelledException')) return;
                setPageError(true);
                setRendering(false);
            });
        return () => {
            cancelled = true;
            task?.cancel();
        };
    }, [doc, page, zoom, stageWidth]);

    useEffect(() => {
        const onChange = () => setFullscreen(document.fullscreenElement !== null && document.fullscreenElement === frameRef.current);
        document.addEventListener('fullscreenchange', onChange);
        return () => document.removeEventListener('fullscreenchange', onChange);
    }, []);

    const goTo = useCallback((target: number | string | null) => {
        const next = clampPdfPage(target, pageCount);
        setPageDraft(null);
        if (next === null || next === page) return;
        setPage(next);
        stageRef.current?.scrollTo({top: 0});
        if (next === pageCount && pageCount > 1 && !reportedEnd.current) {
            reportedEnd.current = true;
            onReachedEndRef.current?.();
        }
    }, [page, pageCount]);

    const toggleFullscreen = () => {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void frameRef.current?.requestFullscreen?.().catch(() => undefined);
    };

    const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
        if (event.altKey || event.ctrlKey || event.metaKey || isEditableTarget(event.target)) return;
        switch (event.key) {
            case 'ArrowLeft':
            case 'PageUp':
                goTo(page - 1);
                break;
            case 'ArrowRight':
            case 'PageDown':
                goTo(page + 1);
                break;
            case 'Home':
                goTo(1);
                break;
            case 'End':
                goTo(pageCount);
                break;
            case '+':
            case '=':
                setZoom(current => nextPdfZoom(current, 'in'));
                break;
            case '-':
                setZoom(current => nextPdfZoom(current, 'out'));
                break;
            default:
                return;
        }
        event.preventDefault();
    };

    if (failed) return <>{fallback}</>;

    const loading = !doc;
    const minZoom = PDF_ZOOM_STEPS[0];
    const maxZoom = PDF_ZOOM_STEPS[PDF_ZOOM_STEPS.length - 1];

    return (
        <div
            ref={frameRef}
            role="region"
            aria-label={`${title}: trình đọc PDF`}
            aria-roledescription="trình đọc PDF"
            tabIndex={0}
            onKeyDown={onKeyDown}
            className={`flex flex-col overflow-hidden border border-border bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/40 ${
                fullscreen ? 'h-screen' : 'rounded-panel'
            }`}
        >
            <div className="flex flex-wrap items-center gap-1 border-b border-border px-2 py-1.5 text-xs text-foreground">
                <button type="button" className={toolButton} onClick={() => goTo(page - 1)} disabled={loading || page <= 1} aria-label="Trang trước" title="Trang trước (←)">
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <label className="inline-flex items-center gap-1.5 tabular-nums">
                    <span>Trang</span>
                    <input
                        type="text"
                        inputMode="numeric"
                        disabled={loading}
                        value={pageDraft ?? (loading ? '' : String(page))}
                        onChange={event => setPageDraft(event.target.value.replace(/[^\d]/g, ''))}
                        onFocus={event => event.currentTarget.select()}
                        onBlur={() => goTo(pageDraft)}
                        onKeyDown={event => {
                            if (event.key === 'Enter') goTo(pageDraft);
                            else if (event.key === 'Escape') setPageDraft(null);
                        }}
                        aria-label="Số trang"
                        className="h-7 w-11 rounded-control border border-border bg-card px-1 text-center text-xs focus:border-foreground/40 focus:outline-none"
                    />
                    <span aria-live="polite">/ {loading ? '…' : pageCount}</span>
                </label>
                <button type="button" className={toolButton} onClick={() => goTo(page + 1)} disabled={loading || page >= pageCount} aria-label="Trang sau" title="Trang sau (→)">
                    <ChevronRight className="h-4 w-4" />
                </button>

                <span className="mx-1 h-5 w-px bg-border" aria-hidden />
                <button type="button" className={toolButton} onClick={() => setZoom(current => nextPdfZoom(current, 'out'))} disabled={loading || zoom <= minZoom} aria-label="Thu nhỏ" title="Thu nhỏ (-)">
                    <ZoomOut className="h-4 w-4" />
                </button>
                <span className="w-10 text-center text-muted tabular-nums" aria-label="Mức thu phóng">{Math.round(zoom * 100)}%</span>
                <button type="button" className={toolButton} onClick={() => setZoom(current => nextPdfZoom(current, 'in'))} disabled={loading || zoom >= maxZoom} aria-label="Phóng to" title="Phóng to (+)">
                    <ZoomIn className="h-4 w-4" />
                </button>
                <button
                    type="button"
                    onClick={() => setZoom(1)}
                    disabled={loading || zoom === 1}
                    aria-label="Vừa chiều rộng"
                    title="Vừa chiều rộng"
                    className="inline-flex h-8 shrink-0 items-center gap-1 rounded-control px-2 font-medium hover:bg-surface-variant disabled:pointer-events-none disabled:opacity-30"
                >
                    <MoveHorizontal className="h-4 w-4" />
                    <span className="hidden sm:inline">Vừa chiều rộng</span>
                </button>

                <button
                    type="button"
                    className={`${toolButton} ml-auto`}
                    onClick={toggleFullscreen}
                    aria-label={fullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
                    title={fullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
                >
                    {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
            </div>

            <div
                ref={stageRef}
                className={`relative overflow-auto bg-slate-100 [scrollbar-gutter:stable] ${fullscreen ? 'min-h-0 flex-1' : 'h-[75vh]'}`}
            >
                <div className="flex min-w-fit justify-center p-3">
                    <canvas
                        ref={canvasRef}
                        role="img"
                        aria-label={pageCount ? `${title}, trang ${page}/${pageCount}` : title}
                        className={`block bg-white shadow-sm ${loading || pageError ? 'invisible h-0' : ''}`}
                    />
                </div>
                {pageError && (
                    <p className="absolute inset-x-0 top-1/3 px-6 text-center text-sm text-muted" role="alert">
                        Không hiển thị được trang này. Thử mở trong tab mới hoặc tải xuống.
                    </p>
                )}
                {(loading || rendering) && !pageError && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center" role="status" aria-label={loading ? 'Đang mở tài liệu' : 'Đang hiển thị trang'}>
                        <LoaderCircle className="h-6 w-6 animate-spin text-slate-400" />
                    </div>
                )}
            </div>

            {doc && pageCount > 1 && <PdfThumbnailStrip doc={doc} page={page} onSelect={goTo} />}
        </div>
    );
}

/** Page thumbnails, each drawn the first time it scrolls into view. */
function PdfThumbnailStrip({doc, page, onSelect}: {doc: PDFDocumentProxy; page: number; onSelect: (page: number) => void}) {
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
                    <span className="absolute right-0.5 bottom-0.5 rounded-badge bg-white/90 px-1 text-[10px] text-muted tabular-nums">{index + 1}</span>
                </button>
            ))}
        </div>
    );
}

const THUMB_WIDTH = 56;

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
