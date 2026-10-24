export type PermissionCode = string;

export interface User {
    id: number;
    username: string;
    email: string;
    fullName?: string;
    role: string;
    status: string;
}

export interface Permission {
    code: PermissionCode;
    description?: string;
}

export interface UserPermission {
    code: PermissionCode;
    granted: boolean;
}

export interface RoleTemplate {
    role: string;
    name: string;
    permissions: PermissionCode[];
}

export interface Page<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
}
