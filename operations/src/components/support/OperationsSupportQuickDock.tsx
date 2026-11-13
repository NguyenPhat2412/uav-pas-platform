'use client';

import Image from 'next/image';
import {useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent} from 'react';
import {ArrowLeft, MessagesSquare, Send, X, Zap} from 'lucide-react';
import {
    formatOpsSupportSource,
    formatOpsSupportTime,
    formatOpsSupportTopic,
    OPS_SUPPORT_STATUS_META,
    personalizeOpsQuickReply,
    prioritizeOpsQuickReplies,
    useOperationsSupportRealtime,
    useOpsReplySupportThread,
    useOpsSupportQuickReplies,
    useOpsSupportSummary,
    useOpsSupportThreadDetail,
    useOpsSupportThreads,
} from '@/hooks/support/useOperationsSupport';
import {cn} from '@/lib/utils';
import {useAuth} from '@/providers/AuthContext';
import {toast} from '@/providers/ToastContext';

export function OperationsSupportQuickDock() {
    const {isAuthenticated, permissionsReady, can} = useAuth();
    const allowed = isAuthenticated && permissionsReady && can('SUPPORT_MANAGE');

    const [open, setOpen] = useState(false);
    const [activeThreadId, setActiveThreadId] = useState<number | null>(null);
    const [draft, setDraft] = useState('');
    const listRef = useRef<HTMLDivElement>(null);
    const stopTypingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const {wsConnected, typingByThread, notifyAdminTyping} = useOperationsSupportRealtime(allowed);
    const summaryQuery = useOpsSupportSummary(allowed);
    const threadsQuery = useOpsSupportThreads(allowed && open);
    const detailQuery = useOpsSupportThreadDetail(open ? activeThreadId : null);
    const quickRepliesQuery = useOpsSupportQuickReplies(allowed && open);
    const replyMutation = useOpsReplySupportThread();

    const unreadMessages = summaryQuery.data?.unreadMessages ?? 0;
    const prioritizedThreads = [...(threadsQuery.data?.content ?? [])].sort((a, b) => {
        if ((b.unreadForAdmin > 0) !== (a.unreadForAdmin > 0)) return b.unreadForAdmin > 0 ? 1 : -1;
        if ((a.status === 'RESOLVED') !== (b.status === 'RESOLVED')) return a.status === 'RESOLVED' ? 1 : -1;
        return 0;
    });

    const activeThread = detailQuery.data?.thread;
    const messages = detailQuery.data?.messages ?? [];
    const quickReplies = prioritizeOpsQuickReplies(quickRepliesQuery.data ?? [], activeThread?.topic);
    const activeVisitorTyping = activeThreadId ? typingByThread[activeThreadId] : undefined;

    useEffect(() => {
        listRef.current?.scrollTo({top: listRef.current.scrollHeight, behavior: 'smooth'});
    }, [activeThreadId, messages.length, activeVisitorTyping]);

    useEffect(() => () => {
        if (stopTypingRef.current) clearTimeout(stopTypingRef.current);
    }, []);

    if (!allowed) return null;

    const handleDraftChange = (e: ChangeEvent<HTMLInputElement>) => {
        const next = e.target.value;
        setDraft(next);
        if (!activeThreadId) return;
        if (stopTypingRef.current) clearTimeout(stopTypingRef.current);
        if (next.trim().length > 0) {
            notifyAdminTyping(activeThreadId, true);
            stopTypingRef.current = setTimeout(() => notifyAdminTyping(activeThreadId, false), 2500);
        } else {
            notifyAdminTyping(activeThreadId, false);
        }
    };

    const handleSend = async (text: string, clearComposer = false) => {
        const trimmed = text.trim();
        if (!trimmed || !activeThread || replyMutation.isPending) return;
        const status = activeThread.status === 'OPEN' ? 'IN_PROGRESS' : activeThread.status;
        try {
            if (stopTypingRef.current) clearTimeout(stopTypingRef.current);
            notifyAdminTyping(activeThread.id, false);
            await replyMutation.mutateAsync({id: activeThread.id, content: trimmed, status});
            if (clearComposer) setDraft('');
            toast.success(`Đã phản hồi cho ${activeThread.fullName}.`);
        } catch {
            toast.error('Không thể gửi tin nhắn phản hồi. Vui lòng thử lại.');
        }
    };

    const onComposerKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void handleSend(draft, true);
        }
    };

    return (
        <>
            {open && (
                <section role="dialog" aria-label="Hỗ trợ khách hàng trực tuyến" onKeyDown={e => e.key === 'Escape' && setOpen(false)}
                         className="fixed bottom-38 right-5 z-50 flex max-h-[calc(100dvh-11rem)] w-[min(400px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-overlay border border-rose-200 bg-white shadow-2xl">
                    <header className="flex items-center justify-between gap-2 border-b border-rose-100 bg-rose-50/70 px-3.5 py-2.5">
                        <div className="flex min-w-0 items-center gap-2">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-rose-200 bg-white p-1">
                                <Image src="/uav-pas-logo.svg" alt="UAV PAS" width={20} height={20} className="h-5 w-5 object-contain"/>
                            </span>
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <strong className="truncate text-xs font-extrabold text-slate-900">Hỗ trợ khách hàng trực tuyến</strong>
                                    <span className={cn('h-2 w-2 shrink-0 rounded-full', wsConnected ? 'bg-primary animate-pulse' : 'bg-amber-500')}
                                          title={wsConnected ? 'Kết nối WebSocket trực tiếp' : 'Đang đồng bộ lại'}/>
                                </div>
                                <span className="text-[11px] font-medium text-slate-500">
                                    {wsConnected ? 'Đẩy tức thì · Cổng Điều hành' : 'Đang đồng bộ dự phòng'}
                                </span>
                            </div>
                        </div>
                        <button type="button" onClick={() => setOpen(false)} aria-label="Đóng bảng hỗ trợ"
                                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-control text-slate-500 hover:bg-white hover:text-slate-900 cursor-pointer">
                            <X size={15}/>
                        </button>
                    </header>

                    {activeThreadId === null ? (
                        <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                            {prioritizedThreads.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-1.5 px-5 py-10 text-center">
                                    <MessagesSquare size={24} className="text-slate-300"/>
                                    <p className="text-xs font-bold text-slate-700">Chưa có tin nhắn hỗ trợ mới</p>
                                    <p className="text-[11px] text-slate-500">Tin nhắn từ khách hàng sẽ đẩy trực tiếp tại đây qua WebSocket.</p>
                                </div>
                            ) : prioritizedThreads.map(item => (
                                <button key={item.id} type="button" onClick={() => { setActiveThreadId(item.id); setDraft(''); }}
                                        className={cn(
                                            'flex w-full flex-col gap-1 px-3.5 py-2.5 text-left transition-colors cursor-pointer',
                                            item.unreadForAdmin > 0 ? 'bg-rose-50/45 hover:bg-rose-50/80' : 'hover:bg-slate-50',
                                        )}>
                                    <div className="flex items-center justify-between gap-2">
                                        <strong className="truncate text-xs font-bold text-slate-900">{item.fullName}</strong>
                                        <div className="flex shrink-0 items-center gap-1.5">
                                            {item.unreadForAdmin > 0 && (
                                                <span className="rounded-full bg-primary px-1.5 py-0.2 text-[10px] font-extrabold text-white">
                                                    {item.unreadForAdmin} mới
                                                </span>
                                            )}
                                            <span className="text-[10.5px] text-slate-400">{formatOpsSupportTime(item.updatedAt)}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500">
                                        <span className={cn('rounded-badge px-1.5 py-0.2 font-semibold ring-1 ring-inset', OPS_SUPPORT_STATUS_META[item.status].badgeClass)}>
                                            {OPS_SUPPORT_STATUS_META[item.status].label}
                                        </span>
                                        <span className="truncate">{formatOpsSupportTopic(item.topic)} · {formatOpsSupportSource(item.source)}</span>
                                    </div>
                                    {typingByThread[item.id] ? (
                                        <p className="m-0 text-[11px] font-semibold text-primary">Đang nhập tin nhắn...</p>
                                    ) : (
                                        <p className="m-0 line-clamp-1 text-[11.5px] text-slate-600">
                                            {item.lastSenderRole === 'ADMIN' ? 'Bạn: ' : ''}{item.lastMessagePreview || 'Yêu cầu tư vấn mới'}
                                        </p>
                                    )}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col overflow-hidden">
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
                                <button type="button" onClick={() => setActiveThreadId(null)}
                                        className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-primary cursor-pointer">
                                    <ArrowLeft size={13}/> Danh sách
                                </button>
                                {activeThread && (
                                    <span className="truncate text-xs font-semibold text-slate-800">
                                        {activeThread.fullName} · <small className="text-slate-400">{activeThread.code}</small>
                                    </span>
                                )}
                            </div>

                            <div ref={listRef} className="max-h-56 space-y-2 overflow-y-auto bg-slate-50/40 p-3">
                                {messages.slice(-10).map(msg => {
                                    const isAdmin = msg.senderRole === 'ADMIN';
                                    return (
                                        <div key={msg.id} className={cn('flex flex-col', isAdmin ? 'items-end' : 'items-start')}>
                                            <span className="mb-0.5 text-[10px] text-slate-400">{msg.senderName} · {formatOpsSupportTime(msg.createdAt)}</span>
                                            <div className={cn(
                                                'max-w-[86%] rounded-xl px-3 py-1.5 text-xs leading-relaxed whitespace-pre-wrap',
                                                isAdmin ? 'bg-primary text-primary-foreground' : 'border border-slate-200 bg-white text-slate-800',
                                            )}>
                                                {msg.content}
                                            </div>
                                        </div>
                                    );
                                })}
                                {activeVisitorTyping && (
                                    <p className="m-0 text-[11px] font-medium italic text-primary" role="status">
                                        {activeVisitorTyping} đang nhập...
                                    </p>
                                )}
                            </div>

                            {activeThread && quickReplies.length > 0 && (
                                <div className="border-t border-slate-100 bg-rose-50/35 px-3 py-2">
                                    <p className="mb-1 flex items-center gap-1 text-[10.5px] font-bold text-primary">
                                        <Zap size={11}/> Chạm để điền hoặc ⚡ gửi ngay
                                    </p>
                                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                                        {quickReplies.slice(0, 6).map(qr => {
                                            const text = personalizeOpsQuickReply(qr.content, activeThread.fullName);
                                            return (
                                                <div key={qr.id} className="inline-flex shrink-0 items-center overflow-hidden rounded-control border border-rose-200 bg-white text-[11px]">
                                                    <button type="button" onClick={() => setDraft(text)} title={text}
                                                            className="max-w-32 truncate px-2 py-0.5 font-medium text-slate-700 hover:bg-slate-50 cursor-pointer">
                                                        {qr.title}
                                                    </button>
                                                    <button type="button" disabled={replyMutation.isPending} onClick={() => void handleSend(text)}
                                                            title={`Gửi ngay: ${text}`}
                                                            className="border-l border-rose-100 bg-rose-50 px-1.5 py-0.5 font-bold text-primary hover:bg-primary hover:text-white cursor-pointer">
                                                        ⚡
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-1.5 border-t border-slate-200 bg-white p-2.5">
                                <input type="text" value={draft} onChange={handleDraftChange} onKeyDown={onComposerKeyDown}
                                       placeholder="Nhập phản hồi nhanh..."
                                       className="h-8 flex-1 rounded-control border border-border px-2.5 text-xs text-slate-900 focus:border-primary focus:outline-none"/>
                                <button type="button" disabled={!draft.trim() || replyMutation.isPending} onClick={() => void handleSend(draft, true)}
                                        aria-label="Gửi phản hồi nhanh"
                                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-primary text-white hover:bg-primary-hover disabled:opacity-50 cursor-pointer">
                                    <Send size={13}/>
                                </button>
                            </div>
                        </div>
                    )}
                </section>
            )}

            <div className="fixed bottom-22 right-5 z-40">
                <button type="button" onClick={() => setOpen(prev => !prev)} aria-expanded={open}
                        aria-label="Hỗ trợ khách hàng trực tuyến" title="Hỗ trợ khách hàng trực tuyến"
                        className={cn(
                            'relative flex h-13 w-13 items-center justify-center rounded-full border-2 bg-white shadow-xl transition-transform duration-200 hover:scale-105 active:scale-95 cursor-pointer',
                            unreadMessages > 0 ? 'border-rose-500 ring-4 ring-rose-500/20' : 'border-rose-200 hover:border-primary',
                        )}>
                    {unreadMessages > 0 ? (
                        <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full bg-rose-400/50 animate-ping"/>
                    ) : (
                        <span aria-hidden="true" className="pointer-events-none absolute -inset-1 rounded-full border border-rose-300/60 animate-pulse"/>
                    )}
                    <Image src="/uav-pas-logo.svg" alt="UAV PAS Support" width={30} height={30} className="relative z-10 h-[30px] w-[30px] object-contain"/>
                    {unreadMessages > 0 && (
                        <span className="absolute -right-1 -top-1 z-20 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10.5px] font-extrabold leading-none text-white shadow-sm ring-2 ring-white">
                            {unreadMessages > 99 ? '99+' : unreadMessages}
                        </span>
                    )}
                </button>
            </div>
        </>
    );
}
