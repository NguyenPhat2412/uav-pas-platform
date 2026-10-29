'use client';

import Link from 'next/link';
import {useState, type FormEvent} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {CheckCheck, Mail, MailOpen, Search, Send, X} from 'lucide-react';
import {useAuth} from '@/contexts/AuthContext';
import {useI18n} from '@/contexts/I18nContext';
import {Alert, Button} from '@/components/ui';
import {ErrorNotice, QueryState} from '@/components/data/WorkspaceState';
import {Pagination} from '@/components/data/Pagination';
import {adminService} from '@/lib/api/admin';
import {cn} from '@/lib/utils';
import {notificationsService} from '@/lib/api/services';
import {RequiredMark} from '@/components/shared/RequiredMark';
import {FilterSelect} from '@/components/shared/FilterSelect';
import {notificationTypes, type NotificationRecord, type NotificationType} from '@/features/notifications/types/notification.types';

const PAGE_SIZE = 20;

const typeTone: Record<NotificationType, string> = {
    MISSION_ASSIGNED: 'bg-violet-50 text-violet-700 ring-violet-200',
    MISSION_STATUS_CHANGED: 'bg-sky-50 text-sky-700 ring-sky-200',
    SAR_TARGET_FOUND: 'bg-red-50 text-red-700 ring-red-200',
    QUOTA_WARNING: 'bg-amber-50 text-amber-800 ring-amber-200',
    PAYMENT: 'bg-uav-blue-light text-uav-blue ring-blue-200',
    SYSTEM: 'bg-slate-100 text-slate-700 ring-slate-200',
};

/** Where a notification's reference opens; unknown reference types are shown as text only. */
function referenceHref(n: NotificationRecord) {
    if (!n.referenceId) return null;
    switch (n.referenceType) {
        case 'MISSION':
            return `/operations/missions/${n.referenceId}`;
        case 'INVOICE':
            return '/admin/billing';
        case 'USER':
            return `/admin/users/${n.referenceId}`;
        default:
            return null;
    }
}

export function AdminNotificationsPanel() {
    const {user, can} = useAuth();
    const {t, formatDate} = useI18n();
    const client = useQueryClient();
    const [page, setPage] = useState(0);
    const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all');
    const [type, setType] = useState<NotificationType | ''>('');
    const [search, setSearch] = useState('');
    const [composing, setComposing] = useState(false);
    const [notice, setNotice] = useState('');
    const key = ['session', user?.id ?? 'anonymous', 'notifications'] as const;
    const query = useQuery({
        queryKey: [...key, 'admin-page', page],
        queryFn: ({signal}) => notificationsService.page(page, PAGE_SIZE, signal),
        enabled: !!user,
    });
    const refresh = () => client.invalidateQueries({queryKey: key});
    const markOne = useMutation({mutationFn: notificationsService.markRead, onSuccess: refresh});
    const markAll = useMutation({mutationFn: notificationsService.markAllRead, onSuccess: refresh});

    const term = search.trim().toLowerCase();
    const rows = (query.data?.content ?? []).filter(n =>
        (readFilter === 'all' || (readFilter === 'unread' ? !n.isRead : n.isRead))
        && (!type || n.type === type)
        && (!term || `${n.title} ${n.content}`.toLowerCase().includes(term)));
    const unreadOnPage = (query.data?.content ?? []).filter(n => !n.isRead).length;
    const typeLabel = (value: NotificationType | null) => t(`admin.notifications.types.${value ?? 'SYSTEM'}`);

    return <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
            <FilterSelect label={t('admin.notifications.col.status')} value={readFilter} onChange={setReadFilter}
                          options={(['all', 'unread', 'read'] as const).map(value => ({
                              value, label: t(`admin.notifications.filter.${value}`),
                              count: value === 'unread' && unreadOnPage > 0 ? unreadOnPage : undefined,
                          }))}/>
            <label className="relative">
                <span className="sr-only">{t('admin.notifications.search')}</span>
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true"/>
                <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder={t('admin.notifications.search')}
                       className="h-9 w-60 rounded-control border border-border bg-card pl-9 pr-3 text-[13px] focus:border-primary focus:outline-none"/>
            </label>
            <FilterSelect<NotificationType | ''> label={t('admin.notifications.type')} value={type} onChange={setType}
                                                 options={[{value: '', label: t('admin.notifications.allTypes')},
                                                     ...notificationTypes.map(value => ({value, label: typeLabel(value)}))]}/>
            <div className="ml-auto flex gap-2">
                <Button size="sm" variant="outline" leftIcon={<CheckCheck size={15}/>} disabled={markAll.isPending || !unreadOnPage}
                        onClick={() => markAll.mutate()}>{t('admin.notifications.markAll')}</Button>
                {can('USER_MANAGE') && <Button size="sm" leftIcon={<Send size={15}/>} onClick={() => setComposing(true)}>
                    {t('admin.notifications.send')}</Button>}
            </div>
        </div>

        {notice && <Alert variant="success">{notice}</Alert>}
        <ErrorNotice error={markOne.error || markAll.error}/>

        <section className="overflow-hidden rounded-panel border border-border bg-card">
            <QueryState query={query}>{query.data && <>
                {rows.length ? <div className="overflow-x-auto" tabIndex={0} aria-label={t('admin.notifications.table')}>
                    <table className="w-full min-w-[820px] border-collapse text-left text-[13px]">
                        <thead className="bg-slate-50 text-[11.5px] font-semibold uppercase tracking-wide text-slate-500">
                        <tr>
                            <th className="w-28 px-4 py-3">{t('admin.notifications.col.status')}</th>
                            <th className="px-4 py-3">{t('admin.notifications.col.content')}</th>
                            <th className="w-44 px-4 py-3">{t('admin.notifications.col.type')}</th>
                            <th className="w-40 px-4 py-3">{t('admin.notifications.col.reference')}</th>
                            <th className="w-40 px-4 py-3">{t('admin.notifications.col.time')}</th>
                            <th className="w-36 px-4 py-3 text-right">{t('admin.notifications.col.actions')}</th>
                        </tr>
                        </thead>
                        <tbody>{rows.map(n => {
                            const href = referenceHref(n);
                            return <tr key={n.id} className={cn('border-t border-slate-100 align-top hover:bg-slate-50/70', !n.isRead && 'bg-rose-50/40')}>
                                <td className="px-4 py-3">
                                    <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold', n.isRead ? 'text-slate-400' : 'text-primary')}>
                                        {n.isRead ? <MailOpen size={14} aria-hidden="true"/> : <Mail size={14} aria-hidden="true"/>}
                                        {t(n.isRead ? 'admin.notifications.read' : 'admin.notifications.unread')}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <strong className={cn('block text-slate-900', !n.isRead && 'font-bold')}>{n.title}</strong>
                                    <span className="mt-0.5 line-clamp-2 block text-slate-500">{n.content}</span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={cn('inline-flex rounded-badge px-2 py-0.5 text-xs font-semibold ring-1 ring-inset', typeTone[n.type ?? 'SYSTEM'])}>
                                        {typeLabel(n.type)}</span>
                                </td>
                                <td className="px-4 py-3 text-slate-600">{n.referenceType ? (href ?
                                    <Link href={href} className="font-semibold text-primary hover:underline">{n.referenceType} #{n.referenceId}</Link> :
                                    `${n.referenceType}${n.referenceId ? ` #${n.referenceId}` : ''}`) : '—'}</td>
                                <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                                    <time dateTime={n.createdAt}>{formatDate(n.createdAt, {dateStyle: 'short', timeStyle: 'short'})}</time>
                                </td>
                                <td className="px-4 py-3 text-right">{!n.isRead &&
                                    <button type="button" disabled={markOne.isPending} onClick={() => markOne.mutate(n.id)}
                                            className="rounded-control px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-50">
                                        {t('admin.notifications.markRead')}</button>}</td>
                            </tr>;
                        })}</tbody>
                    </table>
                </div> : <div className="px-6 py-12 text-center">
                    <MailOpen size={28} className="mx-auto text-slate-300" aria-hidden="true"/>
                    <p className="mt-3 font-semibold text-slate-700">{t(query.data.totalElements ? 'admin.notifications.noMatch' : 'admin.notifications.empty')}</p>
                </div>}
                {query.data.totalPages > 1 && <div className="border-t border-slate-100 px-4 py-2">
                    <Pagination page={page} totalPages={query.data.totalPages} total={query.data.totalElements} onChange={setPage}/>
                </div>}
            </>}</QueryState>
        </section>
        <p className="text-xs text-slate-500">{t('admin.notifications.filterHint')}</p>

        {composing && <SendDialog onClose={() => setComposing(false)} onSent={name => {
            setComposing(false);
            setNotice(t('admin.notifications.sent', {name}));
        }}/>}
    </div>;
}

function SendDialog({onClose, onSent}: { onClose: () => void; onSent: (name: string) => void }) {
    const {t} = useI18n();
    const [keyword, setKeyword] = useState('');
    const [recipient, setRecipient] = useState<{ id: number; name: string } | null>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [type, setType] = useState<NotificationType>('SYSTEM');
    const users = useQuery({
        queryKey: ['admin-notification-recipients', keyword],
        queryFn: ({signal}) => adminService.users(0, keyword, undefined, signal, undefined, 8),
        enabled: keyword.trim().length >= 2 && !recipient,
    });
    const send = useMutation({mutationFn: notificationsService.send});
    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!recipient) return;
        try {
            await send.mutateAsync({userId: recipient.id, title: title.trim(), content: content.trim(), type});
            onSent(recipient.name);
        } catch {/* The error is shown in the dialog. */
        }
    };
    const field = 'mt-1 w-full rounded-control border border-border px-3 py-2 text-[13px] font-normal focus:border-primary focus:outline-none';
    return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 p-4" role="presentation"
                onMouseDown={e => e.target === e.currentTarget && onClose()}>
        <form role="dialog" aria-modal="true" aria-labelledby="send-notification-title" onSubmit={e => void submit(e)}
              onKeyDown={e => e.key === 'Escape' && onClose()}
              className="flex max-h-[calc(100dvh-32px)] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-overlay bg-card p-6 shadow-2xl">
            <header className="flex items-center justify-between">
                <h2 id="send-notification-title" className="text-lg font-bold">{t('admin.notifications.sendTitle')}</h2>
                <button type="button" onClick={onClose} aria-label={t('admin.notifications.cancel')}
                        className="rounded-control p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18}/></button>
            </header>
            <div className="text-[13px] font-semibold text-slate-600">{t('admin.notifications.recipient')}<RequiredMark/>
                {recipient ? <div className="mt-1 flex items-center justify-between rounded-panel bg-primary/10 px-3 py-2 text-primary">
                    <span>{recipient.name}</span>
                    <button type="button" onClick={() => setRecipient(null)} className="text-xs font-semibold hover:underline">
                        {t('admin.notifications.change')}</button>
                </div> : <>
                    <input autoFocus value={keyword} onChange={e => setKeyword(e.target.value)} className={field}
                           placeholder={t('admin.notifications.recipientSearch')} aria-label={t('admin.notifications.recipient')}/>
                    {users.data?.content.length ? <ul className="mt-1 max-h-48 overflow-y-auto rounded-panel border border-border">
                        {users.data.content.map(u => <li key={u.id}>
                            <button type="button" onClick={() => setRecipient({id: u.id, name: u.fullName || u.username})}
                                    className="flex w-full justify-between px-3 py-2 text-left font-normal hover:bg-slate-50">
                                <span>{u.fullName || u.username}</span><small className="text-slate-400">@{u.username}</small>
                            </button>
                        </li>)}
                    </ul> : keyword.trim().length >= 2 && users.isFetched &&
                        <p className="mt-1 text-xs font-normal text-slate-500">{t('admin.notifications.noRecipient')}</p>}
                </>}
            </div>
            <label className="text-[13px] font-semibold text-slate-600">{t('admin.notifications.type')}<RequiredMark/>
                <select value={type} onChange={e => setType(e.target.value as NotificationType)} className={field}>
                    {notificationTypes.map(value => <option key={value} value={value}>{t(`admin.notifications.types.${value}`)}</option>)}
                </select></label>
            <label className="text-[13px] font-semibold text-slate-600">{t('admin.notifications.titleField')}<RequiredMark/>
                <input aria-required value={title} onChange={e => setTitle(e.target.value)} className={field}/></label>
            <label className="text-[13px] font-semibold text-slate-600">{t('admin.notifications.contentField')}<RequiredMark/>
                <textarea aria-required rows={4} value={content} onChange={e => setContent(e.target.value)} className={field}/></label>
            <ErrorNotice error={send.error}/>
            <footer className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose}>{t('admin.notifications.cancel')}</Button>
                <Button type="submit" disabled={!recipient || send.isPending}>{t('admin.notifications.submit')}</Button>
            </footer>
        </form>
    </div>;
}
