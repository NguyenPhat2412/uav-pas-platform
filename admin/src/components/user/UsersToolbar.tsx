"use client";

import {Download, Lock, LockOpen, Search, UserPlus, X} from 'lucide-react';
import {userStatuses} from '@/hooks/user/useAdminUsers';
import {roles, type UserRole, type UserStatus} from '@/types/admin';
import {displayLabel} from '@/lib/presentation';
import {Badge, Button, Input, Select} from '@/components/ui';
import {cn} from '@/lib/utils';
import {useI18n} from '@/providers/I18nContext';

export interface UsersToolbarProps {
    status: UserStatus | undefined;
    counts: Record<string, number | undefined>;
    search: string;
    role: UserRole | undefined;
    selectedCount: number;
    manage: boolean;
    canCreate: boolean;
    pickerMode: boolean;
    bulkPending: boolean;
    exportPending: boolean;
    onChooseStatus: (next?: UserStatus) => void;
    onSearchChange: (next: string) => void;
    onSearchSubmit: () => void;
    onRoleChange: (next?: UserRole) => void;
    onExportCsv: () => void;
    onOpenCreate: () => void;
    onBulkLock: (locked: boolean) => void;
    onClearSelection: () => void;
}

export function UsersToolbar({
    status,
    counts,
    search,
    role,
    selectedCount,
    manage,
    canCreate,
    pickerMode,
    bulkPending,
    exportPending,
    onChooseStatus,
    onSearchChange,
    onSearchSubmit,
    onRoleChange,
    onExportCsv,
    onOpenCreate,
    onBulkLock,
    onClearSelection,
}: UsersToolbarProps) {
    const {t} = useI18n();

    return (
        <>
            <div
                className="flex gap-1 overflow-x-auto border-b border-border px-4 pt-2.5"
                role="tablist"
                aria-label={t('admin.users.filterByStatus')}
            >
                {userStatuses.map(item => {
                    const key = item ?? 'ALL';
                    const active = status === item;
                    return (
                        <Button
                            key={key}
                            type="button"
                            variant="ghost"
                            size="sm"
                            role="tab"
                            aria-selected={active}
                            className={cn(
                                'h-auto whitespace-nowrap rounded-none border-b-2 px-2.5 pb-2.5 pt-2 text-[13px] hover:bg-transparent',
                                active
                                    ? 'border-b-primary font-semibold text-primary'
                                    : 'border-b-transparent font-medium text-muted hover:text-foreground',
                            )}
                            onClick={() => onChooseStatus(item)}
                        >
                            {item ? displayLabel(item) : t('admin.users.all')}
                            <Badge size="sm" variant={active ? 'primary' : 'default'} className="font-semibold">
                                {counts[key] ?? '—'}
                            </Badge>
                        </Button>
                    );
                })}
            </div>

            <form
                className="flex flex-wrap items-center gap-2 border-b border-border p-4"
                onSubmit={e => {
                    e.preventDefault();
                    onSearchSubmit();
                }}
            >
                <div className="min-w-[160px] max-w-[320px] flex-1">
                    <Input
                        aria-label={t('admin.users.search')}
                        leftIcon={<Search size={16} aria-hidden="true"/>}
                        placeholder={t('admin.users.searchPlaceholder')}
                        value={search}
                        onChange={e => onSearchChange(e.target.value)}
                        enterKeyHint="search"
                        className="h-10 text-sm"
                    />
                </div>
                <Button type="submit" size="sm" variant="outline">
                    {t('admin.users.searchButton')}
                </Button>
                <div className="w-auto min-w-[160px] max-w-[200px]">
                    <Select
                        aria-label={t('admin.users.role')}
                        value={role ?? ''}
                        onChange={e => onRoleChange((e.target.value || undefined) as UserRole | undefined)}
                        className="h-10"
                    >
                        <option value="">{t('admin.users.allRoles')}</option>
                        {roles.map(r => (
                            <option key={r} value={r}>
                                {displayLabel(r)}
                            </option>
                        ))}
                    </Select>
                </div>
                {!pickerMode && (
                    <div className="flex w-full gap-2 sm:ml-auto sm:w-auto">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            isLoading={exportPending}
                            leftIcon={<Download size={15}/>}
                            onClick={onExportCsv}
                        >
                            {t('admin.users.export')}
                        </Button>
                        {canCreate && (
                            <Button type="button" size="sm" leftIcon={<UserPlus size={15}/>} onClick={onOpenCreate}>
                                {t('admin.users.create.open')}
                            </Button>
                        )}
                    </div>
                )}
            </form>

            {manage && selectedCount > 0 && (
                <div
                    className="mx-4 mt-3 flex flex-wrap items-center gap-2.5 rounded-panel bg-uav-red-light px-3.5 py-2.5 text-[13px]"
                    role="region"
                    aria-label={t('admin.users.bulk.region')}
                >
                    <strong>{t('admin.users.bulk.selected', {count: selectedCount})}</strong>
                    <Button
                        size="sm"
                        variant="danger"
                        leftIcon={<Lock size={14}/>}
                        disabled={bulkPending}
                        onClick={() => onBulkLock(true)}
                    >
                        {t('admin.users.bulk.lock')}
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<LockOpen size={14}/>}
                        disabled={bulkPending}
                        onClick={() => onBulkLock(false)}
                    >
                        {t('admin.users.bulk.unlock')}
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        leftIcon={<X size={14} aria-hidden="true"/>}
                        className="ml-auto h-7 px-2 text-xs text-muted hover:text-foreground"
                        onClick={onClearSelection}
                    >
                        {t('admin.users.bulk.clear')}
                    </Button>
                </div>
            )}
        </>
    );
}
