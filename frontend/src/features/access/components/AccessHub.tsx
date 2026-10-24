'use client';
import Link from 'next/link';
import {FileKey2, Grid3x3, KeyRound, UserCog} from 'lucide-react';
import {AccessControl, TemplateEditor} from "@/features/access/components/PermissionEditor";
import {Registry} from "@/features/access/components/Registry";
import {RoleMatrix} from "@/features/access/components/RoleMatrix";
import {cn} from '@/lib/utils';
import {useI18n} from '@/contexts/I18nContext';

export type AccessTab = 'accounts' | 'templates' | 'matrix' | 'registry';

// Each tab keeps its original URL so existing links and bookmarks still land on the right view.
const tabs = [
    {id: 'accounts', href: '/admin/access-control', label: 'admin.access.tabs.accounts', hint: 'admin.access.tabs.accountsHint', icon: UserCog},
    {id: 'templates', href: '/admin/role-templates', label: 'admin.access.tabs.templates', hint: 'admin.access.tabs.templatesHint', icon: KeyRound},
    {id: 'matrix', href: '/admin/role-matrix', label: 'admin.access.tabs.matrix', hint: 'admin.access.tabs.matrixHint', icon: Grid3x3},
    {id: 'registry', href: '/admin/permissions', label: 'admin.access.tabs.registry', hint: 'admin.access.tabs.registryHint', icon: FileKey2},
] as const;

export function AccessHub({tab}: { tab: AccessTab }) {
    const {t} = useI18n();
    return <div className="space-y-5">
        <nav className="grid grid-cols-1 gap-3 md:grid-cols-[repeat(auto-fit,minmax(210px,1fr))]" aria-label={t('admin.access.tabs.nav')}>{tabs.map(item => {
            const Icon = item.icon;
            const active = item.id === tab;
            return <Link key={item.id} href={item.href} aria-current={active ? 'page' : undefined}
                         className={cn(
                             'flex items-center gap-3 rounded-xl border bg-card px-4 py-3.5 text-foreground transition',
                             active ? 'border-primary ring-3 ring-primary/12' : 'border-border hover:border-slate-300'
                         )}>
                <span className={cn(
                    'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px]',
                    active ? 'bg-uav-red-light text-primary' : 'bg-slate-100 text-slate-500'
                )} aria-hidden="true"><Icon size={18}/></span>
                <span className="flex min-w-0 flex-col"><strong className="text-sm">{t(item.label)}</strong><small className="hidden text-xs text-muted md:inline">{t(item.hint)}</small></span>
            </Link>;
        })}</nav>
        {tab === 'accounts' && <AccessControl/>}
        {tab === 'templates' && <TemplateEditor/>}
        {tab === 'matrix' && <RoleMatrix/>}
        {tab === 'registry' && <Registry/>}
    </div>;
}
