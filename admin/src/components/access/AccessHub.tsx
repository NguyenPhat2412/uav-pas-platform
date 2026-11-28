'use client';
import Link from 'next/link';
import {AccessControl, TemplateEditor} from "@/components/access/PermissionEditor";
import {Registry} from "@/components/access/Registry";
import {RoleMatrix} from "@/components/access/RoleMatrix";
import {useI18n} from '@/providers/I18nContext';
import type {AccessTab} from '@/types/access.types';

export type {AccessTab};

const ACCESS_TABS: ReadonlyArray<{id: AccessTab; href: string; labelKey: string; fallback: string}> = [
    {id: 'accounts', href: '/admin/access-control', labelKey: 'adminNav.accessControl', fallback: 'Phân quyền cá nhân'},
    {id: 'templates', href: '/admin/access-control/role-templates', labelKey: 'adminNav.roleTemplates', fallback: 'Mẫu vai trò'},
    {id: 'matrix', href: '/admin/access-control/role-matrix', labelKey: 'adminNav.roleMatrix', fallback: 'Ma trận vai trò'},
    {id: 'registry', href: '/admin/access-control/permissions', labelKey: 'adminNav.permissions', fallback: 'Danh mục quyền'},
];

export function AccessHub({tab}: { tab: AccessTab }) {
    const {t} = useI18n();
    return <div className="space-y-5">
        <nav
            aria-label="Phân quyền & Vai trò"
            className="flex flex-wrap items-center gap-1.5 rounded-panel border border-border bg-card p-1.5"
        >
            {ACCESS_TABS.map(item => {
                const active = item.id === tab;
                const label = t(item.labelKey);
                return (
                    <Link
                        key={item.id}
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        className={`inline-flex min-h-9 items-center rounded-control px-3.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                            active
                                ? 'bg-primary text-primary-foreground shadow-2xs'
                                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                    >
                        {label === item.labelKey ? item.fallback : label}
                    </Link>
                );
            })}
            <Link
                href="/admin/users"
                className="ml-auto inline-flex min-h-9 items-center rounded-control px-3 text-xs font-semibold whitespace-nowrap text-uav-blue hover:bg-uav-blue-light"
            >
                {t('adminNav.users')} →
            </Link>
        </nav>
        {tab === 'accounts' && <AccessControl/>}
        {tab === 'templates' && <TemplateEditor/>}
        {tab === 'matrix' && <RoleMatrix/>}
        {tab === 'registry' && <Registry/>}
    </div>;
}
