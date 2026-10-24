'use client';

import Link from 'next/link';
import {type FormEvent, type KeyboardEvent, useEffect, useRef, useState} from 'react';
import {useMutation, useQuery} from '@tanstack/react-query';
import {Eraser, SendHorizontal, X} from 'lucide-react';
import {useAuth} from '@/contexts/AuthContext';
import {ApiError} from '@/lib/api';
import {useI18n} from '@/contexts/I18nContext';
import {toast} from '@/contexts/ToastContext';
import {assistantKeys, assistantService} from '@/features/assistant/services/assistant.service';
import type {AssistantMessage, AssistantPortal} from '@/features/assistant/types/assistant.types';
import {SuperheroLogo} from '@/features/assistant/components/SuperheroLogo';
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

function loadConversation(key: string): number | null {
    try {
        const id = Number(sessionStorage.getItem(key));
        return Number.isSafeInteger(id) && id > 0 ? id : null;
    } catch {
        return null;
    }
}

function loadHistory(key: string): AssistantMessage[] {
    try {
        const raw = sessionStorage.getItem(key);
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.filter((m): m is AssistantMessage =>
            !!m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string') : [];
    } catch {
        return [];
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
    const [messages, setMessages] = useState<AssistantMessage[]>(() => loadHistory(storageKey));
    const [conversationId, setConversationId] = useState<number | null>(() => loadConversation(threadKey));
    const [mode, setMode] = useState<1 | 2 | null>(null);
    const [draft, setDraft] = useState('');
    const list = useRef<HTMLDivElement>(null);
    const input = useRef<HTMLTextAreaElement>(null);

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
            sessionStorage.setItem(storageKey, JSON.stringify(messages.slice(-40)));
        } catch {
            // Storage unavailable: the conversation simply is not kept.
        }
        list.current?.scrollTo({top: list.current.scrollHeight});
    }, [messages, storageKey]);
    useEffect(() => {
        try {
            if (conversationId) sessionStorage.setItem(threadKey, String(conversationId));
            else sessionStorage.removeItem(threadKey);
        } catch {
            // Storage unavailable: the next message simply starts a new stored thread.
        }
    }, [conversationId, threadKey]);

    const send = useMutation({
        mutationFn: (history: AssistantMessage[]) =>
            assistantService.chat(activeMode!.mode, history.slice(-HISTORY_LIMIT), portal, conversationId),
        onSuccess: reply => {
            setMessages(prev => [...prev, {role: 'assistant', content: reply.reply}]);
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
    const clear = () => {
        setMessages([]);
        setConversationId(null);
    };

    const ask = (question: string) => {
        const text = question.trim();
        if (!text || !activeMode || send.isPending) return;
        const next: AssistantMessage[] = [...messages, {role: 'user', content: text.slice(0, 4000)}];
        setMessages(next);
        setDraft('');
        send.mutate(next);
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
        {open && <section role="dialog" aria-label={t('admin.assistant.title')}
                          className="fixed bottom-24 right-5 z-50 flex h-[560px] max-h-[calc(100dvh-8rem)] w-[380px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-overlay border border-slate-200 bg-white shadow-2xl"
                          onKeyDown={e => e.key === 'Escape' && setOpen(false)}>
            <header className="flex items-center gap-3 border-b border-slate-200 bg-slate-50/70 px-3.5 py-2.5">
                <SuperheroLogo size={34}/>
                <div className="min-w-0 flex-1">
                    <h2 className="m-0 truncate text-sm font-bold text-slate-900">{t('admin.assistant.title')}</h2>
                    <p className="m-0 truncate font-mono text-[11px] text-slate-500">{portal === 'ADMIN' ? activeMode?.model ?? t('admin.assistant.via') : activeMode?.label ?? t('admin.assistant.via')}</p>
                </div>
                <button type="button" onClick={clear} disabled={!messages.length || send.isPending}
                        aria-label={t('admin.assistant.clear')} title={t('admin.assistant.clear')}
                        className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"><Eraser size={16}/></button>
                <button type="button" onClick={() => setOpen(false)} aria-label={t('admin.assistant.close')}
                        className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={16}/></button>
            </header>

            {modes.length > 0 && <div role="radiogroup" aria-label={t('admin.assistant.mode')} className="grid grid-cols-2 gap-px border-b border-slate-200 bg-slate-200">
                {[1, 2].map(n => {
                    const m = modes.find(x => x.mode === n);
                    const active = activeMode?.mode === n;
                    return <button key={n} type="button" role="radio" aria-checked={active} disabled={!m || send.isPending}
                                   onClick={() => m && setMode(m.mode)}
                                   className={cn('px-3 py-2 text-left text-xs font-bold transition-colors disabled:cursor-not-allowed',
                                       active ? 'bg-uav-red-light text-primary shadow-[inset_0_-2px_0_var(--primary)]' : 'bg-white text-slate-600 hover:bg-slate-50',
                                       !m && 'text-slate-300')}>
                        {m?.label ?? t('admin.assistant.modeUnset', {n})}
                    </button>;
                })}
            </div>}

            <div ref={list} className="flex-1 space-y-3 overflow-y-auto bg-slate-50/40 p-3.5" aria-live="polite">
                {info.isPending ? <p className="m-0 text-center text-xs text-slate-500" role="status">{t('admin.assistant.loading')}</p>
                    : !info.data?.enabled ? <div className="m-auto max-w-[280px] py-8 text-center">
                        <SuperheroLogo size={64}/>
                        <p className="mb-2 mt-3 text-sm font-semibold text-slate-800">{t('admin.assistant.offTitle')}</p>
                        <p className="m-0 text-xs text-slate-500">{t(can('PERMISSION_MANAGE') ? 'admin.assistant.offBody' : 'admin.assistant.offBodyUser')}</p>
                        {can('PERMISSION_MANAGE') && <Link href="/admin/settings#assistant" onClick={() => setOpen(false)}
                                                           className="mt-3 inline-flex h-8 items-center bg-primary px-3 text-xs font-bold text-primary-foreground hover:bg-primary-hover">
                            {t('admin.assistant.openSettings')}</Link>}
                    </div>
                    : !messages.length ? <div className="py-8 text-center">
                        <SuperheroLogo size={64}/>
                        <p className="mb-1 mt-3 text-sm font-semibold text-slate-800">{t('admin.assistant.hello', {name: user?.fullName || user?.username || ''})}</p>
                        <p className="m-0 text-xs text-slate-500">{t(`admin.assistant.${HELLO_BODY[portal]}`)}</p>
                        <div className="mt-4 text-left">
                            <p className="mb-1.5 mt-0 text-[11px] font-bold uppercase tracking-wider text-slate-500">{t('admin.assistant.faqTitle')}</p>
                            <ul className="m-0 grid list-none gap-1.5 p-0">{faq.keys.map(key => <li key={key}>
                                <button type="button" onClick={() => ask(t(`admin.assistant.${faq.group}.${key}`))} disabled={send.isPending}
                                        className="w-full rounded-control border border-slate-200 bg-white px-3 py-2 text-left text-[12.5px] font-medium text-slate-700 transition-colors hover:border-primary hover:bg-uav-red-light hover:text-primary disabled:opacity-60">
                                    {t(`admin.assistant.${faq.group}.${key}`)}</button>
                            </li>)}</ul>
                        </div>
                    </div>
                    : messages.map((m, i) => <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start gap-2')}>
                        {m.role === 'assistant' && <span className="mt-0.5 shrink-0"><SuperheroLogo size={22}/></span>}
                        <p className={cn('m-0 max-w-[85%] whitespace-pre-wrap break-words rounded-control border px-3 py-2 text-[13px] leading-relaxed',
                            m.role === 'user' ? 'border-primary bg-primary text-primary-foreground' : 'border-slate-200 bg-white text-slate-800')}>{m.content}</p>
                    </div>)}
                {send.isPending && <div className="flex items-center gap-2 text-xs text-slate-500" role="status">
                    <SuperheroLogo size={22}/><span className="animate-pulse">{t('admin.assistant.thinking')}</span></div>}
            </div>

            {info.data?.enabled && <p className="m-0 border-t border-slate-200 bg-slate-50/70 px-3 py-1.5 text-[10.5px] leading-snug text-slate-500">
                {t('admin.assistant.privacy')}</p>}
            <form onSubmit={submit} className="flex items-end gap-2 border-t border-slate-200 p-2.5">
                <textarea ref={input} rows={2} maxLength={4000} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={onKey}
                          disabled={!info.data?.enabled} aria-label={t('admin.assistant.input')} placeholder={t('admin.assistant.placeholder')}
                          className="min-h-[44px] flex-1 resize-none rounded-control border border-slate-300 px-2.5 py-2 text-[13px] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-slate-100"/>
                <button type="submit" disabled={!draft.trim() || !activeMode || send.isPending || !info.data?.enabled}
                        aria-label={t('admin.assistant.send')}
                        className="rounded-control inline-flex h-11 w-11 shrink-0 items-center justify-center bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-50">
                    <SendHorizontal size={18}/></button>
            </form>
        </section>}

        <button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open}
                aria-label={open ? t('admin.assistant.close') : t('admin.assistant.open')} title={t('admin.assistant.title')}
                className={cn('fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full border-2 bg-white shadow-xl transition-colors',
                    open ? 'border-primary' : 'border-slate-200 hover:border-primary')}>
            <SuperheroLogo size={42} title={t('admin.assistant.title')}/>
        </button>
    </>;
}
