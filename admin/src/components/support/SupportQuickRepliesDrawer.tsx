'use client';

import {useState, type FormEvent} from 'react';
import {Plus, Sparkles, Trash2, Zap} from 'lucide-react';
import {Drawer} from '@/components/data/Drawer';
import {ErrorNotice, QueryState} from '@/components/data/WorkspaceState';
import {Button} from '@/components/ui';
import {
    useCreateSupportQuickReply,
    useDeleteSupportQuickReply,
    useSupportQuickReplies,
} from '@/hooks/support/useAdminSupport';
import {confirmDialog} from '@/providers/ConfirmContext';
import {toast} from '@/providers/ToastContext';
import {formatSupportTopic, SUPPORT_TOPIC_OPTIONS} from '@/utils/support/support-format';

interface SupportQuickRepliesDrawerProps {
    open: boolean;
    onClose: () => void;
}

export function SupportQuickRepliesDrawer({open, onClose}: SupportQuickRepliesDrawerProps) {
    const query = useSupportQuickReplies(open);
    const createMutation = useCreateSupportQuickReply();
    const deleteMutation = useDeleteSupportQuickReply();

    const [title, setTitle] = useState('');
    const [topic, setTopic] = useState<string>('GENERAL_SUPPORT');
    const [sortOrder, setSortOrder] = useState<string>('0');
    const [content, setContent] = useState('');

    if (!open) return null;

    const canSubmit = Boolean(title.trim() && content.trim()) && !createMutation.isPending;

    const handleInsertNameToken = () => {
        setContent(prev => (prev ? `${prev}${prev.endsWith(' ') ? '' : ' '}{name} ` : 'Xin chào {name}, '));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;
        try {
            const parsedOrder = Number.parseInt(sortOrder, 10);
            await createMutation.mutateAsync({
                title: title.trim(),
                topic: topic || null,
                content: content.trim(),
                sortOrder: Number.isFinite(parsedOrder) ? parsedOrder : 0,
            });
            setTitle('');
            setContent('');
            setSortOrder('0');
            toast.success('Đã thêm mẫu trả lời nhanh mới.');
        } catch {
            // ErrorNotice surfaces API validation errors inside the drawer.
        }
    };

    const handleDelete = async (id: number, itemTitle: string) => {
        const confirmed = await confirmDialog({
            title: 'Xóa mẫu trả lời nhanh?',
            description: `Mẫu "${itemTitle}" sẽ bị xóa khỏi danh sách phản hồi 1 chạm của Quản trị viên.`,
            confirmLabel: 'Xóa mẫu',
            variant: 'danger',
        });
        if (!confirmed) return;
        try {
            await deleteMutation.mutateAsync(id);
            toast.success(`Đã xóa mẫu "${itemTitle}".`);
        } catch {
            // ErrorNotice renders error feedback.
        }
    };

    const items = query.data ?? [];

    return (
        <Drawer title="Quản lý mẫu trả lời nhanh" onClose={onClose} wide>
            <div className="rounded-panel border border-rose-100 bg-rose-50/50 p-4 text-xs leading-relaxed text-slate-700">
                <div className="flex items-center gap-2 font-bold text-primary">
                    <Zap size={15} className="shrink-0"/>
                    <span>Mẹo cá nhân hóa tự động 1 chạm</span>
                </div>
                <p className="mt-1 text-slate-600">
                    Sử dụng từ khóa <code className="rounded bg-white px-1.5 py-0.5 font-bold text-primary ring-1 ring-rose-200">{'{name}'}</code> trong
                    nội dung để hệ thống tự động điền họ tên khách hàng khi chèn vào khung chat hoặc bấm <strong>⚡ Gửi ngay</strong>.
                </p>
            </div>

            <form onSubmit={e => void handleSubmit(e)} className="space-y-3.5 rounded-panel border border-border bg-slate-50/60 p-4">
                <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                    <Plus size={16} className="text-primary"/>
                    <span>Tạo mẫu phản hồi nhanh mới</span>
                </h3>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                    <label className="sm:col-span-6 block text-xs font-semibold text-slate-700">
                        Tiêu đề nút nhanh <span className="text-primary">*</span>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="VD: Chào & tiếp nhận khảo sát GIS"
                            className="mt-1 h-9 w-full rounded-control border border-border bg-white px-3 text-[13px] font-normal text-slate-900 focus:border-primary focus:outline-none"
                        />
                    </label>
                    <label className="sm:col-span-4 block text-xs font-semibold text-slate-700">
                        Chủ đề ưu tiên
                        <select
                            value={topic}
                            onChange={e => setTopic(e.target.value)}
                            className="mt-1 h-9 w-full rounded-control border border-border bg-white px-2.5 text-[13px] font-normal text-slate-900 focus:border-primary focus:outline-none"
                        >
                            {SUPPORT_TOPIC_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                            <option value="">Áp dụng chung (không gắn mã)</option>
                        </select>
                    </label>
                    <label className="sm:col-span-2 block text-xs font-semibold text-slate-700">
                        Thứ tự
                        <input
                            type="number"
                            value={sortOrder}
                            onChange={e => setSortOrder(e.target.value)}
                            className="mt-1 h-9 w-full rounded-control border border-border bg-white px-2.5 text-[13px] font-normal text-slate-900 focus:border-primary focus:outline-none"
                        />
                    </label>
                </div>

                <div>
                    <div className="flex items-center justify-between gap-2">
                        <label htmlFor="qr-content" className="text-xs font-semibold text-slate-700">
                            Nội dung tin nhắn mẫu <span className="text-primary">*</span>
                        </label>
                        <button
                            type="button"
                            onClick={handleInsertNameToken}
                            className="inline-flex items-center gap-1 rounded-control border border-rose-200 bg-white px-2 py-0.5 text-[11px] font-bold text-primary hover:bg-rose-50 cursor-pointer"
                        >
                            <Sparkles size={12}/> Chèn {'{name}'}
                        </button>
                    </div>
                    <textarea
                        id="qr-content"
                        rows={3}
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        placeholder="Xin chào {name}, đội ngũ kỹ sư UAV PAS đã nhận được yêu cầu khảo sát của Quý đơn vị..."
                        className="mt-1 w-full rounded-control border border-border bg-white p-3 text-[13px] text-slate-900 focus:border-primary focus:outline-none"
                    />
                </div>

                <ErrorNotice error={createMutation.error || deleteMutation.error}/>

                <div className="flex justify-end">
                    <Button type="submit" size="sm" isLoading={createMutation.isPending} disabled={!canSubmit} leftIcon={<Plus size={15}/>}>
                        Thêm mẫu trả lời nhanh
                    </Button>
                </div>
            </form>

            <section className="space-y-2.5">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">Danh sách mẫu hiện có ({items.length})</h3>
                    <span className="text-xs text-slate-500">Ưu tiên khớp chủ đề hội thoại</span>
                </div>

                <QueryState query={query}>
                    {items.length === 0 ? (
                        <div className="rounded-panel border border-dashed border-border px-4 py-8 text-center text-xs text-slate-500">
                            Chưa có mẫu trả lời nhanh nào. Hãy tạo mẫu đầu tiên ở biểu mẫu phía trên.
                        </div>
                    ) : (
                        <ul className="m-0 list-none space-y-2.5 p-0">
                            {items.map(item => (
                                <li key={item.id} className="rounded-panel border border-border bg-white p-3.5 shadow-2xs">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <strong className="text-[13px] font-bold text-slate-900">{item.title}</strong>
                                                <span className="rounded-badge bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                                    {formatSupportTopic(item.topic)}
                                                </span>
                                                <span className="text-[11px] text-slate-400">#{item.sortOrder}</span>
                                            </div>
                                            <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">
                                                {item.content}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            disabled={deleteMutation.isPending}
                                            onClick={() => void handleDelete(item.id, item.title)}
                                            aria-label={`Xóa mẫu ${item.title}`}
                                            title="Xóa mẫu"
                                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control border border-slate-200 text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-danger disabled:opacity-50 cursor-pointer"
                                        >
                                            <Trash2 size={14}/>
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </QueryState>
            </section>
        </Drawer>
    );
}
