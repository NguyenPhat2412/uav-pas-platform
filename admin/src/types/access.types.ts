import type {Page} from '@/types';
import type {
    Permission,
    PermissionCode,
    RoleTemplate,
    User,
    UserPermission,
} from '@/types/admin';

export type {
    Page,
    Permission,
    PermissionCode,
    RoleTemplate,
    User,
    UserPermission,
};

export type AccessTab = 'accounts' | 'templates' | 'matrix' | 'registry';
export type Override = boolean | null;
export type Change = { code: string; value: Override };
