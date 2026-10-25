'use client';

import {useEffect, useState} from 'react';
import {ChevronLeft, ChevronRight, Film, X} from 'lucide-react';
import {useI18n} from '@/contexts/I18nContext';
import type {ChatImage, ChatMessage} from '@/features/assistant/types/assistant.types';
import {SuperheroLogo} from '@/features/assistant/components/SuperheroLogo';
import {groupMessages} from '@/features/assistant/utils/chat-groups';
import {cn} from '@/lib/utils';

/** Today's messages show only the time; older ones also show the date. */
function isToday(at: number) {
    return new Date(at).toDateString() === new Date().toDateString();
}

/**
 * Messenger-style transcript: one avatar per sender run (15-minute window), a time divider between runs that are
 * far apart, and image grids that open full size.
 */
export function ChatMessages({messages}: { messages: ChatMessage[] }) {
    const {t, formatDate} = useI18n();
    const [viewing, setViewing] = useState<{images: ChatImage[]; index: number} | null>(null);
    const time = (at: number) => formatDate(new Date(at).toISOString(), isToday(at)
        ? {timeStyle: 'short'} : {dateStyle: 'short', timeStyle: 'short'});

    return <>
        {groupMessages(messages).map((group, g) => {
            const mine = group.role === 'user';
            const last = group.messages[group.messages.length - 1];
            return <div key={g}>
                {group.divider && group.at != null && <p className="my-2 text-center">
                    <span className="rounded-full bg-slate-200/70 px-2.5 py-0.5 text-[10.5px] font-medium text-slate-600">{time(group.at)}</span></p>}
                <div className={cn('flex gap-2', mine ? 'justify-end' : 'justify-start')}>
                    {!mine && <span className="mt-0.5 shrink-0 self-start"><SuperheroLogo size={26}/></span>}
                    <div className={cn('flex min-w-0 max-w-[82%] flex-col gap-1', mine ? 'items-end' : 'items-start')}>
                        {group.messages.map((m, i) => <div key={i} className={cn('flex min-w-0 max-w-full flex-col gap-1', mine ? 'items-end' : 'items-start')}>
                            {!!m.images?.length && <ImageGrid images={m.images} onOpen={index => setViewing({images: m.images!, index})}/>}
                            {m.content && <p className={cn('m-0 max-w-full whitespace-pre-wrap break-words rounded-overlay px-3 py-1.5 text-[13px] leading-relaxed',
                                mine ? 'bg-primary text-primary-foreground' : 'border border-slate-200 bg-white text-slate-800')}>{m.content}</p>}
                            {m.note && <span className="px-1 font-mono text-[10px] text-slate-400">{m.note}</span>}
                        </div>)}
                        {last.at != null && <span className="px-1 text-[10px] tabular-nums text-slate-400">{time(last.at)}</span>}
                    </div>
                </div>
            </div>;
        })}
        {viewing && <ImageViewer images={viewing.images} start={viewing.index} onClose={() => setViewing(null)} label={t('admin.assistant.viewImage')}/>}
    </>;
}

function ImageGrid({images, onOpen}: { images: ChatImage[]; onOpen: (index: number) => void }) {
    const {t} = useI18n();
    return <div className={cn('grid max-w-[260px] gap-0.5 overflow-hidden rounded-overlay',
        images.length === 1 ? 'grid-cols-1' : images.length === 2 || images.length === 4 ? 'grid-cols-2' : 'grid-cols-3')}>
        {images.map((image, i) => <button key={i} type="button" onClick={() => onOpen(i)} aria-label={t('admin.assistant.viewImage')}
                                          className={cn('relative block bg-slate-100', images.length === 1 ? 'max-h-[220px]' : 'aspect-square')}>
            {/* eslint-disable-next-line @next/next/no-img-element -- data URLs need no optimisation */}
            <img src={image.thumb} alt={image.name ?? ''} className={cn('block h-full w-full', images.length === 1 ? 'max-h-[220px] object-contain' : 'object-cover')}/>
            {image.kind === 'VIDEO_FRAME' && <span className="absolute bottom-1 left-1 inline-flex items-center gap-0.5 rounded-badge bg-slate-900/70 px-1 py-px text-[9.5px] font-semibold text-white">
                <Film size={10} aria-hidden="true"/>{image.name?.split(' · ').pop()}</span>}
        </button>)}
    </div>;
}

/** Full-size viewer; Esc closes, arrow keys step through the images of one message. */
export function ImageViewer({images, start, onClose, label}: { images: ChatImage[]; start: number; onClose: () => void; label: string }) {
    const {t} = useI18n();
    const [index, setIndex] = useState(start);
    const step = (by: number) => setIndex(i => (i + by + images.length) % images.length);
    useEffect(() => {
        const onKey = (event: globalThis.KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
            if (event.key === 'ArrowLeft') setIndex(i => (i - 1 + images.length) % images.length);
            if (event.key === 'ArrowRight') setIndex(i => (i + 1) % images.length);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [images.length, onClose]);
    const image = images[index];
    return <div role="dialog" aria-modal="true" aria-label={label} onClick={onClose}
                className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/85 p-6 animate-[assistant-pop_160ms_ease-out]">
        {/* eslint-disable-next-line @next/next/no-img-element -- data URLs need no optimisation */}
        <img src={image.src} alt={image.name ?? ''} onClick={e => e.stopPropagation()} className="max-h-full max-w-full rounded-control object-contain shadow-2xl"/>
        {image.name && <p className="absolute bottom-4 left-1/2 m-0 -translate-x-1/2 truncate rounded-badge bg-slate-900/70 px-2 py-1 text-xs text-white">
            {image.name}{images.length > 1 && ` · ${index + 1}/${images.length}`}</p>}
        <button type="button" onClick={onClose} aria-label={t('admin.assistant.close')}
                className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"><X size={18}/></button>
        {images.length > 1 && <>
            <button type="button" onClick={e => { e.stopPropagation(); step(-1); }} aria-label={t('admin.assistant.prevImage')}
                    className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"><ChevronLeft size={20}/></button>
            <button type="button" onClick={e => { e.stopPropagation(); step(1); }} aria-label={t('admin.assistant.nextImage')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"><ChevronRight size={20}/></button>
        </>}
    </div>;
}
