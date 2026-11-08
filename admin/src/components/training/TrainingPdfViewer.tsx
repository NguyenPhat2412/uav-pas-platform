'use client';

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import type {KeyboardEvent as ReactKeyboardEvent, ReactNode} from 'react';
import type {PDFDocumentProxy, RenderTask} from 'pdfjs-dist';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import {Spinner} from '@/components/ui';
import {
    clampPdfPage,
    nextPdfZoom,
    pdfBookSpread,
    pdfPageStep,
    pdfSpreadLabel,
} from '@/utils/training/course-helpers';
import {
    BOOK_SPINE_GAP,
    isEditableTarget,
    loadPdfjs,
    MAX_CANVAS_PIXELS,
    PDF_RANGE_CHUNK_SIZE,
    readStoredPage,
    resolvePdfDocumentUrl,
    STAGE_PADDING,
    storePage,
} from '@/components/training/training-pdf-helpers';
import {TrainingPdfThumbnailStrip, TrainingPdfToolbar} from '@/components/training/TrainingPdfToolbar';

function drawPdfPageOffscreen(
    doc: PDFDocumentProxy,
    pageNum: number,
    targetCanvas: HTMLCanvasElement | null,
    availWidth: number,
    availHeight: number,
    zoom: number,
    tasksOut: RenderTask[],
    isCancelled: () => boolean,
): Promise<void> {
    if (!targetCanvas) return Promise.resolve();
    return doc.getPage(pageNum).then(pdfPage => {
        if (isCancelled()) return;
        const natural = pdfPage.getViewport({scale: 1});
        // Fit both width and height at zoom=1 so the entire page is visible top-to-bottom without clipping.
        const fit = Math.min(
            Math.max(availWidth, 120) / natural.width,
            Math.max(availHeight, 360) / natural.height,
        );
        const viewport = pdfPage.getViewport({scale: fit * zoom});
        const pixels = viewport.width * viewport.height;
        const ratio = Math.min(
            window.devicePixelRatio || 1,
            Math.sqrt(MAX_CANVAS_PIXELS / Math.max(pixels, 1)),
        );
        const scratch = document.createElement('canvas');
        scratch.width = Math.max(1, Math.floor(viewport.width * ratio));
        scratch.height = Math.max(1, Math.floor(viewport.height * ratio));
        const renderTask = pdfPage.render({
            canvas: scratch,
            viewport,
            transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined,
        });
        tasksOut.push(renderTask);
        return renderTask.promise.then(() => {
            if (isCancelled()) return;
            targetCanvas.width = scratch.width;
            targetCanvas.height = scratch.height;
            targetCanvas.style.width = `${Math.floor(viewport.width)}px`;
            targetCanvas.style.height = `${Math.floor(viewport.height)}px`;
            targetCanvas.getContext('2d')?.drawImage(scratch, 0, 0);
            // Free the off-screen copy right away: iOS Safari caps total canvas memory per page.
            scratch.width = 0;
            scratch.height = 0;
        });
    });
}

/**
 * Interactive book-style PDF reader powered by pdf.js with on-demand HTTP Range streaming (`64 KB`
 * chunks, `disableAutoFetch: true`):
 * - Opens multi-page PDFs as a 2-page open book spread (or 1-page mode via toolbar toggle).
 * - Fits the entire page top-to-bottom within the viewport at 100% zoom so the bottom of the PDF is
 *   never clipped off.
 * - Animates page turns like flipping a book (`turnDirection`), with clickable left/right book edges
 *   and keyboard navigation (`←`/`→`, `PageUp`/`PageDown`, `Home`/`End`).
 * - Streams only the current spread and prefetches the immediate next page on demand.
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
    const [bookMode, setBookMode] = useState(true);
    const [showThumbnails, setShowThumbnails] = useState(false);
    const [turnDirection, setTurnDirection] = useState<'next' | 'prev' | null>(null);
    const [stageWidth, setStageWidth] = useState(0);
    const [stageHeight, setStageHeight] = useState(0);
    const [rendering, setRendering] = useState(true);
    const [pageError, setPageError] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const frameRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const leftCanvasRef = useRef<HTMLCanvasElement>(null);
    const rightCanvasRef = useRef<HTMLCanvasElement>(null);
    const turnTimerRef = useRef<number | null>(null);
    const reportedEnd = useRef(completed);
    const onReachedEndRef = useRef(onReachedEnd);
    const pageCount = doc?.numPages ?? 0;

    const canBookMode = pageCount > 1 && (stageWidth === 0 || stageWidth >= 680);
    const effectiveBookMode = bookMode && canBookMode;
    const spread = useMemo(
        () => pdfBookSpread(page, pageCount, effectiveBookMode),
        [page, pageCount, effectiveBookMode],
    );
    const step = pdfPageStep(effectiveBookMode, pageCount);

    useEffect(() => {
        onReachedEndRef.current = onReachedEnd;
        if (completed) reportedEnd.current = true;
    }, [onReachedEnd, completed]);

    useEffect(() => {
        return () => {
            if (turnTimerRef.current !== null) window.clearTimeout(turnTimerRef.current);
        };
    }, []);

    // Open the document once with on-demand range streaming; reopen where the reader left off.
    useEffect(() => {
        let cancelled = false;
        let destroy: (() => Promise<void>) | null = null;
        const proxiedUrl = resolvePdfDocumentUrl(source);

        loadPdfjs()
            .then(async pdfjs => {
                if (cancelled) return null;
                const openWithUrl = (targetUrl: string) => {
                    const task = pdfjs.getDocument({
                        url: targetUrl,
                        withCredentials: false,
                        disableAutoFetch: true,
                        disableStream: false,
                        rangeChunkSize: PDF_RANGE_CHUNK_SIZE,
                    });
                    destroy = () => task.destroy();
                    return task.promise;
                };
                try {
                    return await openWithUrl(proxiedUrl);
                } catch (firstErr) {
                    if (cancelled || proxiedUrl === source) throw firstErr;
                    return await openWithUrl(source);
                }
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

    // Track the stage dimensions so the book spread fits both width and viewport height cleanly.
    useEffect(() => {
        const stage = stageRef.current;
        if (!stage || typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(entries => {
            const rect = entries[0]?.contentRect;
            const width = Math.floor(rect?.width ?? 0);
            const height = Math.floor(rect?.height ?? 0);
            setStageWidth(current => (current === width ? current : width));
            setStageHeight(current => (current === height ? current : height));
        });
        observer.observe(stage);
        return () => observer.disconnect();
    }, [doc]);

    // Draw the current page or 2-page book spread off-screen, then swap it in, and warm up the next page.
    useEffect(() => {
        if (!doc || stageWidth <= 0 || spread.length === 0) return;
        let cancelled = false;
        const tasks: RenderTask[] = [];
        const isCancelled = () => cancelled;

        const twoPage = spread.length === 2;
        const availWidth = twoPage
            ? Math.max((stageWidth - STAGE_PADDING - BOOK_SPINE_GAP) / 2, 140)
            : Math.max(stageWidth - STAGE_PADDING, 180);
        const viewportH = typeof window !== 'undefined' ? window.innerHeight : 900;
        const availHeight = fullscreen
            ? Math.max(stageHeight - 48, 460)
            : Math.max(Math.min(viewportH * 0.78, 920), 540);

        queueMicrotask(() => {
            if (!cancelled) setRendering(true);
        });
        Promise.all([
            drawPdfPageOffscreen(
                doc,
                spread[0],
                leftCanvasRef.current,
                availWidth,
                availHeight,
                zoom,
                tasks,
                isCancelled,
            ),
            twoPage
                ? drawPdfPageOffscreen(
                      doc,
                      spread[1],
                      rightCanvasRef.current,
                      availWidth,
                      availHeight,
                      zoom,
                      tasks,
                      isCancelled,
                  )
                : Promise.resolve(),
        ])
            .then(() => {
                if (cancelled) return;
                setPageError(false);
                setRendering(false);
                if (spread.includes(doc.numPages) && !reportedEnd.current) {
                    reportedEnd.current = true;
                    onReachedEndRef.current?.();
                }
                // Warm only the immediate next page on demand so the next flip is instant without loading the whole file.
                const nextToWarm = (spread[spread.length - 1] ?? page) + 1;
                if (nextToWarm <= doc.numPages) {
                    void doc.getPage(nextToWarm).catch(() => undefined);
                }
            })
            .catch(error => {
                if (cancelled || (error instanceof Error && error.name === 'RenderingCancelledException')) return;
                setPageError(true);
                setRendering(false);
            });

        return () => {
            cancelled = true;
            tasks.forEach(t => t.cancel());
        };
    }, [doc, page, spread, zoom, stageWidth, stageHeight, fullscreen]);

    useEffect(() => {
        const onChange = () => setFullscreen(document.fullscreenElement !== null && document.fullscreenElement === frameRef.current);
        document.addEventListener('fullscreenchange', onChange);
        return () => document.removeEventListener('fullscreenchange', onChange);
    }, []);

    const goTo = useCallback((target: number | string | null) => {
        const next = clampPdfPage(target, pageCount);
        setPageDraft(null);
        if (next === null || next === page) return;
        const direction = next > page ? 'next' : 'prev';
        setTurnDirection(direction);
        if (turnTimerRef.current !== null) window.clearTimeout(turnTimerRef.current);
        turnTimerRef.current = window.setTimeout(() => setTurnDirection(null), 280);
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

    const firstSpreadPage = spread[0] ?? page;
    const lastSpreadPage = spread[spread.length - 1] ?? page;

    const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
        if (event.altKey || event.ctrlKey || event.metaKey || isEditableTarget(event.target)) return;
        switch (event.key) {
            case 'ArrowLeft':
            case 'PageUp':
                goTo(firstSpreadPage - step);
                break;
            case 'ArrowRight':
            case 'PageDown':
                goTo(firstSpreadPage + step);
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
    const twoPage = spread.length === 2;
    const flipTransform =
        turnDirection === 'next'
            ? 'scale-[0.985] -rotate-y-3 translate-x-1'
            : turnDirection === 'prev'
              ? 'scale-[0.985] rotate-y-3 -translate-x-1'
              : 'scale-100 rotate-y-0 translate-x-0';

    return (
        <div
            ref={frameRef}
            role="region"
            aria-label={`${title}: trình đọc sách PDF`}
            aria-roledescription="trình đọc sách PDF"
            tabIndex={0}
            onKeyDown={onKeyDown}
            className={`flex flex-col overflow-hidden border border-border bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/40 ${
                fullscreen ? 'h-screen' : 'rounded-panel'
            }`}
        >
            <TrainingPdfToolbar
                loading={loading}
                page={page}
                pageCount={pageCount}
                spread={spread}
                pageDraft={pageDraft}
                zoom={zoom}
                fullscreen={fullscreen}
                bookMode={effectiveBookMode}
                canBookMode={canBookMode}
                showThumbnails={showThumbnails}
                onPageDraftChange={setPageDraft}
                onGoTo={goTo}
                onZoomChange={setZoom}
                onToggleBookMode={() => setBookMode(current => !current)}
                onToggleThumbnails={() => setShowThumbnails(current => !current)}
                onToggleFullscreen={toggleFullscreen}
            />

            <div
                ref={stageRef}
                className={`relative bg-slate-200/75 [scrollbar-gutter:stable] [perspective:1800px] ${
                    fullscreen ? 'min-h-0 flex-1 overflow-auto' : 'min-h-[64vh] overflow-x-auto'
                }`}
            >
                {pageCount > 1 && (
                    <>
                        <button
                            type="button"
                            onClick={() => goTo(firstSpreadPage - step)}
                            disabled={loading || firstSpreadPage <= 1}
                            aria-label="Lật trang trước"
                            title="Lật trang trước (←)"
                            className="group absolute inset-y-4 left-1.5 z-10 flex w-9 items-center justify-center rounded-control text-slate-700 transition-opacity hover:bg-slate-900/10 disabled:pointer-events-none disabled:opacity-0"
                        >
                            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white/90 shadow-sm transition-transform group-hover:scale-105">
                                <ChevronLeft className="h-4 w-4" />
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => goTo(firstSpreadPage + step)}
                            disabled={loading || lastSpreadPage >= pageCount}
                            aria-label="Lật trang sau"
                            title="Lật trang sau (→)"
                            className="group absolute inset-y-4 right-1.5 z-10 flex w-9 items-center justify-center rounded-control text-slate-700 transition-opacity hover:bg-slate-900/10 disabled:pointer-events-none disabled:opacity-0"
                        >
                            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white/90 shadow-sm transition-transform group-hover:scale-105">
                                <ChevronRight className="h-4 w-4" />
                            </span>
                        </button>
                    </>
                )}

                <div className="flex min-w-fit items-center justify-center px-4 py-4 sm:px-8">
                    <div
                        className={`relative flex items-stretch justify-center rounded-sm bg-slate-800/90 p-1.5 shadow-[0_18px_40px_-12px_rgba(15,23,42,0.32),0_4px_12px_rgba(15,23,42,0.12)] ring-1 ring-slate-400/60 transition-all duration-300 ease-out [transform-style:preserve-3d] ${flipTransform} ${
                            loading || pageError ? 'invisible h-0 p-0' : ''
                        }`}
                    >
                        {/* Left page (or single page) */}
                        <div
                            className={`relative flex flex-col bg-white ${
                                twoPage
                                    ? 'border-l-[3px] border-slate-200 shadow-[-2px_0_0_#cbd5e1] after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-7 after:bg-gradient-to-l after:from-slate-900/14 after:via-slate-900/4 after:to-transparent'
                                    : 'shadow-sm'
                            }`}
                        >
                            <canvas
                                ref={leftCanvasRef}
                                role="img"
                                aria-label={
                                    pageCount
                                        ? `${title}, trang ${pdfSpreadLabel(spread)}/${pageCount}`
                                        : title
                                }
                                className="block bg-white"
                            />
                            {spread[0] && (
                                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-3 py-1 text-[10px] text-slate-500 tabular-nums">
                                    <span>Trang {spread[0]}</span>
                                    <span className="truncate max-w-[14rem]">{title}</span>
                                </div>
                            )}
                        </div>

                        {/* Book spine crease & Right page when in 2-page Book Mode */}
                        {twoPage && (
                            <>
                                <div
                                    aria-hidden
                                    className="w-1.5 shrink-0 bg-gradient-to-r from-slate-900/35 via-slate-700/20 to-slate-900/35"
                                />
                                <div className="relative flex flex-col border-r-[3px] border-slate-200 bg-white shadow-[2px_0_0_#cbd5e1] before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:w-7 before:bg-gradient-to-r before:from-slate-900/14 before:via-slate-900/4 before:to-transparent">
                                    <canvas
                                        ref={rightCanvasRef}
                                        role="img"
                                        aria-label={`${title}, trang ${spread[1]}/${pageCount}`}
                                        className="block bg-white"
                                    />
                                    {spread[1] && (
                                        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-3 py-1 text-[10px] text-slate-500 tabular-nums">
                                            <span className="truncate max-w-[14rem]">{title}</span>
                                            <span>Trang {spread[1]}</span>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {turnDirection && (
                            <div
                                aria-hidden
                                className={`pointer-events-none absolute inset-0 transition-opacity duration-300 ${
                                    turnDirection === 'next'
                                        ? 'bg-gradient-to-l from-slate-900/12 via-transparent to-transparent'
                                        : 'bg-gradient-to-r from-slate-900/12 via-transparent to-transparent'
                                }`}
                            />
                        )}
                    </div>
                </div>

                {pageError && (
                    <p className="absolute inset-x-0 top-1/3 px-6 text-center text-sm text-muted" role="alert">
                        Không hiển thị được trang này. Thử mở trong tab mới hoặc tải xuống.
                    </p>
                )}
                {(loading || rendering) && !pageError && (
                    <div
                        className="pointer-events-none absolute inset-0 flex items-center justify-center"
                        role="status"
                        aria-label={loading ? 'Đang mở sách PDF' : 'Đang lật trang'}
                    >
                        <Spinner size="md" />
                    </div>
                )}
            </div>

            {doc && pageCount > 1 && showThumbnails && (
                <TrainingPdfThumbnailStrip doc={doc} page={page} spread={spread} onSelect={goTo} />
            )}
        </div>
    );
}
