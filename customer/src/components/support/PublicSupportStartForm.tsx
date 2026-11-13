'use client';

import type {FormEvent} from 'react';
import {Loader2, Sparkles} from 'lucide-react';
import {cn} from '@/lib/utils';
import type {SupportQuickTopicOption, SupportStartDraft} from '@/types/support/support.types';

export interface PublicSupportStartFormProps {
    quickTopics: readonly SupportQuickTopicOption[];
    startDraft: SupportStartDraft;
    isCreating: boolean;
    errorText: string | null;
    onStartDraftChange: (patch: Partial<SupportStartDraft>) => void;
    onSelectTopicChip: (option: SupportQuickTopicOption) => void;
    onCreateSubmit: (event: FormEvent) => void;
}

const inputCls =
    'w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none';

export function PublicSupportStartForm({
    quickTopics,
    startDraft,
    isCreating,
    errorText,
    onStartDraftChange,
    onSelectTopicChip,
    onCreateSubmit,
}: PublicSupportStartFormProps) {
    const canStart = Boolean(
        startDraft.fullName.trim() && startDraft.contactInfo.trim() && startDraft.message.trim(),
    );

    return (
        <form noValidate onSubmit={onCreateSubmit} className="flex-1 space-y-3 overflow-y-auto p-4">
            <div className="space-y-1.5">
                <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                    <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    Chọn nhanh chủ đề hỗ trợ
                </p>
                <div className="flex flex-wrap gap-1.5">
                    {quickTopics.map((item) => (
                        <button
                            key={item.topic}
                            type="button"
                            onClick={() => onSelectTopicChip(item)}
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
                        id="support-name"
                        type="text"
                        value={startDraft.fullName}
                        placeholder="Nguyễn Văn A"
                        className={inputCls}
                        onChange={(e) => onStartDraftChange({fullName: e.target.value})}
                    />
                </div>
                <div>
                    <label htmlFor="support-contact" className="mb-1 block text-[11px] font-bold text-slate-700">
                        Email hoặc SĐT <span className="text-primary">*</span>
                    </label>
                    <input
                        id="support-contact"
                        type="text"
                        value={startDraft.contactInfo}
                        placeholder="09xx... / email@..."
                        className={inputCls}
                        onChange={(e) => onStartDraftChange({contactInfo: e.target.value})}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div>
                    <label htmlFor="support-org" className="mb-1 block text-[11px] font-bold text-slate-700">
                        Đơn vị
                    </label>
                    <input
                        id="support-org"
                        type="text"
                        value={startDraft.organization}
                        placeholder="Tên công ty / dự án"
                        className={inputCls}
                        onChange={(e) => onStartDraftChange({organization: e.target.value})}
                    />
                </div>
                <div>
                    <label htmlFor="support-topic" className="mb-1 block text-[11px] font-bold text-slate-700">
                        Chủ đề
                    </label>
                    <select
                        id="support-topic"
                        value={startDraft.topic}
                        onChange={(e) => onStartDraftChange({topic: e.target.value})}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-2 text-xs font-semibold text-slate-800 focus:border-primary focus:bg-white focus:outline-none"
                    >
                        {quickTopics.map((item) => (
                            <option key={item.topic} value={item.topic}>
                                {item.selectLabel}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div>
                <label htmlFor="support-msg" className="mb-1 block text-[11px] font-bold text-slate-700">
                    Tin nhắn hỗ trợ <span className="text-primary">*</span>
                </label>
                <textarea
                    id="support-msg"
                    rows={3}
                    value={startDraft.message}
                    className={inputCls}
                    placeholder="Nhập nội dung cần Quản trị viên tư vấn hoặc hỗ trợ..."
                    onChange={(e) => onStartDraftChange({message: e.target.value})}
                />
            </div>

            {errorText && (
                <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-800">
                    {errorText}
                </p>
            )}

            <button
                type="submit"
                disabled={!canStart || isCreating}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
                {isCreating ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        <span>Đang kết nối Quản trị viên...</span>
                    </>
                ) : (
                    <span>Bắt đầu trò chuyện trực tuyến →</span>
                )}
            </button>
        </form>
    );
}
