'use client';

import {useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent} from 'react';
import {Building2, CheckCircle2, Clock, Mail, Phone, RotateCcw, Send, Settings2, Trash2, User, Zap} from 'lucide-react';
import {ErrorNotice, QueryState} from '@/components/data/WorkspaceState';
import {Button} from '@/components/ui';
import {
    personalizeQuickReply,
    useDeleteSupportThread,
    useReplySupportThread,
    useSupportThreadDetail,
    useUpdateSupportStatus,
} from '@/hooks/support/useAdminSupport';
import {cn} from '@/lib/utils';
import {confirmDialog} from '@/providers/ConfirmContext';
import {toast} from '@/providers/ToastContext';
import type {SupportQuickReply, SupportThreadStatus} from '@/types/support/support.types';
import {
    formatSupportSource,
    formatSupportTime,
    formatSupportTopic,
    prioritizeQuickReplies,
    resolveContactHref,
    SUPPORT_STATUS_META,
} from '@/utils/support/support-format';

interface SupportThreadConversationPaneProps {
    threadId: number;
    quickReplies: readonly SupportQuickReply[];
    visitorTypingName?: string;
    onAdminTyping?: (typing: boolean) => void;
    onOpenQuickReplies: () => void;
    onDeleted: () => void;
}

export function SupportThreadConversationPane({
    threadId,
    quickReplies,
    visitorTypingName,
    onAdminTyping,
    onOpenQuickReplies,
    onDeleted,
}: SupportThreadConversationPaneProps) {
    const detailQuery = useSupportThreadDetail(threadId);
    const replyMutation = useReplySupportThread();
    const statusMutation = useUpdateSupportStatus();
    const deleteMutation = useDeleteSupportThread();

    const [draft, setDraft] = useState('');
    const transcriptRef = useRef<HTMLDivElement>(null);
    const composerRef = useRef<HTMLTextAreaElement>(null);
    const stopTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const thread = detailQuery.data?.thread;
    const messages = detailQuery.data?.messages ?? [];

    useEffect(() => {
        transcriptRef.current?.scrollTo({top: transcriptRef.current.scrollHeight, behavior: 'smooth'});
    }, [threadId, messages.length, visitorTypingName]);

    useEffect(() => () => {
        if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current);
    }, []);

    const handleDraftChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
        const next = e.target.value;
        setDraft(next);
        if (!onAdminTyping) return;
        if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current);
        if (next.trim().length > 0) {
            onAdminTyping(true);
            stopTypingTimerRef.current = setTimeout(() => onAdminTyping(false), 2600);
        } else {
            onAdminTyping(false);
        }
    };

    const sendMessage = async (rawContent: string, nextStatus?: SupportThreadStatus, clearComposer = false) => {
        const trimmed = rawContent.trim();
        if (!trimmed || !thread || replyMutation.isPending) return;
        const status = nextStatus ?? (thread.status === 'OPEN' ? 'IN_PROGRESS' : thread.status);
        try {
            if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current);
            onAdminTyping?.(false);
            await replyMutation.mutateAsync({id: thread.id, content: trimmed, status});
            if (clearComposer) setDraft('');
            toast.success(nextStatus === 'RESOLVED' ? 'Đã gửi phản hồi & hoàn tất hội thoại.' : 'Đã gửi tin nhắn phản hồi.');
        } catch {
            // ErrorNotice renders API failure below.
        }
    };

    const handleStatusChange = async (status: SupportThreadStatus) => {
        if (!thread || statusMutation.isPending || thread.status === status) return;
        try {
            await statusMutation.mutateAsync({id: thread.id, status});
            toast.success(`Đã chuyển trạng thái sang "${SUPPORT_STATUS_META[status].label}".`);
        } catch {
            // Handled via ErrorNotice.
        }
    };

    const handleDeleteThread = async () => {
        if (!thread || deleteMutation.isPending) return;
        const ok = await confirmDialog({
            title: 'Xóa hội thoại hỗ trợ?',
            description: `Toàn bộ lịch sử trao đổi mã ${thread.code} của khách hàng "${thread.fullName}" sẽ bị xóa vĩnh viễn.`,
            confirmLabel: 'Xóa hội thoại',
            variant: 'danger',
        });
        if (!ok) return;
        try {
            await deleteMutation.mutateAsync(thread.id);
            toast.success(`Đã xóa hội thoại ${thread.code}.`);
            onDeleted();
        } catch {
            // Handled via ErrorNotice.
        }
    };

    const handleComposerKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void sendMessage(draft, undefined, true);
        }
    };

    const sortedQuickReplies = prioritizeQuickReplies(quickReplies, thread?.topic);
    const contactLink = thread ? resolveContactHref(thread.contactInfo) : null;

    return (
        <section className="flex h-full min-h-[560px] flex-col overflow-hidden rounded-panel border border-border bg-card">
            <QueryState query={detailQuery}>
                {thread && <>
                    <header className="border-b border-border bg-slate-50/70 px-4 py-3.5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-base font-bold text-slate-900">{thread.fullName}</h2>
                                    <span className="rounded-badge bg-slate-200/80 px-2 py-0.5 text-[11px] font-bold text-slate-700">{thread.code}</span>
                                    <span className={cn('rounded-badge px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset', SUPPORT_STATUS_META[thread.status].badgeClass)}>
                                        {SUPPORT_STATUS_META[thread.status].label}
                                    </span>
                                    <span className="rounded-badge bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
                                        {formatSupportSource(thread.source)}
                                    </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                                    {thread.organization && (
                                        <span className="inline-flex items-center gap-1 font-medium">
                                            <Building2 size={13} className="text-slate-400"/>{thread.organization}
                                        </span>
                                    )}
                                    {contactLink ? (
                                        <a href={contactLink.href} className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                                            {contactLink.isEmail ? <Mail size={13}/> : <Phone size={13}/>}{thread.contactInfo}
                                        </a>
                                    ) : (
                                        <span className="inline-flex items-center gap-1"><User size={13} className="text-slate-400"/>{thread.contactInfo}</span>
                                    )}
                                    <span className="font-medium text-slate-500">
                                        Chủ đề: <strong className="text-slate-700">{formatSupportTopic(thread.topic)}</strong>
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5">
                                {thread.status !== 'IN_PROGRESS' && (
                                    <Button size="sm" variant="outline" disabled={statusMutation.isPending} leftIcon={<Clock size={14}/>}
                                            onClick={() => void handleStatusChange('IN_PROGRESS')}>Đang xử lý</Button>
                                )}
                                {thread.status !== 'RESOLVED' ? (
                                    <Button size="sm" variant="outline" disabled={statusMutation.isPending} leftIcon={<CheckCircle2 size={14}/>}
                                            onClick={() => void handleStatusChange('RESOLVED')}>Hoàn tất</Button>
                                ) : (
                                    <Button size="sm" variant="outline" disabled={statusMutation.isPending} leftIcon={<RotateCcw size={14}/>}
                                            onClick={() => void handleStatusChange('OPEN')}>Mở lại</Button>
                                )}
                                <button type="button" disabled={deleteMutation.isPending} onClick={() => void handleDeleteThread()}
                                        title="Xóa hội thoại" aria-label="Xóa hội thoại"
                                        className="inline-flex h-9 w-9 items-center justify-center rounded-control border border-slate-200 bg-white text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-danger disabled:opacity-50 cursor-pointer">
                                    <Trash2 size={15}/>
                                </button>
                            </div>
                        </div>
                    </header>

                    <div ref={transcriptRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50/35 p-4 max-h-[380px]">
                        {messages.length === 0 ? (
                            <p className="py-12 text-center text-xs text-slate-400">Chưa có tin nhắn nào trong hội thoại này.</p>
                        ) : messages.map(msg => {
                            const isAdmin = msg.senderRole === 'ADMIN';
                            return (
                                <div key={msg.id} className={cn('flex flex-col', isAdmin ? 'items-end' : 'items-start')}>
                                    <div className="mb-1 flex items-center gap-2 px-1 text-[11px] text-slate-400">
                                        <strong className={cn('font-semibold', isAdmin ? 'text-primary' : 'text-slate-600')}>{msg.senderName}</strong>
                                        <span>·</span>
                                        <time dateTime={msg.createdAt}>{formatSupportTime(msg.createdAt)}</time>
                                    </div>
                                    <div className={cn(
                                        'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap shadow-2xs',
                                        isAdmin ? 'rounded-tr-xs bg-primary text-primary-foreground' : 'rounded-tl-xs border border-slate-200 bg-white text-slate-800',
                                    )}>
                                        {msg.content}
                                    </div>
                                </div>
                            );
                        })}
                        {visitorTypingName && (
                            <div className="flex items-center gap-2 text-xs text-slate-500" role="status" aria-live="polite">
                                <span className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-2xs">
                                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary"/>
                                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:150ms]"/>
                                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:300ms]"/>
                                </span>
                                <span className="font-medium text-slate-600">{visitorTypingName} đang nhập tin nhắn...</span>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-slate-200/80 bg-rose-50/35 px-4 py-2.5">
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-primary">
                                <Zap size={13}/> Trả lời nhanh 1 chạm ({sortedQuickReplies.length})
                            </span>
                            <button type="button" onClick={onOpenQuickReplies}
                                    className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-slate-600 hover:text-primary cursor-pointer">
                                <Settings2 size={12}/> Quản lý mẫu
                            </button>
                        </div>
                        {sortedQuickReplies.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                                {sortedQuickReplies.map(qr => {
                                    const personalized = personalizeQuickReply(qr.content, thread.fullName);
                                    const isTopicMatch = Boolean(qr.topic && qr.topic === thread.topic);
                                    return (
                                        <div key={qr.id} className={cn(
                                            'inline-flex items-center overflow-hidden rounded-control border bg-white text-xs shadow-2xs',
                                            isTopicMatch ? 'border-rose-300 ring-1 ring-rose-100' : 'border-slate-200',
                                        )}>
                                            <button type="button" title={`Chèn vào khung soạn:\n${personalized}`}
                                                    onClick={() => { setDraft(personalized); composerRef.current?.focus(); }}
                                                    className="max-w-48 truncate px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 cursor-pointer">
                                                {qr.title}
                                            </button>
                                            <button type="button" disabled={replyMutation.isPending} title={`Gửi ngay lập tức:\n${personalized}`}
                                                    onClick={() => void sendMessage(personalized)}
                                                    className="border-l border-rose-100 bg-rose-50 px-2 py-1 text-[11px] font-bold text-primary hover:bg-primary hover:text-white disabled:opacity-50 transition-colors cursor-pointer">
                                                ⚡ Gửi ngay
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-xs text-slate-500">
                                Chưa có mẫu trả lời nhanh. Bấm{' '}
                                <button type="button" onClick={onOpenQuickReplies} className="font-semibold text-primary underline cursor-pointer">Quản lý mẫu</button>{' '}
                                để tạo phản hồi 1 chạm.
                            </p>
                        )}
                    </div>

                    <footer className="space-y-2.5 border-t border-border bg-white p-4">
                        <ErrorNotice error={replyMutation.error || statusMutation.error || deleteMutation.error}/>
                        <textarea ref={composerRef} rows={3} value={draft} onChange={handleDraftChange} onKeyDown={handleComposerKeyDown}
                                  placeholder={`Nhập phản hồi tới ${thread.fullName}... (Enter để gửi, Shift+Enter xuống dòng)`}
                                  className="w-full rounded-control border border-border bg-slate-50/40 p-3 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none"/>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[11.5px] text-slate-400">
                                Nhấn <strong>Enter</strong> để gửi nhanh · <strong>Shift + Enter</strong> xuống dòng
                            </span>
                            <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline" disabled={!draft.trim() || replyMutation.isPending}
                                        leftIcon={<CheckCircle2 size={14}/>} onClick={() => void sendMessage(draft, 'RESOLVED', true)}>
                                    Gửi & Hoàn tất
                                </Button>
                                <Button size="sm" isLoading={replyMutation.isPending} disabled={!draft.trim()}
                                        leftIcon={<Send size={14}/>} onClick={() => void sendMessage(draft, undefined, true)}>
                                    Gửi phản hồi
                                </Button>
                            </div>
                        </div>
                    </footer>
                </>}
            </QueryState>
        </section>
    );
}
