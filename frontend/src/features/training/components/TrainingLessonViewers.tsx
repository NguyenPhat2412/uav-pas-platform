'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import type {ReactNode} from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Download,
    ExternalLink,
    FileIcon,
    FileSpreadsheet,
    FileText,
    FileType,
    ImageIcon,
    ImageOff,
    Maximize2,
    Minimize2,
    Presentation,
    VideoOff,
} from 'lucide-react';
import type {
    TrainingLessonDocument,
    TrainingLessonDocumentFile,
    TrainingLessonResource,
    TrainingLessonSlide,
    UpdateTrainingLessonProgressPayload,
} from '@/features/training/types/training.types';
import {MarkdownSopRenderer} from '@/features/training/components/MarkdownSopRenderer';
import {PdfPageViewer} from '@/features/training/components/TrainingPdfViewer';
import {
    formatFileSize,
    isDocumentEmbedUrl,
    isLastSlide,
    isPositionSaveDue,
    isVideoEmbedUrl,
    isVideoWatched,
    resourceFileKind,
    resumePosition,
    slideCounter,
    slideIndexAfter,
} from '@/features/training/utils/course-helpers';
import type {SlideMove} from '@/features/training/utils/course-helpers';

/** The player's media frame: 16:9, never taller than 70 % of the viewport. */
export const STAGE_FRAME = 'aspect-video max-h-[70vh] w-full';

/**
 * Shown in the player frame when there is nothing to play (no media, or storage not configured).
 * `dark` sits on the black video/slide stage, `light` on the reading surface.
 */
export function LessonMediaEmpty({icon, title, detail, tone = 'dark'}: {icon?: ReactNode; title: string; detail?: string; tone?: 'dark' | 'light'}) {
    const dark = tone === 'dark';
    return (
        <div className={`flex ${STAGE_FRAME} flex-col items-center justify-center gap-2 px-6 text-center ${dark ? 'bg-[#1c1d1f]' : 'bg-slate-100'}`}>
            <span className={dark ? 'text-white/40' : 'text-slate-400'}>{icon ?? <VideoOff className="h-8 w-8" strokeWidth={1.5} />}</span>
            <p className={`text-sm font-semibold ${dark ? 'text-white' : 'text-slate-700'}`}>{title}</p>
            {detail && <p className={`max-w-md text-xs ${dark ? 'text-white/60' : 'text-slate-500'}`}>{detail}</p>}
        </div>
    );
}

/** A position save; `completed` goes along only when it is true, so a save never un-completes a lesson. */
function positionPayload(currentTime: number, completed: boolean): UpdateTrainingLessonProgressPayload {
    const positionSeconds = Math.floor(currentTime);
    return completed ? {completed: true, positionSeconds} : {positionSeconds};
}

/**
 * An uploaded video. Resumes from the saved position, saves the position every ~15 s while playing
 * and on pause, and reports the lesson complete at 90 % or at the end. Mount it with `key={lessonId}`:
 * the signed URL and the start position are read once, so a refreshed URL does not restart playback.
 */
export function VideoFileLesson({url, contentType, completed, positionSeconds, onSave}: {
    url: string;
    contentType: string;
    completed: boolean;
    positionSeconds: number;
    onSave: (payload: UpdateTrainingLessonProgressPayload) => void;
}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [source] = useState(url);
    const [startAt] = useState(positionSeconds);
    const [failed, setFailed] = useState(false);
    const lastSavedAt = useRef(0);
    const completedRef = useRef(completed);
    const onSaveRef = useRef(onSave);

    useEffect(() => {
        onSaveRef.current = onSave;
        if (completed) completedRef.current = true;
    }, [onSave, completed]);

    const save = useCallback((markComplete: boolean) => {
        const video = videoRef.current;
        if (!video) return;
        if (markComplete) completedRef.current = true;
        lastSavedAt.current = Date.now();
        onSaveRef.current(positionPayload(video.currentTime, completedRef.current));
    }, []);

    // Leaving the lesson (next lesson, another page) keeps the place too.
    useEffect(() => {
        const video = videoRef.current;
        lastSavedAt.current = Date.now();
        return () => {
            if (video && video.currentTime > 0 && !video.ended) {
                onSaveRef.current(positionPayload(video.currentTime, completedRef.current));
            }
        };
    }, []);

    if (failed) {
        return (
            <LessonMediaEmpty
                title="Không phát được video"
                detail="Liên kết xem có thể đã hết hạn. Tải lại trang để lấy liên kết mới."
            />
        );
    }

    return (
        <div className={`${STAGE_FRAME} bg-black`}>
            <video
                ref={videoRef}
                controls
                preload="metadata"
                playsInline
                className="h-full w-full"
                onLoadedMetadata={event => {
                    const start = resumePosition(startAt, event.currentTarget.duration);
                    if (start > 0) event.currentTarget.currentTime = start;
                }}
                onTimeUpdate={event => {
                    const video = event.currentTarget;
                    if (!completedRef.current && isVideoWatched(video.currentTime, video.duration)) save(true);
                    else if (!video.paused && isPositionSaveDue(lastSavedAt.current, Date.now())) save(false);
                }}
                onPause={event => {
                    if (!event.currentTarget.ended) save(false);
                }}
                onEnded={() => save(true)}
                onError={() => setFailed(true)}
            >
                <source src={source} type={contentType || undefined} />
            </video>
        </div>
    );
}

/** A YouTube or Vimeo embed. Completion is the learner's call ("Đánh dấu đã xem"). */
export function ExternalVideoLesson({url, title}: {url: string; title: string}) {
    if (!isVideoEmbedUrl(url)) {
        return <LessonMediaEmpty title="Liên kết video không hợp lệ" detail="Chỉ phát được video YouTube hoặc Vimeo." />;
    }
    return (
        <div className={`relative ${STAGE_FRAME} bg-black`}>
            <iframe
                src={url}
                title={title}
                allow="fullscreen; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className="absolute inset-0 h-full w-full border-0"
            />
        </div>
    );
}

function isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/**
 * Slides one at a time: prev/next buttons, ←/→ keys, a "3/12" counter, the caption, a thumbnail
 * strip and a fullscreen toggle. `onReachedEnd` fires once when the last slide is shown.
 */
export function SlidesLesson({slides, title, completed, onReachedEnd}: {
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
                <button
                    type="button"
                    onClick={toggleFullscreen}
                    aria-label={fullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
                    title={fullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-control hover:bg-white/10"
                >
                    {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
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

/** A reading lesson on the light reading surface. */
export function ArticleLesson({markdown}: {markdown: string | null}) {
    if (!markdown?.trim()) {
        return <LessonMediaEmpty tone="light" icon={<FileText className="h-8 w-8" strokeWidth={1.5} />} title="Bài đọc chưa có nội dung" />;
    }
    return (
        <article className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
            <MarkdownSopRenderer markdown={markdown} />
        </article>
    );
}

const secondaryLink = 'inline-flex h-8 items-center gap-1.5 rounded-control border border-border bg-card px-3 text-xs font-medium text-foreground hover:bg-surface-variant';

/**
 * A DOCUMENT lesson: an uploaded PDF read page by page (pdf.js), or a Google Docs/Slides/Sheets/Drive
 * document framed from its `/preview` URL. Mount it with `key={lessonId}`.
 */
export function DocumentLesson({document: doc, title, lessonId, completed, onReachedEnd}: {
    document: TrainingLessonDocument | null | undefined;
    title: string;
    lessonId: number;
    completed: boolean;
    onReachedEnd: () => void;
}) {
    if (doc?.kind === 'EMBED') return <DocumentEmbedLesson url={doc.url} title={title} />;
    if (!doc?.url) {
        return (
            <LessonMediaEmpty
                tone="light"
                icon={<FileText className="h-8 w-8" strokeWidth={1.5} />}
                title="Tài liệu chưa sẵn sàng"
                detail={doc ? 'Kho lưu trữ tệp chưa được cấu hình nên chưa mở được tài liệu.' : 'Bài học này chưa có tệp PDF hoặc liên kết tài liệu.'}
            />
        );
    }
    const pdf = doc as TrainingLessonDocumentFile & {url: string};
    const size = formatFileSize(pdf.size);
    const links = <DocumentLinks url={pdf.url} fileName={pdf.fileName} />;
    return (
        <div className="bg-slate-50 px-3 py-3 sm:px-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{pdf.fileName || title}</p>
                    <p className="text-[11px] text-muted-foreground">PDF{size && ` · ${size}`}</p>
                </div>
                {links}
            </div>
            <PdfPageViewer
                url={pdf.url}
                title={title}
                storageKey={String(lessonId)}
                completed={completed}
                onReachedEnd={onReachedEnd}
                fallback={<PdfEmbedFallback url={pdf.url} title={title} links={links} />}
            />
        </div>
    );
}

function DocumentLinks({url, fileName}: {url: string; fileName?: string}) {
    return (
        <>
            <a href={url} target="_blank" rel="noopener noreferrer" className={secondaryLink}>
                <ExternalLink className="h-3.5 w-3.5" />
                Mở trong tab mới
            </a>
            <a href={url} download={fileName || true} rel="noopener noreferrer" className={secondaryLink}>
                <Download className="h-3.5 w-3.5" />
                Tải xuống
            </a>
        </>
    );
}

/**
 * When pdf.js cannot fetch the file (e.g. storage CORS): the browser's own PDF viewer, and the two
 * links for browsers that cannot show PDFs in the page (most phones).
 */
function PdfEmbedFallback({url, title, links}: {url: string; title: string; links: ReactNode}) {
    return (
        <object
            data={url}
            type="application/pdf"
            aria-label={title}
            className="block h-[75vh] w-full rounded-panel border border-border bg-white"
        >
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                <FileText className="h-8 w-8 text-slate-400" strokeWidth={1.5} />
                <p className="text-sm text-foreground">Trình duyệt này không hiển thị được PDF ngay trong trang.</p>
                <div className="flex flex-wrap justify-center gap-2">{links}</div>
            </div>
        </object>
    );
}

/**
 * A Google Docs/Slides/Sheets or Drive document, framed from the server's `/preview` URL in a
 * sandboxed iframe. Anything not on docs.google.com or drive.google.com is not framed.
 */
export function DocumentEmbedLesson({url, title}: {url: string; title: string}) {
    if (!isDocumentEmbedUrl(url)) {
        return (
            <LessonMediaEmpty
                tone="light"
                icon={<FileText className="h-8 w-8" strokeWidth={1.5} />}
                title="Liên kết tài liệu không hợp lệ"
                detail="Chỉ mở được tài liệu Google Docs, Slides, Sheets hoặc Google Drive."
            />
        );
    }
    return (
        <div className="bg-slate-50 px-3 py-3 sm:px-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{title}</p>
                <a href={url} target="_blank" rel="noopener noreferrer" className={secondaryLink}>
                    <ExternalLink className="h-3.5 w-3.5" />
                    Mở trong tab mới
                </a>
            </div>
            <iframe
                src={url}
                title={title}
                sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                allow="fullscreen"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className="block h-[75vh] w-full rounded-panel border border-border bg-white"
            />
        </div>
    );
}

export const RESOURCE_ICONS = {
    pdf: FileText,
    word: FileType,
    slides: Presentation,
    sheet: FileSpreadsheet,
    image: ImageIcon,
    file: FileIcon,
} as const;

const RESOURCE_LABELS = {pdf: 'PDF', word: 'Word', slides: 'PowerPoint', sheet: 'Excel', file: 'Tệp'} as const;

function resourceMeta(resource: TrainingLessonResource): string {
    const kind = resourceFileKind(resource.contentType);
    const label = kind === 'image' ? (resource.contentType.split('/')[1] ?? 'ảnh').toUpperCase() : RESOURCE_LABELS[kind];
    const size = formatFileSize(resource.size);
    return size ? `${label} · ${size}` : label;
}

/** A lesson's downloadable files: icon, name, type and size, and a download link. */
export function LessonResourceList({resources, compact = false}: {resources: readonly TrainingLessonResource[]; compact?: boolean}) {
    return (
        <ul className={compact ? 'py-1' : 'divide-y divide-border rounded-panel border border-border'}>
            {resources.map((resource, index) => {
                const Icon = RESOURCE_ICONS[resourceFileKind(resource.contentType)];
                const row = `flex items-center gap-3 ${compact ? 'px-3 py-2' : 'px-4 py-3'}`;
                const body = (
                    <>
                        <Icon className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                        <span className="min-w-0 flex-1">
                            <span className={`block truncate text-foreground ${compact ? 'text-xs' : 'text-sm'}`}>{resource.title}</span>
                            <span className="block text-[11px] text-muted-foreground">{resourceMeta(resource)}</span>
                        </span>
                    </>
                );
                return (
                    <li key={`${resource.title}-${index}`}>
                        {resource.url ? (
                            <a
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={resource.title || true}
                                className={`${row} hover:bg-surface-variant/60`}
                            >
                                {body}
                                <Download className="h-3.5 w-3.5 shrink-0 text-muted" aria-label="Tải xuống" />
                            </a>
                        ) : (
                            <div className={`${row} opacity-60`} title="Kho lưu trữ chưa được cấu hình">
                                {body}
                            </div>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}
