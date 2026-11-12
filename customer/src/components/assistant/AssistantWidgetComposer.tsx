'use client';

import {
    type ClipboardEvent,
    type FormEvent,
    type KeyboardEvent,
    type RefObject,
    useLayoutEffect,
    useRef,
} from 'react';
import {Film, Paperclip, SendHorizontal, X} from 'lucide-react';
import {Button, Input, Spinner} from '@/components/ui';
import {useI18n} from '@/providers/I18nContext';
import type {AssistantMode, AssistantPortal, PendingAttachment} from '@/types/assistant/assistant.types';
import {FRAMES_PER_VIDEO, MAX_ATTACHMENTS, imageAttachment, videoAttachments} from '@/utils/assistant/attachments';
import {cn} from '@/lib/utils';

/** The composer grows with its text up to about five lines, then scrolls. */
const INPUT_MAX_HEIGHT = 120;

export async function readMediaAttachments(
    files: File[],
    currentCount: number,
    onLimit: () => void,
    onUnreadable: (name: string) => void,
): Promise<PendingAttachment[]> {
    const media = files.filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'));
    if (!media.length) return [];
    let room = MAX_ATTACHMENTS - currentCount;
    const added: PendingAttachment[] = [];
    for (const file of media) {
        if (room <= 0) {
            onLimit();
            break;
        }
        try {
            const items = file.type.startsWith('video/')
                ? await videoAttachments(file, Math.min(FRAMES_PER_VIDEO, room))
                : [await imageAttachment(file)];
            added.push(...items.slice(0, room));
            room -= items.length;
        } catch {
            onUnreadable(file.name);
        }
    }
    return added;
}

interface AssistantWidgetComposerProps {
    portal: AssistantPortal;
    open: boolean;
    enabled: boolean;
    draft: string;
    pending: PendingAttachment[];
    reading: boolean;
    isSending: boolean;
    modes: AssistantMode[];
    activeMode: AssistantMode | null;
    inputRef: RefObject<HTMLTextAreaElement | null>;
    onDraftChange: (value: string) => void;
    onSelectMode: (mode: 1 | 2) => void;
    onAttachFiles: (files: File[]) => void;
    onRemoveAttachment: (id: string) => void;
    onSubmit: () => void;
}

export function AssistantWidgetComposer({
    portal, open, enabled, draft, pending, reading, isSending, modes, activeMode, inputRef,
    onDraftChange, onSelectMode, onAttachFiles, onRemoveAttachment, onSubmit,
}: AssistantWidgetComposerProps) {
    const {t} = useI18n();
    const picker = useRef<HTMLInputElement>(null);

    useLayoutEffect(() => {
        const el = inputRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, INPUT_MAX_HEIGHT)}px`;
    }, [draft, open, inputRef]);

    const handleSubmit = (event?: FormEvent) => {
        event?.preventDefault();
        onSubmit();
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            onSubmit();
        }
    };

    const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
        const files = Array.from(event.clipboardData.files);
        if (!files.length) return;
        event.preventDefault();
        onAttachFiles(files);
    };

    return (
        <form onSubmit={handleSubmit} className="border-t border-slate-200 bg-white p-1.5">
            {(pending.length > 0 || reading) && (
                <ul className="m-0 mb-2 flex list-none gap-1.5 overflow-x-auto p-0" aria-label={t('admin.assistant.attachments')}>
                    {pending.map((a) => (
                        <li key={a.id} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-control border border-slate-200 bg-slate-100">
                            {/* eslint-disable-next-line @next/next/no-img-element -- data URLs need no optimisation */}
                            <img src={a.thumb} alt={a.name ?? ''} className="h-full w-full object-cover"/>
                            {a.kind === 'VIDEO_FRAME' && <Film size={11} className="absolute bottom-1 left-1 text-white drop-shadow" aria-hidden="true"/>}
                            <Button
                                type="button" variant="ghost" size="sm"
                                onClick={() => onRemoveAttachment(a.id)}
                                aria-label={t('admin.assistant.removeAttachment', {name: a.name ?? ''})}
                                className="absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-slate-900/70 p-0 text-white hover:bg-slate-900 hover:text-white"
                            >
                                <X size={10}/>
                            </Button>
                        </li>
                    ))}
                    {reading && (
                        <li className="flex h-14 w-14 shrink-0 items-center justify-center rounded-control border border-dashed border-slate-300 px-1 text-center text-slate-500">
                            <Spinner size={14} label={t('admin.assistant.reading')} className="flex-col gap-0.5 text-[10px]"/>
                        </li>
                    )}
                </ul>
            )}

            <div className="rounded-control border border-slate-300 transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                <textarea
                    ref={inputRef} rows={1} value={draft}
                    onChange={(e) => onDraftChange(e.target.value)}
                    onKeyDown={handleKeyDown} onPaste={handlePaste} disabled={!enabled}
                    aria-label={t('admin.assistant.input')} placeholder={t('admin.assistant.placeholder')}
                    className="block max-h-[120px] w-full resize-none bg-transparent px-2.5 pb-1 pt-2 text-[13px] leading-5 placeholder:truncate placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed"
                />
                <div className="flex items-center gap-1 px-1 pb-1">
                    <div hidden>
                        <Input
                            ref={picker} type="file" accept="image/*,video/*" multiple tabIndex={-1}
                            onChange={(e) => {
                                onAttachFiles(Array.from(e.target.files ?? []));
                                e.target.value = '';
                            }}
                        />
                    </div>
                    <Button
                        type="button" variant="ghost" size="sm"
                        onClick={() => picker.current?.click()}
                        disabled={!enabled || reading || pending.length >= MAX_ATTACHMENTS}
                        aria-label={t('admin.assistant.attach')} title={t('admin.assistant.attach')}
                        className="h-7 w-7 p-0 text-slate-500 hover:bg-slate-100 hover:text-primary disabled:opacity-40"
                    >
                        <Paperclip size={16}/>
                    </Button>
                    {modes.length > 1 && (
                        <div role="radiogroup" aria-label={t('admin.assistant.mode')} className="inline-flex shrink-0 rounded-control bg-slate-100 p-0.5">
                            {modes.map((m) => (
                                <Button
                                    key={m.mode} type="button" variant="ghost" size="sm" role="radio"
                                    aria-checked={activeMode?.mode === m.mode} disabled={isSending}
                                    onClick={() => onSelectMode(m.mode)} title={portal === 'ADMIN' ? m.model : undefined}
                                    className={cn(
                                        'h-5 whitespace-nowrap rounded-[3px] px-1.5 py-0 text-[11px] font-semibold leading-5',
                                        activeMode?.mode === m.mode ? 'bg-white text-primary shadow-sm hover:bg-white' : 'text-slate-500 hover:bg-transparent hover:text-slate-800',
                                    )}
                                >
                                    {m.label}
                                </Button>
                            ))}
                        </div>
                    )}
                    <Button
                        type="submit" variant="primary" size="sm"
                        disabled={(!draft.trim() && !pending.length) || !activeMode || isSending || reading || !enabled}
                        aria-label={t('admin.assistant.send')} title={t('admin.assistant.send')}
                        className="ml-auto h-7 w-7 shrink-0 p-0 disabled:opacity-40"
                    >
                        <SendHorizontal size={14}/>
                    </Button>
                </div>
            </div>
        </form>
    );
}
