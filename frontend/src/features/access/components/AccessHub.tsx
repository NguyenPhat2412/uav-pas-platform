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
        <nav className="access-tabs" aria-label={t('admin.access.tabs.nav')}>{tabs.map(item => {
            const Icon = item.icon;
            const active = item.id === tab;
            return <Link key={item.id} href={item.href} aria-current={active ? 'page' : undefined}
                         className={cn('access-tab', active && 'access-tab-active')}>
                <span className="access-tab-icon" aria-hidden="true"><Icon size={18}/></span>
                <span className="min-w-0"><strong>{t(item.label)}</strong><small>{t(item.hint)}</small></span>
            </Link>;
        })}</nav>
        {tab === 'accounts' && <AccessControl/>}
        {tab === 'templates' && <TemplateEditor/>}
        {tab === 'matrix' && <RoleMatrix/>}
        {tab === 'registry' && <Registry/>}
    </div>;
}
