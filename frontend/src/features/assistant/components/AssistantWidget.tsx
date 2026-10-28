'use client';

import Link from 'next/link';
import {
    type ClipboardEvent,
    type DragEvent,
    type FormEvent,
    type KeyboardEvent,
    type PointerEvent,
    type ReactNode,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';
import {useMutation, useQuery} from '@tanstack/react-query';
import {Eraser, Film, Maximize2, Minimize2, Paperclip, SendHorizontal, X} from 'lucide-react';
import {useAuth} from '@/contexts/AuthContext';
import {ApiError} from '@/lib/api';
import {useI18n} from '@/contexts/I18nContext';
import {toast} from '@/contexts/ToastContext';
import {assistantKeys, assistantService} from '@/lib/api/services';
import type {
    AssistantCorner as Corner,
    AssistantPortal,
    ChatImage,
    ChatMessage,
    PendingAttachment,
} from '@/features/assistant/types/assistant.types';
import {SuperheroLogo} from '@/features/assistant/components/SuperheroLogo';
import {ChatMessages} from '@/features/assistant/components/ChatMessages';
import {FRAMES_PER_VIDEO, MAX_ATTACHMENTS, imageAttachment, videoAttachments} from '@/features/assistant/utils/attachments';
import {cn} from '@/lib/utils';

/** History sent back to the model; older turns are dropped so each request stays small. */
const HISTORY_LIMIT = 12;
/** Suggested starter questions per portal; the backend's built-in platform guide answers them. */
const FAQ: Record<AssistantPortal, {group: string; keys: readonly string[]}> = {
    ADMIN: {group: 'faq', keys: ['statuses', 'dispatch', 'payment', 'createMission', 'maintenance', 'sarRth']},
    OPERATIONS: {group: 'faqOperations', keys: ['assigned', 'preflight', 'telemetry', 'sarRth', 'maintenance', 'report']},
    CUSTOMER: {group: 'faqCustomer', keys: ['createMission', 'statuses', 'payment', 'quota', 'results', 'cancel']},
};
const HELLO_BODY: Record<AssistantPortal, string> = {ADMIN: 'helloBody', OPERATIONS: 'helloBodyOperations', CUSTOMER: 'helloBodyCustomer'};

const CORNER_KEY = 'uav_assistant_corner';
const EXPANDED_KEY = 'uav_assistant_expanded';
/** The composer grows with its text up to about five lines, then scrolls. */
const INPUT_MAX_HEIGHT = 120;
/** Pointer travel (px) before a press counts as a drag rather than a click. */
const DRAG_THRESHOLD = 6;
/** Glide into the corner with a slight overshoot, like a magnet catching the button. */
const SETTLE = 'transform 460ms cubic-bezier(0.22, 1.25, 0.36, 1)';
const PANEL_ORIGIN: Record<Corner, string> = {tl: 'origin-top-left', tr: 'origin-top-right', bl: 'origin-bottom-left', br: 'origin-bottom-right'};
// Top corners sit below the portal header so the launcher never covers the account menu.
const LAUNCHER_AT: Record<Corner, string> = {
    tl: 'top-[4.5rem] left-5', tr: 'top-[4.5rem] right-5', bl: 'bottom-5 left-5', br: 'bottom-5 right-5',
};
const PANEL_AT: Record<Corner, string> = {
    tl: 'top-[9.5rem] left-5', tr: 'top-[9.5rem] right-5', bl: 'bottom-24 left-5', br: 'bottom-24 right-5',
};

/** Send time of a message; kept out of the component so it is clearly an event-time read. */
function sentAt() {
    return Date.now();
}

function isCorner(value: unknown): value is Corner {
    return value === 'tl' || value === 'tr' || value === 'bl' || value === 'br';
}

function loadConversation(key: string): number | null {
    try {
        const id = Number(sessionStorage.getItem(key));
        return Number.isSafeInteger(id) && id > 0 ? id : null;
    } catch {
        return null;
    }
}

function loadHistory(key: string): ChatMessage[] {
    try {
        const raw = sessionStorage.getItem(key);
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.filter((m): m is ChatMessage =>
            !!m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string') : [];
    } catch {
        return [];
    }
}

/** Keeps the tab's chat across reloads; images keep only their thumbnail, and are dropped if storage is full. */
function saveHistory(key: string, messages: ChatMessage[]) {
    const recent = messages.slice(-40);
    const slim = recent.map(m => m.images ? {...m, images: m.images.map(i => ({...i, src: i.thumb}))} : m);
    try {
        sessionStorage.setItem(key, JSON.stringify(slim));
    } catch {
        try {
            sessionStorage.setItem(key, JSON.stringify(recent.map(({role, content, at}) => ({role, content, at}))));
        } catch {
            // Storage unavailable: the conversation simply is not kept.
        }
    }
}

/**
 * Floating assistant (bottom-right) for every signed-in user, chatting through the AI gateway in one of two modes.
 * Each portal gets its own audience, starter questions and thread; turns are stored server-side for admin review.
 */
export function AssistantWidget({portal}: { portal: AssistantPortal }) {
    const {user, can, isAuthenticated} = useAuth();
    const {t} = useI18n();
    const allowed = isAuthenticated;
    const storageKey = `uav_assistant_history:${portal}:${user?.id ?? 'anon'}`;
    const threadKey = `uav_assistant_thread:${portal}:${user?.id ?? 'anon'}`;
    const [open, setOpen] = useState(false);
    // The panel starts closed, so reading this tab's saved conversation up front cannot cause a hydration mismatch.
    const [messages, setMessages] = useState<ChatMessage[]>(() => loadHistory(storageKey));
    const [conversationId, setConversationId] = useState<number | null>(() => loadConversation(threadKey));
    const [mode, setMode] = useState<1 | 2 | null>(null);
    const [draft, setDraft] = useState('');
    const [pending, setPending] = useState<PendingAttachment[]>([]);
    const [reading, setReading] = useState(false);
    const [dropping, setDropping] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [corner, setCorner] = useState<Corner>('br');
    const [dragging, setDragging] = useState(false);
    const [settles, setSettles] = useState(0);
    const launcher = useRef<HTMLButtonElement>(null);
    const drag = useRef<{startX: number; startY: number; box: DOMRect; x: number; y: number; moved: boolean; frame: number} | null>(null);
    const dropFrom = useRef<DOMRect | null>(null);
    const justDragged = useRef(false);
    const list = useRef<HTMLDivElement>(null);
    const input = useRef<HTMLTextAreaElement>(null);
    const picker = useRef<HTMLInputElement>(null);

    const info = useQuery({
        queryKey: assistantKeys.info,
        queryFn: ({signal}) => assistantService.info(signal),
        enabled: allowed && open,
        staleTime: 60_000,
    });
    const modes = info.data?.modes ?? [];
    const activeMode = modes.find(m => m.mode === mode) ?? modes[0] ?? null;

    useEffect(() => {
        if (open) input.current?.focus();
    }, [open]);
    useEffect(() => {
        try {
            const saved = localStorage.getItem(CORNER_KEY);
            // Read after hydration: the server render always docks bottom-right.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            if (isCorner(saved)) setCorner(saved);
            setExpanded(localStorage.getItem(EXPANDED_KEY) === '1');
        } catch {
            // Storage unavailable: stay bottom-right.
        }
    }, []);
    // FLIP: after a drop the button already sits in its new corner; start it where it was released and let it glide home.
    useLayoutEffect(() => {
        const el = launcher.current;
        const from = dropFrom.current;
        dropFrom.current = null;
        if (!el || !from) return;
        el.style.transition = 'none';
        el.style.transform = '';
        const to = el.getBoundingClientRect();
        el.style.transform = `translate(${from.left - to.left}px, ${from.top - to.top}px)`;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            el.style.transform = '';
            return;
        }
        void el.offsetWidth;
        el.style.transition = SETTLE;
        el.style.transform = '';
    }, [settles]);
    useEffect(() => {
        saveHistory(storageKey, messages);
        list.current?.scrollTo({top: list.current.scrollHeight});
    }, [messages, storageKey, corner, expanded]);
    useLayoutEffect(() => {
        const el = input.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, INPUT_MAX_HEIGHT)}px`;
    }, [draft, open]);
    useEffect(() => {
        try {
            if (conversationId) sessionStorage.setItem(threadKey, String(conversationId));
            else sessionStorage.removeItem(threadKey);
        } catch {
            // Storage unavailable: the next message simply starts a new stored thread.
        }
    }, [conversationId, threadKey]);

    const send = useMutation({
        mutationFn: ({history, files}: { history: ChatMessage[]; files: PendingAttachment[] }) =>
            assistantService.chat(activeMode!.mode, history.slice(-HISTORY_LIMIT).map((m, i, all) =>
                // Only the newest question carries real images; earlier ones just say they had some.
                i < all.length - 1 && m.images?.length ? {...m, content: `${m.content}\n${t('admin.assistant.attachedEarlier', {count: m.images.length})}`} : m),
            portal, conversationId, files.map(({kind, name, data}) => ({kind, name, data}))),
        onSuccess: reply => {
            setMessages(prev => [...prev, {role: 'assistant', content: reply.reply, at: sentAt()}]);
            if (reply.conversationId) setConversationId(reply.conversationId);
        },
        onError: error => {
            const code = error instanceof ApiError ? error.code ?? '' : '';
            const key = `admin.assistant.error.${code}`;
            const text = code ? t(key, {code}) : key;
            toast.error(text === key ? t('admin.assistant.failed', {code}) : text);
        },
    });

    if (!allowed) return null;

    const faq = FAQ[portal];
    const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
        if (event.button !== 0) return;
        justDragged.current = false;
        const el = event.currentTarget;
        el.style.transition = 'none';
        el.style.transform = '';
        drag.current = {startX: event.clientX, startY: event.clientY, box: el.getBoundingClientRect(), x: 0, y: 0, moved: false, frame: 0};
        el.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
        const d = drag.current;
        if (!d) return;
        if (!d.moved) {
            if (Math.hypot(event.clientX - d.startX, event.clientY - d.startY) < DRAG_THRESHOLD) return;
            d.moved = true;
            setDragging(true);
        }
        // Keep the whole button on screen, then paint at most once per frame without re-rendering React.
        d.x = Math.min(Math.max(-d.box.left, event.clientX - d.startX), window.innerWidth - d.box.right);
        d.y = Math.min(Math.max(-d.box.top, event.clientY - d.startY), window.innerHeight - d.box.bottom);
        const el = event.currentTarget;
        if (!d.frame) d.frame = requestAnimationFrame(() => {
            d.frame = 0;
            el.style.transform = `translate(${d.x}px, ${d.y}px)`;
        });
    };
    const endDrag = (el: HTMLButtonElement) => {
        const d = drag.current;
        drag.current = null;
        if (d?.frame) cancelAnimationFrame(d.frame);
        if (!d?.moved) return;
        justDragged.current = true;
        el.style.transform = `translate(${d.x}px, ${d.y}px)`;
        const at = el.getBoundingClientRect();
        const next: Corner = `${at.top + at.height / 2 < window.innerHeight / 2 ? 't' : 'b'}${at.left + at.width / 2 < window.innerWidth / 2 ? 'l' : 'r'}`;
        dropFrom.current = at;
        setCorner(next);
        setDragging(false);
        setSettles(n => n + 1);
        try {
            localStorage.setItem(CORNER_KEY, next);
        } catch {
            // Storage unavailable: the corner lasts until reload.
        }
    };
    const toggle = () => {
        // A drag ends with a click event too; only a press that stayed put opens the panel.
        if (justDragged.current) {
            justDragged.current = false;
            return;
        }
        setOpen(v => !v);
    };
    const clear = () => {
        setMessages([]);
        setPending([]);
        setConversationId(null);
    };
    const expand = () => setExpanded(v => {
        try {
            localStorage.setItem(EXPANDED_KEY, v ? '0' : '1');
        } catch {
            // Storage unavailable: the size lasts until reload.
        }
        return !v;
    });

    const attach = async (files: File[]) => {
        const media = files.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
        if (!media.length) return;
        setReading(true);
        let room = MAX_ATTACHMENTS - pending.length;
        const added: PendingAttachment[] = [];
        for (const file of media) {
            if (room <= 0) {
                toast.error(t('admin.assistant.attachLimit', {max: MAX_ATTACHMENTS}));
                break;
            }
            try {
                const items = file.type.startsWith('video/')
                    ? await videoAttachments(file, Math.min(FRAMES_PER_VIDEO, room))
                    : [await imageAttachment(file)];
                added.push(...items.slice(0, room));
                room -= items.length;
            } catch {
                toast.error(t('admin.assistant.attachUnreadable', {name: file.name}));
            }
        }
        setPending(prev => [...prev, ...added].slice(0, MAX_ATTACHMENTS));
        setReading(false);
        input.current?.focus();
    };
    const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
        const files = Array.from(event.clipboardData.files);
        if (!files.length) return;
        event.preventDefault();
        void attach(files);
    };
    const onDrop = (event: DragEvent<HTMLElement>) => {
        event.preventDefault();
        setDropping(false);
        void attach(Array.from(event.dataTransfer.files));
    };

    const ask = (question: string) => {
        const text = question.trim().slice(0, 4000);
        const files = pending;
        if ((!text && !files.length) || !activeMode || send.isPending || reading) return;
        const images: ChatImage[] = files.map(({kind, name, src, thumb}) => ({kind, name, src, thumb}));
        const next: ChatMessage[] = [...messages, {
            role: 'user', at: sentAt(),
            // The backend needs text with every question; an image-only message asks the model to look at them.
            content: text || t('admin.assistant.attachmentOnly'),
            ...(images.length ? {images} : {}),
        }];
        setMessages(next);
        setDraft('');
        setPending([]);
        send.mutate({history: next, files});
    };
    const submit = (event?: FormEvent) => {
        event?.preventDefault();
        ask(draft);
    };
    const onKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            submit();
        }
    };

    return <>
        {open && <section key={corner} role="dialog" aria-label={t('admin.assistant.title')}
                          onDragOver={e => {
                              if (!info.data?.enabled) return;
                              e.preventDefault();
                              setDropping(true);
                          }}
                          onDragLeave={e => e.currentTarget === e.target && setDropping(false)} onDrop={onDrop}
                          className={cn('fixed z-50 flex flex-col overflow-hidden rounded-overlay border border-slate-200 bg-white shadow-2xl',
                              'max-w-[calc(100vw-2.5rem)] animate-[assistant-pop_220ms_cubic-bezier(0.2,0.9,0.3,1.15)] motion-reduce:animate-none',
                              'transition-[width,height,opacity] duration-300 ease-out motion-reduce:transition-none',
                              expanded ? 'h-[calc(100dvh-10rem)] w-[720px]' : 'h-[480px] max-h-[calc(100dvh-10rem)] w-[330px]',
                              PANEL_AT[corner], PANEL_ORIGIN[corner], dragging && 'pointer-events-none opacity-0')}
                          onKeyDown={e => e.key === 'Escape' && setOpen(false)}>
            <header className="flex items-center gap-2.5 border-b border-slate-200 px-3 py-2">
                <SuperheroLogo size={28}/>
                <div className="min-w-0 flex-1 leading-tight">
                    <h2 className="m-0 truncate text-[13px] font-bold text-slate-900">{t('admin.assistant.title')}</h2>
                    <p className="m-0 truncate text-[10.5px] text-slate-500">{portal === 'ADMIN' ? activeMode?.model ?? t('admin.assistant.via') : activeMode?.label ?? t('admin.assistant.via')}</p>
                </div>
                <HeaderButton label={t('admin.assistant.clear')} onClick={clear} disabled={!messages.length || send.isPending}><Eraser size={15}/></HeaderButton>
                <HeaderButton label={t(expanded ? 'admin.assistant.collapse' : 'admin.assistant.expand')} onClick={expand}>
                    {expanded ? <Minimize2 size={15}/> : <Maximize2 size={15}/>}</HeaderButton>
                <HeaderButton label={t('admin.assistant.close')} onClick={() => setOpen(false)}><X size={16}/></HeaderButton>
            </header>

            <div ref={list} className="relative flex-1 space-y-2.5 overflow-y-auto bg-slate-50/60 px-2.5 py-2.5" aria-live="polite">
                {info.isPending ? <p className="m-0 text-center text-xs text-slate-500" role="status">{t('admin.assistant.loading')}</p>
                    : !info.data?.enabled ? <div className="m-auto max-w-[280px] py-8 text-center">
                        <SuperheroLogo size={56}/>
                        <p className="mb-2 mt-3 text-sm font-semibold text-slate-800">{t('admin.assistant.offTitle')}</p>
                        <p className="m-0 text-xs text-slate-500">{t(can('PERMISSION_MANAGE') ? 'admin.assistant.offBody' : 'admin.assistant.offBodyUser')}</p>
                        {can('PERMISSION_MANAGE') && <Link href="/admin/settings#assistant" onClick={() => setOpen(false)}
                                                           className="mt-3 inline-flex h-8 items-center rounded-control bg-primary px-3 text-xs font-bold text-primary-foreground hover:bg-primary-hover">
                            {t('admin.assistant.openSettings')}</Link>}
                    </div>
                    : !messages.length ? <div className="text-center">
                        <p className="mb-0.5 mt-0 text-sm font-semibold text-slate-800">{t('admin.assistant.hello', {name: user?.fullName || user?.username || ''})}</p>
                        <p className="m-0 text-xs text-slate-500">{t(`admin.assistant.${HELLO_BODY[portal]}`)}</p>
                        <p className="mb-1 mt-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-slate-500">{t('admin.assistant.faqTitle')}</p>
                        <ul className={cn('m-0 grid list-none gap-1 p-0 text-left', expanded && 'sm:grid-cols-2')}>{faq.keys.map(key => <li key={key}>
                            <button type="button" onClick={() => ask(t(`admin.assistant.${faq.group}.${key}`))} disabled={send.isPending}
                                    className="w-full rounded-control border border-slate-200 bg-white px-2.5 py-1 text-left text-[12.5px] leading-5 text-slate-700 transition-colors hover:border-primary hover:bg-uav-red-light hover:text-primary disabled:opacity-60">
                                {t(`admin.assistant.${faq.group}.${key}`)}</button>
                        </li>)}</ul>
                    </div>
                    : <ChatMessages messages={messages}/>}
                {send.isPending && <div className="flex items-center gap-2" role="status" aria-label={t('admin.assistant.thinking')}>
                    <SuperheroLogo size={26}/>
                    <span className="inline-flex gap-1 rounded-overlay border border-slate-200 bg-white px-3 py-2.5">
                        {[0, 150, 300].map(d => <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{animationDelay: `${d}ms`}}/>)}
                    </span></div>}
                {dropping && <div className="pointer-events-none absolute inset-2 flex items-center justify-center rounded-overlay border-2 border-dashed border-primary bg-uav-red-light/80 text-sm font-semibold text-primary">
                    {t('admin.assistant.dropHere')}</div>}
            </div>

            <form onSubmit={submit} className="border-t border-slate-200 bg-white p-1.5">
                {(pending.length > 0 || reading) && <ul className="m-0 mb-2 flex list-none gap-1.5 overflow-x-auto p-0" aria-label={t('admin.assistant.attachments')}>
                    {pending.map(a => <li key={a.id} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-control border border-slate-200 bg-slate-100">
                        {/* eslint-disable-next-line @next/next/no-img-element -- data URLs need no optimisation */}
                        <img src={a.thumb} alt={a.name ?? ''} className="h-full w-full object-cover"/>
                        {a.kind === 'VIDEO_FRAME' && <Film size={11} className="absolute bottom-1 left-1 text-white drop-shadow" aria-hidden="true"/>}
                        <button type="button" onClick={() => setPending(prev => prev.filter(x => x.id !== a.id))} aria-label={t('admin.assistant.removeAttachment', {name: a.name ?? ''})}
                                className="absolute right-0.5 top-0.5 rounded-full bg-slate-900/70 p-0.5 text-white hover:bg-slate-900"><X size={10}/></button>
                    </li>)}
                    {reading && <li className="flex h-14 w-14 shrink-0 items-center justify-center rounded-control border border-dashed border-slate-300 text-[10px] text-slate-500" role="status">
                        <span className="animate-pulse">{t('admin.assistant.reading')}</span></li>}
                </ul>}
                <div className="rounded-control border border-slate-300 transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                    <textarea ref={input} rows={1} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={onKey} onPaste={onPaste}
                              disabled={!info.data?.enabled} aria-label={t('admin.assistant.input')} placeholder={t('admin.assistant.placeholder')}
                              className="block max-h-[120px] w-full resize-none bg-transparent px-2.5 pb-1 pt-2 text-[13px] leading-5 placeholder:truncate placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed"/>
                    <div className="flex items-center gap-1 px-1 pb-1">
                        <input ref={picker} type="file" accept="image/*,video/*" multiple hidden
                               onChange={e => {
                                   void attach(Array.from(e.target.files ?? []));
                                   e.target.value = '';
                               }}/>
                        <button type="button" onClick={() => picker.current?.click()} disabled={!info.data?.enabled || reading || pending.length >= MAX_ATTACHMENTS}
                                aria-label={t('admin.assistant.attach')} title={t('admin.assistant.attach')}
                                className="rounded-control p-1.5 text-slate-500 hover:bg-slate-100 hover:text-primary disabled:opacity-40"><Paperclip size={16}/></button>
                        {modes.length > 1 && <div role="radiogroup" aria-label={t('admin.assistant.mode')} className="inline-flex shrink-0 rounded-control bg-slate-100 p-0.5">
                            {modes.map(m => <button key={m.mode} type="button" role="radio" aria-checked={activeMode?.mode === m.mode} disabled={send.isPending}
                                                    onClick={() => setMode(m.mode)} title={portal === 'ADMIN' ? m.model : undefined}
                                                    className={cn('whitespace-nowrap rounded-[3px] px-1.5 py-0 text-[11px] font-semibold leading-5 transition-colors',
                                                        activeMode?.mode === m.mode ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-800')}>
                                {m.label}</button>)}
                        </div>}
                        <button type="submit" disabled={(!draft.trim() && !pending.length) || !activeMode || send.isPending || reading || !info.data?.enabled}
                                aria-label={t('admin.assistant.send')} title={t('admin.assistant.send')}
                                className="ml-auto inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-control bg-primary text-primary-foreground transition-opacity hover:bg-primary-hover disabled:opacity-40">
                            <SendHorizontal size={14}/></button>
                    </div>
                </div>
            </form>
        </section>}

        <button type="button" onClick={toggle} aria-expanded={open}
                ref={launcher} onPointerDown={onPointerDown} onPointerMove={onPointerMove}
                onPointerUp={e => endDrag(e.currentTarget)} onPointerCancel={e => endDrag(e.currentTarget)}
                onTransitionEnd={e => {
                    if (e.propertyName === 'transform') e.currentTarget.style.transition = '';
                }}
                aria-label={open ? t('admin.assistant.close') : t('admin.assistant.open')} title={t('admin.assistant.title')}
                className={cn('fixed z-50 flex h-14 w-14 touch-none select-none items-center justify-center rounded-full border-2 bg-white will-change-transform',
                    'transition-[scale,box-shadow,border-color] duration-200 ease-out motion-reduce:transition-none',
                    LAUNCHER_AT[corner], dragging ? 'scale-110 cursor-grabbing border-primary shadow-2xl' : 'cursor-grab shadow-xl hover:scale-105 active:scale-95',
                    !dragging && (open ? 'border-primary' : 'border-slate-200 hover:border-primary'))}>
            <SuperheroLogo size={42} title={t('admin.assistant.title')}/>
        </button>
    </>;
}

function HeaderButton({label, onClick, disabled, children}: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
    return <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label}
                   className="rounded-control p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40">{children}</button>;
}

