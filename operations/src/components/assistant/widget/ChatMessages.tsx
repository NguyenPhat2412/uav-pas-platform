'use client';

import {useEffect, useRef, useState} from 'react';
import {AlertCircle, Check, CheckCheck, ChevronLeft, ChevronRight, Clock, Film, X} from 'lucide-react';
import {useI18n} from '@/providers/I18nContext';
import {useDialogFocusTrap} from '@/hooks/useDialogFocusTrap';
import type {ChatImage, ChatMessage} from '@/types/assistant.types';
import {SuperheroLogo} from '@/components/assistant/widget/SuperheroLogo';
import {groupMessages} from '@/utils/chat-groups';
import {cn} from '@/lib/utils';

/** Today's messages show only the time; older ones also show the date. */
function isToday(at: number) {
    return new Date(at).toDateString() === new Date().toDateString();
}

/**
 * Messenger-style transcript: one avatar per sender run (15-minute window), a time divider between runs that are
 * far apart, image grids that open full size, and Chat-TTA delivery/seen/retry status badges on user turns.
 */
export function ChatMessages({
    messages,
    onRetryMessage,
}: {
    messages: ChatMessage[];
    onRetryMessage?: (clientKey: string) => void;
}) {
    const {t, formatDate} = useI18n();
    const [viewing, setViewing] = useState<{images: ChatImage[]; index: number} | null>(null);
    const time = (at: number) => formatDate(new Date(at).toISOString(), isToday(at)
        ? {timeStyle: 'short'} : {dateStyle: 'short', timeStyle: 'short'});

    let lastSettledUserMsg: ChatMessage | null = null;
    let lastSettledUserHasReply = false;
    for (let i = messages.length - 1; i >= 0; i--) {
        const item = messages[i];
        if (item.role === 'user' && item.status !== 'sending' && item.status !== 'failed') {
            lastSettledUserMsg = item;
            lastSettledUserHasReply = item.status === 'seen' || messages.slice(i + 1).some(x => x.role === 'assistant');
            break;
        }
    }

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
                        {group.messages.map((m, i) => {
                            const isLastSettledMine = mine && m === lastSettledUserMsg;
                            return <div key={m.clientKey ?? i} className={cn('flex min-w-0 max-w-full flex-col gap-1', mine ? 'items-end' : 'items-start')}>
                                {!!m.images?.length && <ImageGrid images={m.images} onOpen={index => setViewing({images: m.images!, index})}/>}
                                {m.content && <p className={cn('m-0 max-w-full whitespace-pre-wrap break-words rounded-overlay px-3 py-1.5 text-[13px] leading-relaxed transition-opacity',
                                    mine ? 'bg-primary text-primary-foreground' : 'border border-slate-200 bg-white text-slate-800',
                                    m.status === 'sending' && 'opacity-70')}>{m.content}</p>}
                                {m.note && <span className="px-1 font-mono text-[10px] text-slate-400">{m.note}</span>}
                                {mine && m.status === 'sending' && (
                                    <span className="inline-flex items-center gap-1 px-1 text-[10px] font-medium text-slate-400">
                                        <Clock size={11} aria-hidden="true"/> Đang gửi
                                    </span>
                                )}
                                {mine && m.status === 'failed' && (
                                    <button type="button" onClick={() => m.clientKey && onRetryMessage?.(m.clientKey)}
                                            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 transition-colors hover:bg-rose-50 hover:underline cursor-pointer">
                                        <AlertCircle size={11} className="text-danger" aria-hidden="true"/> Không gửi được · Thử lại
                                    </button>
                                )}
                                {isLastSettledMine && (
                                    lastSettledUserHasReply ? (
                                        <span className="inline-flex items-center gap-1 px-1 text-[10px] font-semibold text-slate-600" title="Đã xem bởi Trợ lý AI UAV PAS">
                                            <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-slate-300 bg-slate-900 text-[7.5px] font-extrabold text-white" aria-hidden="true">AI</span>
                                            <CheckCheck size={12} className="text-primary" aria-hidden="true"/> Đã xem
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-1 text-[10px] font-medium text-slate-400">
                                            <Check size={11} aria-hidden="true"/> Đã gửi
                                        </span>
                                    )
                                )}
                            </div>;
                        })}
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
    const dialogRef = useRef<HTMLDivElement | null>(null);
    const [index, setIndex] = useState(start);
    const step = (by: number) => setIndex(i => (i + by + images.length) % images.length);
    useDialogFocusTrap(dialogRef, true, onClose);
    useEffect(() => {
        const onKey = (event: globalThis.KeyboardEvent) => {
            if (event.key === 'ArrowLeft') setIndex(i => (i - 1 + images.length) % images.length);
            if (event.key === 'ArrowRight') setIndex(i => (i + 1) % images.length);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [images.length]);
    const image = images[index];
    return <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={label} onClick={onClose}
                className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/85 p-6 outline-none animate-[assistant-pop_160ms_ease-out]">
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
