"use client";

import {useRef, useState, type FormEvent} from 'react';
import {X} from 'lucide-react';
import {useDialogFocusTrap} from '@/hooks/useDialogFocusTrap';
import {useAdminMutations} from '@/hooks/user/useAdminUsers';
import {
    adminUserFieldErrors,
    canSubmitAdminCreateUser,
    emptyAdminCreateUserDraft,
    toAdminCreateUserPayload,
    type AdminCreateUserDraft,
} from '@/forms/user/user-form';
import {roles} from '@/types/admin';
import {displayLabel} from '@/lib/presentation';
import {ErrorNotice} from '@/components/data/WorkspaceState';
import {Button, FormField, Input, PasswordInput, Select} from '@/components/ui';
import {cn} from '@/lib/utils';
import {useI18n} from '@/providers/I18nContext';

export interface UserFormDrawerProps {
    onClose: () => void;
    onCreated: (username: string) => void;
}

export function UserFormDrawer({onClose, onCreated}: UserFormDrawerProps) {
    const {t} = useI18n();
    const dialogRef = useRef<HTMLFormElement>(null);
    useDialogFocusTrap(dialogRef, true, onClose);
    const {create} = useAdminMutations();
    const [form, setForm] = useState<AdminCreateUserDraft>(emptyAdminCreateUserDraft);
    const fieldErrors = adminUserFieldErrors(create.error);

    const set = (field: keyof AdminCreateUserDraft) => (e: { target: { value: string } }) =>
        setForm(prev => ({...prev, [field]: e.target.value}));

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        try {
            const created = await create.mutateAsync(toAdminCreateUserPayload(form));
            onCreated(created.username);
        } catch {
            /* The mutation error is shown in the dialog. */
        }
    };

    const compactInput = (hasError?: string) => cn('h-11 px-3 text-sm', hasError && 'border-danger');

    return (
        <div
            className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/45 p-4"
            role="presentation"
            onMouseDown={e => e.target === e.currentTarget && onClose()}
        >
            <form
                ref={dialogRef}
                noValidate
                className="flex max-h-[calc(100dvh-32px)] w-[min(640px,100%)] flex-col gap-3.5 overflow-y-auto rounded-overlay bg-card px-[22px] py-5 shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-user-title"
                onSubmit={e => void submit(e)}
            >
                <header className="flex items-center justify-between gap-2.5">
                    <h2 id="create-user-title" className="text-[17px] font-bold text-foreground">
                        {t('admin.users.create.title')}
                    </h2>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 w-9 p-0 text-muted hover:border-primary hover:bg-uav-red-light hover:text-primary"
                        aria-label={t('admin.users.create.cancel')}
                        onClick={onClose}
                    >
                        <X size={18}/>
                    </Button>
                </header>

                <div className="grid grid-cols-1 gap-x-3.5 gap-y-3 sm:grid-cols-2">
                    <FormField id="create-user-username" label={t('admin.users.field.username')} required error={fieldErrors?.username}>
                        <Input
                            id="create-user-username"
                            required
                            aria-required
                            aria-invalid={Boolean(fieldErrors?.username)}
                            autoFocus
                            autoComplete="off"
                            value={form.username}
                            onChange={set('username')}
                            className={compactInput(fieldErrors?.username)}
                        />
                    </FormField>

                    <FormField id="create-user-fullname" label={t('admin.users.field.fullName')} optional error={fieldErrors?.fullName}>
                        <Input
                            id="create-user-fullname"
                            aria-invalid={Boolean(fieldErrors?.fullName)}
                            value={form.fullName}
                            onChange={set('fullName')}
                            className={compactInput(fieldErrors?.fullName)}
                        />
                    </FormField>

                    <FormField id="create-user-email" label={t('admin.users.field.email')} required error={fieldErrors?.email}>
                        <Input
                            id="create-user-email"
                            type="email"
                            required
                            aria-required
                            aria-invalid={Boolean(fieldErrors?.email)}
                            value={form.email}
                            onChange={set('email')}
                            className={compactInput(fieldErrors?.email)}
                        />
                    </FormField>

                    <FormField id="create-user-phone" label={t('admin.users.field.phone')} required error={fieldErrors?.phoneNumber}>
                        <Input
                            id="create-user-phone"
                            type="tel"
                            required
                            aria-required
                            aria-invalid={Boolean(fieldErrors?.phoneNumber)}
                            value={form.phoneNumber}
                            onChange={set('phoneNumber')}
                            className={compactInput(fieldErrors?.phoneNumber)}
                        />
                    </FormField>

                    <FormField id="create-user-role" label={t('admin.users.field.role')} required>
                        <Select id="create-user-role" required value={form.role} onChange={set('role')}>
                            {roles.map(r => (
                                <option key={r} value={r}>
                                    {displayLabel(r)}
                                </option>
                            ))}
                        </Select>
                    </FormField>

                    <span className="hidden sm:block" aria-hidden="true"/>

                    <FormField id="create-user-password" label={t('admin.users.create.password')} required error={fieldErrors?.password}>
                        <PasswordInput
                            id="create-user-password"
                            required
                            aria-required
                            aria-invalid={Boolean(fieldErrors?.password)}
                            autoComplete="new-password"
                            value={form.password}
                            onChange={set('password')}
                            className={cn('text-sm', fieldErrors?.password && 'border-danger')}
                        />
                    </FormField>

                    <FormField id="create-user-confirm" label={t('admin.users.create.confirm')} required error={fieldErrors?.confirmPassword}>
                        <PasswordInput
                            id="create-user-confirm"
                            required
                            aria-required
                            aria-invalid={Boolean(fieldErrors?.confirmPassword)}
                            autoComplete="new-password"
                            value={form.confirmPassword}
                            onChange={set('confirmPassword')}
                            className={cn('text-sm', fieldErrors?.confirmPassword && 'border-danger')}
                        />
                    </FormField>
                </div>

                <p className="text-xs text-slate-500">{t('admin.users.create.hint')}</p>
                {create.error && !fieldErrors && <ErrorNotice error={create.error}/>}

                <footer className="flex items-center justify-end gap-2.5">
                    <Button type="button" variant="outline" onClick={onClose}>
                        {t('admin.users.create.cancel')}
                    </Button>
                    <Button
                        type="submit"
                        isLoading={create.isPending}
                        disabled={!canSubmitAdminCreateUser(form)}
                    >
                        {t('admin.users.create.submit')}
                    </Button>
                </footer>
            </form>
        </div>
    );
}
