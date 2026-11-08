'use client';

import type {ReactNode} from 'react';
import {
    Download,
    ExternalLink,
    FileIcon,
    FileSpreadsheet,
    FileText,
    FileType,
    ImageIcon,
    Presentation,
} from 'lucide-react';
import {Card} from '@/components/ui';
import type {
    TrainingLessonDocument,
    TrainingLessonDocumentFile,
    TrainingLessonResource,
} from '@/types/training/training.types';
import {MarkdownSopRenderer} from '@/components/training/MarkdownSopRenderer';
import {PdfPageViewer} from '@/components/training/TrainingPdfViewer';
import {LessonMediaEmpty} from '@/components/training/TrainingVideoAndStage';
import {
    formatFileSize,
    isDocumentEmbedUrl,
    resourceFileKind,
} from '@/utils/training/course-helpers';

export {
    ExternalVideoLesson,
    LessonMediaEmpty,
    STAGE_FRAME,
    VideoFileLesson,
} from '@/components/training/TrainingVideoAndStage';
export {SlidesLesson} from '@/components/training/TrainingSlidesViewer';

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
export function DocumentLesson({
    document: doc,
    title,
    lessonId,
    completed,
    onReachedEnd,
}: {
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
    const list = (
        <ul className={compact ? 'py-1' : 'divide-y divide-border'}>
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
    return compact ? list : <Card className="overflow-hidden p-0">{list}</Card>;
}
