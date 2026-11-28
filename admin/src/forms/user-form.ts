import type {UserRole} from '@/types/admin';

export type {UserRole};

export interface AdminCreateUserDraft {
    username: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    password: string;
    confirmPassword: string;
    role: UserRole;
}

export type AdminCreateUserFieldErrors = Partial<Record<keyof AdminCreateUserDraft, string>>;

export function emptyAdminCreateUserDraft(): AdminCreateUserDraft {
    return {
        username: '',
        fullName: '',
        email: '',
        phoneNumber: '',
        password: '',
        confirmPassword: '',
        role: 'ROLE_PILOT',
    };
}

export function canSubmitAdminCreateUser(draft: AdminCreateUserDraft): boolean {
    return Boolean(
        draft.username.trim() &&
            draft.email.trim() &&
            draft.phoneNumber.trim() &&
            draft.password &&
            draft.confirmPassword,
    );
}

export function toAdminCreateUserPayload(draft: AdminCreateUserDraft) {
    return {
        username: draft.username.trim(),
        fullName: draft.fullName.trim() || undefined,
        email: draft.email.trim(),
        phoneNumber: draft.phoneNumber.trim(),
        password: draft.password,
        confirmPassword: draft.confirmPassword,
        role: draft.role,
    };
}

export function adminUserFieldErrors(error: unknown): AdminCreateUserFieldErrors | null {
    const fields = (error as { fields?: Record<string, string> } | null)?.fields;
    return fields && Object.keys(fields).length ? (fields as AdminCreateUserFieldErrors) : null;
}

export function canSubmitAdminPasswordReset(password: string): boolean {
    return password.length > 0;
}

export function toAdminPasswordResetPayload(id: number, password: string): { id: number; password: string } {
    return {id, password};
}

