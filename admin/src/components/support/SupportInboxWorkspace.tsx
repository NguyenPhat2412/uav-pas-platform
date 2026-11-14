'use client';

import {useState} from 'react';
import {CheckCircle2, Clock, Inbox, MessagesSquare, Radio, RefreshCw, Search, Sparkles, Zap} from 'lucide-react';
import {Pagination} from '@/components/data/Pagination';
import {QueryState} from '@/components/data/WorkspaceState';
import {SupportQuickRepliesDrawer} from '@/components/support/SupportQuickRepliesDrawer';
import {SupportThreadConversationPane} from '@/components/support/SupportThreadConversationPane';
import {Button} from '@/components/ui';
import {
    useAdminSupportRealtime,
    useSupportQuickReplies,
    useSupportSummary,
    useSupportThreads,
} from '@/hooks/support/useAdminSupport';
import {cn} from '@/lib/utils';
import {useAuth} from '@/providers/AuthContext';
import type {SupportThreadStatus} from '@/types/support/support.types';
import {
    formatSupportSource,
    formatSupportTime,
    formatSupportTopic,
    SUPPORT_STATUS_META,
    SUPPORT_TOPIC_OPTIONS,
} from '@/utils/support/support-format';

type StatusTab = 'ALL' | 'UNREAD' | SupportThreadStatus;

const STATUS_TABS: readonly { id: StatusTab; label: string }[] = [
    {id: 'ALL', label: 'Tất cả'},
    {id: 'UNREAD', label: 'Chưa đọc'},
    {id: 'OPEN', label: 'Mới tiếp nhận'},
    {id: 'IN_PROGRESS', label: 'Đang xử lý'},
    {id: 'RESOLVED', label: 'Đã hoàn tất'},
];

export function SupportInboxWorkspace() {
    const {can, permissionsReady} = useAuth();
    const allowed = permissionsReady && can('SUPPORT_MANAGE');
    const [statusTab, setStatusTab] = useState<StatusTab>('ALL');
    const [topic, setTopic] = useState<string>('');
    const [search, setSearch] = useState<string>('');
    const [page, setPage] = useState<number>(0);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [drawerOpen, setDrawerOpen] = useState<boolean>(false);

    const {wsConnected, typingByThread, notifyAdminTyping} = useAdminSupportRealtime(allowed);
    const summaryQuery = useSupportSummary(allowed);
    const threadsQuery = useSupportThreads({
        status: statusTab === 'ALL' || statusTab === 'UNREAD' ? '' : statusTab,
        unreadOnly: statusTab === 'UNREAD',
        topic: topic || undefined,
        q: search.trim() || undefined,
        page,
        size: 20,
    }, allowed);
    const quickRepliesQuery = useSupportQuickReplies(allowed);

    const summary = summaryQuery.data;
    const threads = threadsQuery.data?.content ?? [];
    const activeThreadId = threads.some(item => item.id === selectedId) ? selectedId : (threads[0]?.id ?? null);

    const unreadMessages = summary?.unreadMessages ?? 0;
    const unreadThreads = summary?.unreadThreads ?? 0;
    const activeCount = (summary?.openThreads ?? 0) + (summary?.inProgressThreads ?? 0);

    const handleRefresh = () => {
        void summaryQuery.refetch();
        void threadsQuery.refetch();
        void quickRepliesQuery.refetch();
    };

    return (
        <div className="space-y-4 pb-8">
            <header className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-border bg-card px-5 py-4">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-lg font-bold tracking-tight text-slate-900">Trung tâm Tin nhắn & Hỗ trợ Khách hàng</h1>
                        <span className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1',
                            wsConnected
                                ? 'bg-rose-50 text-primary ring-rose-200'
                                : 'bg-amber-50 text-amber-800 ring-amber-200',
                        )}>
                            <span className={cn('h-2 w-2 rounded-full', wsConnected ? 'animate-pulse bg-primary' : 'bg-amber-500')}/>
                            {wsConnected ? 'Trực tuyến · WebSocket thời gian thực' : 'Đang đồng bộ dự phòng'}
                        </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                        Tiếp nhận hội thoại trực tiếp từ Cổng Khách hàng, Trang chủ & Biểu mẫu liên hệ với độ trễ thời gian thực.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="outline" onClick={handleRefresh}
                            leftIcon={<RefreshCw size={14} className={cn((summaryQuery.isFetching || threadsQuery.isFetching) && 'animate-spin')}/>}>
                        Làm mới
                    </Button>
                    <Button size="sm" onClick={() => setDrawerOpen(true)} leftIcon={<Zap size={14}/>}>
                        Quản lý mẫu trả lời nhanh
                    </Button>
                </div>
            </header>

            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-panel border border-border bg-card p-4">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                        <span>Tổng hội thoại</span><MessagesSquare size={16} className="text-slate-400"/>
                    </div>
                    <p className="mt-2 text-2xl font-extrabold tabular-nums text-slate-900">{summary?.totalThreads ?? '—'}</p>
                    <p className="mt-0.5 text-[11.5px] text-slate-400">Từ Cổng Khách hàng, Widget & Liên hệ</p>
                </div>

                <div className={cn('rounded-panel border bg-card p-4', unreadMessages > 0 ? 'border-rose-300 bg-rose-50/35' : 'border-border')}>
                    <div className="flex items-center justify-between text-xs font-semibold text-primary">
                        <span className="inline-flex items-center gap-2">
                            Tin nhắn chưa đọc
                            {unreadMessages > 0 && (
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75"/>
                                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary"/>
                                </span>
                            )}
                        </span>
                        <Sparkles size={16} className="text-primary"/>
                    </div>
                    <p className="mt-2 text-2xl font-extrabold tabular-nums text-primary">{summary?.unreadMessages ?? '—'}</p>
                    <p className="mt-0.5 text-[11.5px] text-slate-600">{unreadThreads} hội thoại đang chờ đọc</p>
                </div>

                <div className="rounded-panel border border-border bg-card p-4">
                    <div className="flex items-center justify-between text-xs font-semibold text-amber-800">
                        <span>Đang chờ / Đang xử lý</span><Clock size={16} className="text-amber-600"/>
                    </div>
                    <p className="mt-2 text-2xl font-extrabold tabular-nums text-slate-900">{summary ? activeCount : '—'}</p>
                    <p className="mt-0.5 text-[11.5px] text-slate-500">
                        {summary?.openThreads ?? 0} mới tiếp nhận · {summary?.inProgressThreads ?? 0} đang xử lý
                    </p>
                </div>

                <div className="rounded-panel border border-border bg-card p-4">
                    <div className="flex items-center justify-between text-xs font-semibold text-uav-blue">
                        <span>Đã giải quyết</span><CheckCircle2 size={16} className="text-uav-blue"/>
                    </div>
                    <p className="mt-2 text-2xl font-extrabold tabular-nums text-slate-900">{summary?.resolvedThreads ?? '—'}</p>
                    <p className="mt-0.5 text-[11.5px] text-slate-500">Đã tư vấn & đóng yêu cầu</p>
                </div>
            </section>

            <section className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-border bg-card p-3">
                <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Bộ lọc trạng thái hội thoại">
                    {STATUS_TABS.map(tab => {
                        const active = statusTab === tab.id;
                        const showBadge = tab.id === 'UNREAD' && unreadThreads > 0;
                        return (
                            <button key={tab.id} type="button" role="tab" aria-selected={active}
                                    onClick={() => { setStatusTab(tab.id); setPage(0); }}
                                    className={cn(
                                        'inline-flex h-8 items-center gap-1.5 rounded-control px-3 text-xs font-bold transition-colors cursor-pointer',
                                        active ? 'bg-primary text-primary-foreground' : 'bg-slate-100 text-slate-700 hover:bg-slate-200/70',
                                    )}>
                                <span>{tab.label}</span>
                                {showBadge && (
                                    <span className={cn('rounded-full px-1.5 py-0.2 text-[10px] font-extrabold', active ? 'bg-white text-primary' : 'bg-primary text-white')}>
                                        {unreadThreads}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <label className="relative">
                        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                        <input type="search" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
                               placeholder="Tìm mã SUP, họ tên, SĐT/email..."
                               className="h-8 w-60 rounded-control border border-border bg-white pl-8 pr-3 text-xs text-slate-900 focus:border-primary focus:outline-none"/>
                    </label>
                    <select aria-label="Lọc theo chủ đề hỗ trợ" value={topic} onChange={e => { setTopic(e.target.value); setPage(0); }}
                            className="h-8 rounded-control border border-border bg-white px-2.5 text-xs font-semibold text-slate-700 focus:border-primary focus:outline-none">
                        <option value="">Tất cả chủ đề</option>
                        {SUPPORT_TOPIC_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </div>
            </section>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <section className="flex flex-col overflow-hidden rounded-panel border border-border bg-card lg:col-span-5">
                    <div className="flex items-center justify-between border-b border-border bg-slate-50/70 px-4 py-2.5 text-xs font-bold text-slate-700">
                        <span>Danh sách hội thoại ({threadsQuery.data?.totalElements ?? 0})</span>
                        <span className="inline-flex items-center gap-1 font-medium text-slate-500">
                            <Radio size={12} className={cn(wsConnected ? 'text-primary' : 'text-slate-400')}/>
                            {wsConnected ? 'Đẩy tức thì (WS)' : 'Tự động làm mới'}
                        </span>
                    </div>

                    <QueryState query={threadsQuery}>
                        {threads.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
                                <Inbox size={28} className="text-slate-300"/>
                                <p className="text-sm font-bold text-slate-700">Không có hội thoại nào khớp bộ lọc</p>
                                <p className="text-xs text-slate-500">Khi khách hàng nhắn tin trực tiếp, luồng hội thoại sẽ hiển thị tức thì tại đây.</p>
                            </div>
                        ) : (
                            <ul className="m-0 max-h-[540px] flex-1 list-none divide-y divide-slate-100 overflow-y-auto p-0">
                                {threads.map(item => {
                                    const selected = item.id === activeThreadId;
                                    const unread = item.unreadForAdmin > 0;
                                    const typingName = typingByThread[item.id];
                                    return (
                                        <li key={item.id}>
                                            <button type="button" onClick={() => setSelectedId(item.id)}
                                                    className={cn(
                                                        'flex w-full flex-col gap-1.5 border-l-[3px] px-4 py-3 text-left transition-colors cursor-pointer',
                                                        selected ? 'border-l-primary bg-rose-50/55'
                                                            : unread ? 'border-l-rose-400 bg-rose-50/25 hover:bg-rose-50/45'
                                                                : 'border-l-transparent hover:bg-slate-50',
                                                    )}>
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex min-w-0 items-center gap-1.5">
                                                        <strong className="truncate text-[13px] font-bold text-slate-900">{item.fullName}</strong>
                                                        <span className="shrink-0 text-[11px] font-semibold text-slate-400">{item.code}</span>
                                                    </div>
                                                    <div className="flex shrink-0 items-center gap-1.5">
                                                        {unread && (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10.5px] font-extrabold text-white">
                                                                <span className="h-1.5 w-1.5 animate-ping rounded-full bg-white"/>{item.unreadForAdmin} mới
                                                            </span>
                                                        )}
                                                        <span className="text-[11px] text-slate-400">{formatSupportTime(item.updatedAt)}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                                    <span className={cn('rounded-badge px-1.5 py-0.2 font-semibold ring-1 ring-inset', SUPPORT_STATUS_META[item.status].badgeClass)}>
                                                        {SUPPORT_STATUS_META[item.status].label}
                                                    </span>
                                                    <span className="rounded-badge bg-slate-100 px-1.5 py-0.2 font-medium text-slate-600">
                                                        {formatSupportTopic(item.topic)}
                                                    </span>
                                                    <span className="text-slate-400">· {formatSupportSource(item.source)}</span>
                                                </div>
                                                {typingName ? (
                                                    <p className="m-0 inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                                                        <span className="h-1.5 w-1.5 animate-ping rounded-full bg-primary"/>
                                                        Đang nhập tin nhắn...
                                                    </p>
                                                ) : (
                                                    <p className={cn('m-0 line-clamp-1 text-xs', unread ? 'font-semibold text-slate-800' : 'text-slate-500')}>
                                                        {item.lastSenderRole === 'ADMIN' ? 'Bạn: ' : ''}
                                                        {item.lastMessagePreview || 'Yêu cầu tư vấn mới chưa kèm lời nhắn'}
                                                    </p>
                                                )}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </QueryState>

                    {(threadsQuery.data?.totalPages ?? 0) > 1 && threadsQuery.data && (
                        <div className="border-t border-slate-100 p-2">
                            <Pagination page={page} totalPages={threadsQuery.data.totalPages}
                                        total={threadsQuery.data.totalElements} onChange={setPage}/>
                        </div>
                    )}
                </section>

                <div className="lg:col-span-7">
                    {activeThreadId !== null ? (
                        <SupportThreadConversationPane
                            key={activeThreadId}
                            threadId={activeThreadId}
                            quickReplies={quickRepliesQuery.data ?? []}
                            visitorTypingName={typingByThread[activeThreadId]}
                            onAdminTyping={typing => notifyAdminTyping(activeThreadId, typing)}
                            onOpenQuickReplies={() => setDrawerOpen(true)}
                            onDeleted={() => setSelectedId(null)}
                        />
                    ) : (
                        <section className="flex h-full min-h-[560px] flex-col items-center justify-center gap-2 rounded-panel border border-border bg-card p-8 text-center">
                            <MessagesSquare size={32} className="text-slate-300"/>
                            <h2 className="text-sm font-bold text-slate-800">Chọn một hội thoại để phản hồi</h2>
                            <p className="max-w-sm text-xs text-slate-500">
                                Chọn luồng tin nhắn ở cột bên trái để xem chi tiết khách hàng và gửi phản hồi nhanh 1 chạm.
                            </p>
                        </section>
                    )}
                </div>
            </div>

            <SupportQuickRepliesDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}/>
        </div>
    );
}
