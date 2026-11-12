'use client';

import {useEffect, useRef, type FormEvent, type KeyboardEvent} from 'react';
import Image from 'next/image';
import {Loader2, RotateCcw, Send, ShieldCheck, Sparkles, X} from 'lucide-react';
import {cn} from '@/lib/utils';
import {ZaloBrandIcon} from '@/components/support/ZaloBrandIcon';
import {formatPhoneDisplay, toZaloChatUrl} from '@/utils/support/contact-format';
import type {
    PublicSupportThreadSession,
    SupportQuickTopicOption,
    SupportStartDraft,
} from '@/types/support/support.types';

export interface PublicSupportChatPanelProps {
    hasSession: boolean;
    session: PublicSupportThreadSession | null | undefined;
    isSessionLoading: boolean;
    isCreating: boolean;
    isSending: boolean;
    errorText: string | null;
    quickTopics: readonly SupportQuickTopicOption[];
    followUpChips: readonly string[];
    startDraft: SupportStartDraft;
    replyDraft: string;
    zaloPhone?: string | null;
    onStartDraftChange: (patch: Partial<SupportStartDraft>) => void;
    onSelectTopicChip: (option: SupportQuickTopicOption) => void;
    onCreateSubmit: (event: FormEvent) => void;
    onReplyDraftChange: (value: string) => void;
    onSendReply: () => void;
    onResetSession: () => void;
    onClose: () => void;
}

function formatChatTime(iso: string): string {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'});
}

const inputCls =
    'w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none';

export function PublicSupportChatPanel({
    hasSession, session, isSessionLoading, isCreating, isSending, errorText,
    quickTopics, followUpChips, startDraft, replyDraft, zaloPhone,
    onStartDraftChange, onSelectTopicChip, onCreateSubmit,
    onReplyDraftChange, onSendReply, onResetSession, onClose,
}: PublicSupportChatPanelProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const replyInputRef = useRef<HTMLInputElement>(null);
    const messageCount = session?.messages?.length ?? 0;
    const zaloUrl = toZaloChatUrl(zaloPhone);
    const zaloDisplay = formatPhoneDisplay(zaloPhone);

    useEffect(() => {
        if (hasSession && scrollRef.current) scrollRef.current.scrollTo({top: scrollRef.current.scrollHeight, behavior: 'smooth'});
    }, [hasSession, messageCount]);

    const canStart = Boolean(startDraft.fullName.trim() && startDraft.contactInfo.trim() && startDraft.message.trim());

    const handleReplyKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            onSendReply();
        }
    };

    return (
        <section
            role="dialog"
            aria-label="Hỗ trợ & Điều phối UAV PAS"
            className="fixed bottom-24 right-5 z-50 flex max-h-[min(600px,calc(100dvh-7.5rem))] w-[min(390px,calc(100vw-2.5rem))] origin-bottom-right flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-[assistant-pop_220ms_cubic-bezier(0.2,0.9,0.3,1.15)] motion-reduce:animate-none"
        >
            <div className="flex items-start justify-between gap-2.5 bg-slate-950 px-4 py-3.5 text-white">
                <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white p-0.5 ring-2 ring-primary/40">
                        <Image src="/uav-pas-logo.svg" alt="" width={32} height={32} className="h-8 w-8 object-contain" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="truncate text-xs font-extrabold tracking-tight text-white">Hỗ trợ &amp; Điều phối UAV PAS</h2>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-300">
                            <span className="relative flex h-2 w-2 shrink-0">
                                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping motion-reduce:animate-none" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                            </span>
                            <span>Quản trị viên trực tuyến</span>
                            {session?.code && (
                                <span className="rounded-md bg-white/15 px-1.5 py-0.5 text-[10px] font-bold text-rose-200">{session.code}</span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    {hasSession && (
                        <button
                            type="button" onClick={onResetSession} title="Tạo yêu cầu mới"
                            className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-[10px] font-bold text-slate-200 transition-colors hover:bg-white/20 hover:text-white"
                        >
                            <RotateCcw className="h-3 w-3" aria-hidden="true" />
                            <span>Tạo yêu cầu mới</span>
                        </button>
                    )}
                    <button
                        type="button" onClick={onClose} aria-label="Đóng khung hỗ trợ trực tuyến"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/15 hover:text-white"
                    >
                        <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                </div>
            </div>

            {zaloUrl && (
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-sky-50/70 px-4 py-2 text-[11px]">
                    <span className="font-medium text-slate-700">Cần trao đổi nhanh qua Zalo?</span>
                    <a
                        href={zaloUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#0068FF] px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs transition-colors hover:bg-[#0058db]"
                    >
                        <ZaloBrandIcon className="h-3.5 w-3.5" />
                        <span>Zalo · {zaloDisplay} ↗</span>
                    </a>
                </div>
            )}

            {!hasSession ? (
                <form noValidate onSubmit={onCreateSubmit} className="flex-1 space-y-3 overflow-y-auto p-4">
                    <div className="space-y-1.5">
                        <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                            Chọn nhanh chủ đề hỗ trợ
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {quickTopics.map((item) => (
                                <button
                                    key={item.topic} type="button" onClick={() => onSelectTopicChip(item)}
                                    className={cn(
                                        'rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors',
                                        startDraft.topic === item.topic
                                            ? 'border-primary bg-primary text-white'
                                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-primary/40 hover:text-primary',
                                    )}
                                >
                                    {item.chipLabel}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        <div>
                            <label htmlFor="support-name" className="mb-1 block text-[11px] font-bold text-slate-700">
                                Họ và tên <span className="text-primary">*</span>
                            </label>
                            <input
                                id="support-name" type="text" value={startDraft.fullName} placeholder="Nguyễn Văn A" className={inputCls}
                                onChange={(e) => onStartDraftChange({fullName: e.target.value})}
                            />
                        </div>
                        <div>
                            <label htmlFor="support-contact" className="mb-1 block text-[11px] font-bold text-slate-700">
                                Email hoặc SĐT <span className="text-primary">*</span>
                            </label>
                            <input
                                id="support-contact" type="text" value={startDraft.contactInfo} placeholder="09xx... / email@..." className={inputCls}
                                onChange={(e) => onStartDraftChange({contactInfo: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        <div>
                            <label htmlFor="support-org" className="mb-1 block text-[11px] font-bold text-slate-700">Đơn vị</label>
                            <input
                                id="support-org" type="text" value={startDraft.organization} placeholder="Tên công ty / dự án" className={inputCls}
                                onChange={(e) => onStartDraftChange({organization: e.target.value})}
                            />
                        </div>
                        <div>
                            <label htmlFor="support-topic" className="mb-1 block text-[11px] font-bold text-slate-700">Chủ đề</label>
                            <select
                                id="support-topic" value={startDraft.topic} onChange={(e) => onStartDraftChange({topic: e.target.value})}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-2 text-xs font-semibold text-slate-800 focus:border-primary focus:bg-white focus:outline-none"
                            >
                                {quickTopics.map((item) => (
                                    <option key={item.topic} value={item.topic}>{item.selectLabel}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="support-msg" className="mb-1 block text-[11px] font-bold text-slate-700">
                            Tin nhắn hỗ trợ <span className="text-primary">*</span>
                        </label>
                        <textarea
                            id="support-msg" rows={3} value={startDraft.message} className={inputCls}
                            placeholder="Nhập nội dung cần Quản trị viên tư vấn hoặc hỗ trợ..."
                            onChange={(e) => onStartDraftChange({message: e.target.value})}
                        />
                    </div>

                    {errorText && (
                        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-800">{errorText}</p>
                    )}

                    <button
                        type="submit" disabled={!canStart || isCreating}
                        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-50"
                    >
                        {isCreating ? (
                            <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /><span>Đang kết nối Quản trị viên...</span></>
                        ) : (
                            <span>Bắt đầu trò chuyện trực tuyến →</span>
                        )}
                    </button>
                </form>
            ) : (
                <>
                    <div className="border-b border-slate-200 bg-rose-50/60 px-4 py-2 text-[11px] font-medium text-slate-700">
                        Tin nhắn đã chuyển tới Quản trị viên — phản hồi sẽ hiển thị trực tiếp tại đây.
                    </div>

                    <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-4">
                        {isSessionLoading && !session ? (
                            <div className="flex items-center justify-center gap-2 py-10 text-xs text-slate-500">
                                <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
                                <span>Đang đồng bộ phiên trò chuyện...</span>
                            </div>
                        ) : (
                            (session?.messages ?? []).map((msg) => {
                                const isAdmin = msg.senderRole === 'ADMIN';
                                return (
                                    <div key={msg.id} className={cn('flex flex-col', isAdmin ? 'items-start' : 'items-end')}>
                                        {isAdmin && (
                                            <span className="mb-1 inline-flex items-center gap-1 rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white">
                                                <ShieldCheck className="h-3 w-3 text-rose-300" aria-hidden="true" />Quản trị viên · Admin
                                            </span>
                                        )}
                                        <div className={cn(
                                            'max-w-[86%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-2xs',
                                            isAdmin ? 'rounded-bl-sm border border-slate-200 bg-white text-slate-800' : 'rounded-br-sm bg-primary text-white',
                                        )}>
                                            {msg.content}
                                        </div>
                                        <span className="mt-1 text-[10px] text-slate-400">
                                            {isAdmin ? msg.senderName : 'Bạn'} · {formatChatTime(msg.createdAt)}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="border-t border-slate-200 bg-white p-3 space-y-2">
                        <div className="flex flex-wrap gap-1.5">
                            {followUpChips.map((chip) => (
                                <button
                                    key={chip} type="button"
                                    onClick={() => { onReplyDraftChange(chip); replyInputRef.current?.focus(); }}
                                    className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-600 transition-colors hover:border-primary/40 hover:text-primary"
                                >
                                    {chip}
                                </button>
                            ))}
                        </div>
                        {errorText && <p role="alert" className="text-[11px] font-medium text-rose-700">{errorText}</p>}
                        <div className="flex items-center gap-2">
                            <input
                                ref={replyInputRef} type="text" value={replyDraft} onKeyDown={handleReplyKeyDown}
                                onChange={(e) => onReplyDraftChange(e.target.value)}
                                placeholder="Nhập tin nhắn gửi Quản trị viên (Enter để gửi)..."
                                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none"
                            />
                            <button
                                type="button" onClick={onSendReply} disabled={!replyDraft.trim() || isSending} aria-label="Gửi tin nhắn"
                                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-xs transition-colors hover:bg-primary-hover disabled:opacity-50"
                            >
                                {isSending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </section>
    );
}
