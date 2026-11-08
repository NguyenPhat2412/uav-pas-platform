'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import type {KeyboardEvent as ReactKeyboardEvent, ReactNode} from 'react';
import type {PDFDocumentProxy, RenderTask} from 'pdfjs-dist';
import {Spinner} from '@/components/ui';
import {clampPdfPage, nextPdfZoom} from '@/utils/training/course-helpers';
import {
    isEditableTarget,
    loadPdfjs,
    MAX_CANVAS_PIXELS,
    readStoredPage,
    STAGE_PADDING,
    storePage,
} from '@/components/training/training-pdf-helpers';
import {TrainingPdfThumbnailStrip, TrainingPdfToolbar} from '@/components/training/TrainingPdfToolbar';

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
            <TrainingPdfToolbar
                loading={loading}
                page={page}
                pageCount={pageCount}
                pageDraft={pageDraft}
                zoom={zoom}
                fullscreen={fullscreen}
                onPageDraftChange={setPageDraft}
                onGoTo={goTo}
                onZoomChange={setZoom}
                onToggleFullscreen={toggleFullscreen}
            />

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
                    <div
                        className="pointer-events-none absolute inset-0 flex items-center justify-center"
                        role="status"
                        aria-label={loading ? 'Đang mở tài liệu' : 'Đang hiển thị trang'}
                    >
                        <Spinner size="md" />
                    </div>
                )}
            </div>

            {doc && pageCount > 1 && <TrainingPdfThumbnailStrip doc={doc} page={page} onSelect={goTo} />}
        </div>
    );
}
