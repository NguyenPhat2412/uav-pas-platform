'use client';

import {type FormEvent, type ReactNode, useState} from 'react';
import {keepPreviousData, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {Trash2} from 'lucide-react';
import {Drawer} from '@/components/data/Drawer';
import {Pagination} from '@/components/data/Pagination';
import {EmptyState, QueryState} from '@/components/data/WorkspaceState';
import {Button} from '@/components/ui';
import {useI18n} from '@/contexts/I18nContext';
import {toast} from '@/contexts/ToastContext';
import {assistantKeys, assistantService, type ConversationFilter} from '@/features/assistant/services/assistant.service';
import type {AssistantConversation, AssistantPortal} from '@/features/assistant/types/assistant.types';
import {ChatMessages} from '@/features/assistant/components/ChatMessages';
import {cn} from '@/lib/utils';

const PORTALS: AssistantPortal[] = ['CUSTOMER', 'OPERATIONS', 'ADMIN'];
const PAGE_SIZE = 20;
const portalTone: Record<AssistantPortal, string> = {
    CUSTOMER: 'bg-uav-blue-light text-uav-blue',
    OPERATIONS: 'bg-amber-50 text-amber-700',
    ADMIN: 'bg-uav-red-light text-primary',
};

const th = 'sticky top-0 z-10 whitespace-nowrap border-b border-border bg-slate-50 px-4 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wider text-slate-500';
const td = 'px-4 py-3 align-top text-foreground';

/** Admin review of stored assistant chats from all three portals: search, filter, read and delete. */
export function AssistantConversations() {
    const {t, formatDate, formatNumber} = useI18n();
    const [draft, setDraft] = useState('');
    const [filter, setFilter] = useState<ConversationFilter>({portal: '', q: '', page: 0, size: PAGE_SIZE});
    const [openId, setOpenId] = useState<number | null>(null);
    const list = useQuery({
        queryKey: assistantKeys.conversationList(filter),
        queryFn: ({signal}) => assistantService.conversations(filter, signal),
        placeholderData: keepPreviousData,
    });
    const search = (event: FormEvent) => {
        event.preventDefault();
        setFilter(f => ({...f, q: draft.trim(), page: 0}));
    };
    const filtered = !!filter.q || !!filter.portal;
    const when = (iso: string) => formatDate(iso, {dateStyle: 'short', timeStyle: 'short'});

    return <div className="min-w-0 overflow-hidden rounded-panel border border-border bg-card">
        <form onSubmit={search} aria-label={t('admin.assistantChats.filters')}
              className="flex flex-wrap items-end gap-2.5 border-b border-border px-4 py-3.5">
            <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-xs font-semibold text-muted">{t('admin.assistantChats.search')}
                <input type="search" value={draft} onChange={e => setDraft(e.target.value)} placeholder={t('admin.assistantChats.searchPlaceholder')}
                       className="h-9 rounded-control border border-border-input bg-card px-2.5 text-[13px] font-normal text-foreground"/></label>
            <div role="radiogroup" aria-label={t('admin.assistantChats.portal')} className="flex flex-wrap gap-px border border-slate-200 bg-slate-200">
                {(['', ...PORTALS] as const).map(p => <button key={p || 'all'} type="button" role="radio" aria-checked={filter.portal === p}
                                                           onClick={() => setFilter(f => ({...f, portal: p, page: 0}))}
                                                           className={cn('h-9 px-3 text-xs font-bold', filter.portal === p
                                                               ? 'bg-uav-red-light text-primary shadow-[inset_0_-2px_0_var(--primary)]' : 'bg-white text-slate-600 hover:bg-slate-50')}>
                    {t(p ? `admin.assistantChats.portals.${p}` : 'admin.assistantChats.allPortals')}</button>)}
            </div>
            <Button type="submit" size="sm">{t('admin.assistantChats.apply')}</Button>
        </form>
        <QueryState query={list}>{list.data?.content.length ? <>
            <div className="overflow-x-auto" tabIndex={0} aria-label={t('admin.assistantChats.table')}>
                <table className="w-full min-w-[760px] border-separate border-spacing-0 text-sm">
                    <thead><tr>
                        <th className={th}>{t('admin.assistantChats.col.user')}</th>
                        <th className={th}>{t('admin.assistantChats.col.portal')}</th>
                        <th className={th}>{t('admin.assistantChats.col.title')}</th>
                        <th className={cn(th, 'text-right')}>{t('admin.assistantChats.col.messages')}</th>
                        <th className={cn(th, 'text-right')}>{t('admin.assistantChats.col.tokens')}</th>
                        <th className={th}>{t('admin.assistantChats.col.updated')}</th>
                    </tr></thead>
                    <tbody>{list.data.content.map(c => <tr key={c.id} className="cursor-pointer transition-colors hover:bg-background" onClick={() => setOpenId(c.id)}>
                        <td className={cn(td, 'border-b border-border')}>
                            <span className="block font-semibold">{c.fullName || c.username}</span>
                            <span className="block text-xs text-slate-500">@{c.username}</span></td>
                        <td className={cn(td, 'border-b border-border')}><PortalBadge portal={c.portal}/></td>
                        <td className={cn(td, 'max-w-[360px] border-b border-border')}>
                            <button type="button" onClick={e => {
                                e.stopPropagation();
                                setOpenId(c.id);
                            }} className="line-clamp-2 text-left font-medium text-foreground hover:text-primary hover:underline">{c.title}</button></td>
                        <td className={cn(td, 'border-b border-border text-right tabular-nums')}>{formatNumber(c.messageCount)}</td>
                        <td className={cn(td, 'border-b border-border text-right tabular-nums')}>{formatNumber(c.totalTokens)}</td>
                        <td className={cn(td, 'whitespace-nowrap border-b border-border tabular-nums text-slate-600')}>
                            <time dateTime={c.updatedAt}>{when(c.updatedAt)}</time></td>
                    </tr>)}</tbody>
                </table>
            </div>
            <Pagination page={filter.page} totalPages={list.data.totalPages} total={list.data.totalElements}
                        onChange={page => setFilter(f => ({...f, page}))}/>
        </> : <EmptyState title={t(filtered ? 'admin.assistantChats.noMatch' : 'admin.assistantChats.empty')}
                          detail={filtered ? undefined : t('admin.assistantChats.emptyDetail')}/>}</QueryState>
        {openId != null && <ConversationDrawer id={openId} onClose={() => setOpenId(null)}/>}
    </div>;
}

function PortalBadge({portal}: { portal: AssistantPortal }) {
    const {t} = useI18n();
    return <span className={cn('inline-block whitespace-nowrap rounded-badge px-2 py-1 text-xs font-semibold', portalTone[portal])}>
        {t(`admin.assistantChats.portals.${portal}`)}</span>;
}

function ConversationDrawer({id, onClose}: { id: number; onClose: () => void }) {
    const {t, formatDate, formatNumber} = useI18n();
    const client = useQueryClient();
    const detail = useQuery({queryKey: assistantKeys.conversation(id), queryFn: ({signal}) => assistantService.conversation(id, signal)});
    const remove = useMutation({
        mutationFn: () => assistantService.deleteConversation(id),
        onSuccess: () => {
            toast.success(t('admin.assistantChats.deleted'));
            client.removeQueries({queryKey: assistantKeys.conversation(id)});
            void client.invalidateQueries({queryKey: assistantKeys.conversations});
            onClose();
        },
        onError: () => toast.error(t('admin.assistantChats.deleteFailed')),
    });
    const c: AssistantConversation | undefined = detail.data?.conversation;
    return <Drawer title={t('admin.assistantChats.detailTitle')} onClose={onClose} wide>
        <QueryState query={detail}>{c && detail.data && <div className="space-y-4 p-6">
            <dl className="m-0 grid grid-cols-2 gap-px border border-slate-200 bg-slate-200 text-sm sm:grid-cols-4">
                <Fact label={t('admin.assistantChats.col.user')} value={`${c.fullName || c.username} (@${c.username})`}/>
                <Fact label={t('admin.assistantChats.col.portal')} value={<PortalBadge portal={c.portal}/>}/>
                <Fact label={t('admin.assistantChats.col.messages')} value={formatNumber(c.messageCount)}/>
                <Fact label={t('admin.assistantChats.col.tokens')} value={formatNumber(c.totalTokens)}/>
            </dl>
            <p className="m-0 text-xs text-slate-500">{t('admin.assistantChats.started', {at: formatDate(c.createdAt, {dateStyle: 'medium', timeStyle: 'short'})})}</p>
            <section className="space-y-2.5 rounded-control bg-slate-50/60 p-3" aria-label={t('admin.assistantChats.transcript')}>
                <ChatMessages messages={detail.data.messages.map(m => ({
                    role: m.role,
                    content: m.content,
                    at: Date.parse(m.createdAt),
                    images: m.attachments.map(a => ({kind: a.kind, name: a.name, src: a.dataUrl, thumb: a.dataUrl})),
                    note: [m.model, m.latencyMs != null ? t('admin.assistantChats.latency', {ms: m.latencyMs}) : null].filter(Boolean).join(' · ') || undefined,
                }))}/>
            </section>
            <div className="flex justify-end border-t border-border pt-4">
                <Button type="button" variant="outline" size="sm" disabled={remove.isPending}
                        onClick={() => window.confirm(t('admin.assistantChats.deleteConfirm')) && remove.mutate()}>
                    <Trash2 size={14} aria-hidden="true"/>{t('admin.assistantChats.delete')}</Button>
            </div>
        </div>}</QueryState>
    </Drawer>;
}

function Fact({label, value}: { label: string; value: ReactNode }) {
    return <div className="bg-white px-3 py-2.5">
        <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</dt>
        <dd className="m-0 mt-1 truncate font-semibold text-slate-900">{value}</dd>
    </div>;
}
