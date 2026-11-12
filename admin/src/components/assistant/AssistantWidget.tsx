'use client';

import {type DragEvent, useEffect, useRef, useState} from 'react';
import {useAuth} from '@/providers/AuthContext';
import {ApiError} from '@/lib/api';
import {useI18n} from '@/providers/I18nContext';
import {toast} from '@/providers/ToastContext';
import {useAssistantChat, useAssistantInfo} from '@/hooks/assistant/useAssistant';
import type {
    AssistantCorner as Corner,
    AssistantPortal,
    ChatImage,
    ChatMessage,
    PendingAttachment,
} from '@/types/assistant/assistant.types';
import {
    AssistantWidgetLauncher,
    CORNER_KEY,
    EXPANDED_KEY,
    isCorner,
    PANEL_AT,
    PANEL_ORIGIN,
} from '@/components/assistant/AssistantWidgetLauncher';
import {AssistantWidgetHeader} from '@/components/assistant/AssistantWidgetHeader';
import {AssistantWidgetMessageList} from '@/components/assistant/AssistantWidgetMessageList';
import {AssistantWidgetComposer, readMediaAttachments} from '@/components/assistant/AssistantWidgetComposer';
import {MAX_ATTACHMENTS} from '@/utils/assistant/attachments';
import {cn} from '@/lib/utils';

/** History sent back to the model; older turns are dropped so each request stays small. */
const HISTORY_LIMIT = 12;

/** Send time of a message; kept out of the component so it is clearly an event-time read. */
function sentAt() {
    return Date.now();
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
    const slim = recent.map((m) => (m.images ? {...m, images: m.images.map((i) => ({...i, src: i.thumb}))} : m));
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
    const list = useRef<HTMLDivElement>(null);
    const input = useRef<HTMLTextAreaElement>(null);

    const info = useAssistantInfo(isAuthenticated && open);
    const modes = info.data?.modes ?? [];
    const activeMode = modes.find((m) => m.mode === mode) ?? modes[0] ?? null;

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

    useEffect(() => {
        saveHistory(storageKey, messages);
        list.current?.scrollTo({top: list.current.scrollHeight});
    }, [messages, storageKey, corner, expanded]);

    useEffect(() => {
        try {
            if (conversationId) sessionStorage.setItem(threadKey, String(conversationId));
            else sessionStorage.removeItem(threadKey);
        } catch {
            // Storage unavailable: the next message simply starts a new stored thread.
        }
    }, [conversationId, threadKey]);

    const send = useAssistantChat({
        onSuccess: (reply) => {
            setMessages((prev) => [...prev, {role: 'assistant', content: reply.reply, at: sentAt()}]);
            if (reply.conversationId) setConversationId(reply.conversationId);
        },
        onError: (error) => {
            const code = error instanceof ApiError ? (error.code ?? '') : '';
            const key = `admin.assistant.error.${code}`;
            const text = code ? t(key, {code}) : key;
            toast.error(text === key ? t('admin.assistant.failed', {code}) : text);
        },
    });

    if (!isAuthenticated) return null;

    const clear = () => {
        setMessages([]);
        setPending([]);
        setConversationId(null);
    };

    const expand = () => setExpanded((v) => {
        try {
            localStorage.setItem(EXPANDED_KEY, v ? '0' : '1');
        } catch {
            // Storage unavailable: the size lasts until reload.
        }
        return !v;
    });

    const attach = async (files: File[]) => {
        if (!files.some((f) => f.type.startsWith('image/') || f.type.startsWith('video/'))) return;
        setReading(true);
        const added = await readMediaAttachments(
            files,
            pending.length,
            () => toast.error(t('admin.assistant.attachLimit', {max: MAX_ATTACHMENTS})),
            (name) => toast.error(t('admin.assistant.attachUnreadable', {name})),
        );
        if (added.length) setPending((prev) => [...prev, ...added].slice(0, MAX_ATTACHMENTS));
        setReading(false);
        input.current?.focus();
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
            role: 'user',
            at: sentAt(),
            content: text || t('admin.assistant.attachmentOnly'),
            ...(images.length ? {images} : {}),
        }];
        setMessages(next);
        setDraft('');
        setPending([]);
        send.mutate({
            mode: activeMode.mode,
            messages: next.slice(-HISTORY_LIMIT).map((m, i, all) =>
                i < all.length - 1 && m.images?.length
                    ? {...m, content: `${m.content}\n${t('admin.assistant.attachedEarlier', {count: m.images.length})}`}
                    : m),
            portal,
            conversationId,
            attachments: files.map(({kind, name, data}) => ({kind, name, data})),
        });
    };

    const subtitle = portal === 'ADMIN' ? (activeMode?.model ?? t('admin.assistant.via')) : (activeMode?.label ?? t('admin.assistant.via'));
    const enabled = Boolean(info.data?.enabled);

    return (
        <>
            {open && (
                <section
                    key={corner} role="dialog" aria-label={t('admin.assistant.title')}
                    onDragOver={(e) => {
                        if (!enabled) return;
                        e.preventDefault();
                        setDropping(true);
                    }}
                    onDragLeave={(e) => e.currentTarget === e.target && setDropping(false)}
                    onDrop={onDrop} onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
                    className={cn(
                        'fixed z-50 flex flex-col overflow-hidden rounded-overlay border border-slate-200 bg-white shadow-2xl',
                        'max-w-[calc(100vw-2.5rem)] animate-[assistant-pop_220ms_cubic-bezier(0.2,0.9,0.3,1.15)] motion-reduce:animate-none',
                        'transition-[width,height,opacity] duration-300 ease-out motion-reduce:transition-none',
                        expanded ? 'h-[calc(100dvh-10rem)] w-[720px]' : 'h-[480px] max-h-[calc(100dvh-10rem)] w-[330px]',
                        PANEL_AT[corner], PANEL_ORIGIN[corner], dragging && 'pointer-events-none opacity-0',
                    )}
                >
                    <AssistantWidgetHeader
                        subtitle={subtitle} hasMessages={messages.length > 0} isSending={send.isPending}
                        expanded={expanded} onClear={clear} onToggleExpand={expand} onClose={() => setOpen(false)}
                    />
                    <AssistantWidgetMessageList
                        portal={portal} listRef={list} messages={messages} isInfoPending={info.isPending}
                        enabled={enabled} canManageSettings={can('USER_PERMISSION_MANAGE')}
                        displayName={user?.fullName || user?.username || ''} expanded={expanded}
                        isSending={send.isPending} dropping={dropping} onAsk={ask} onClose={() => setOpen(false)}
                    />
                    <AssistantWidgetComposer
                        portal={portal} open={open} enabled={enabled} draft={draft} pending={pending}
                        reading={reading} isSending={send.isPending} modes={modes} activeMode={activeMode}
                        inputRef={input} onDraftChange={setDraft} onSelectMode={setMode}
                        onAttachFiles={(files) => void attach(files)}
                        onRemoveAttachment={(id) => setPending((prev) => prev.filter((x) => x.id !== id))}
                        onSubmit={() => ask(draft)}
                    />
                </section>
            )}
            <AssistantWidgetLauncher
                open={open} corner={corner} dragging={dragging} title={t('admin.assistant.title')}
                ariaLabel={open ? t('admin.assistant.close') : t('admin.assistant.open')}
                onToggle={() => setOpen((v) => !v)} onCornerChange={setCorner} onDraggingChange={setDragging}
            />
        </>
    );
}
