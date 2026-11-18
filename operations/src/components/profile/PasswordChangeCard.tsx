'use client';

import {useState, type FormEvent} from 'react';
import {KeyRound, LogOut} from 'lucide-react';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {ErrorNotice} from '@/components/data/WorkspaceState';
import {Alert, Button, Card, CardContent, CardHeader, CardTitle, FormField, PasswordInput} from '@/components/ui';
import {cn} from '@/lib/utils';
import {useChangePassword} from '@/hooks/profile/useProfile';
import {
    canSubmitPasswordChange,
    emptyPasswordChangeDraft,
    passwordChangeFieldErrors,
    toPasswordChangePayload,
    type PasswordChangeDraft,
} from '@/forms/profile/profile-form';

export function PasswordChangeCard() {
    const {logout} = useAuth();
    const {t} = useI18n();
    const [draft, setDraft] = useState<PasswordChangeDraft>(emptyPasswordChangeDraft);
    const [done, setDone] = useState(false);
    const change = useChangePassword();
    const fieldErrors = passwordChangeFieldErrors(change.error);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        try {
            await change.mutateAsync(toPasswordChangePayload(draft));
            setDraft(emptyPasswordChangeDraft());
            setDone(true);
        } catch {
            /* Shown below. */
        }
    };

    return (
        <Card className="rounded-none bg-white" aria-labelledby="password-title">
            <CardHeader className="flex-row items-center gap-2 space-y-0">
                <KeyRound size={17} className="text-primary" aria-hidden="true"/>
                <CardTitle id="password-title" className="text-[15px] font-bold text-slate-900">
                    {t('admin.profile.password.title')}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {done ? (
                    <div className="space-y-3">
                        <Alert variant="success">{t('admin.profile.password.done')}</Alert>
                        <Button
                            type="button"
                            size="sm"
                            leftIcon={<LogOut size={15} aria-hidden="true"/>}
                            onClick={() => void logout()}
                        >
                            {t('admin.profile.password.signInAgain')}
                        </Button>
                    </div>
                ) : (
                    <form className="space-y-4" onSubmit={e => void submit(e)} noValidate>
                        <FormField id="password-current" label={t('admin.profile.password.current')} required error={fieldErrors?.currentPassword}>
                            <PasswordInput
                                id="password-current"
                                required
                                aria-required
                                aria-invalid={Boolean(fieldErrors?.currentPassword)}
                                autoComplete="current-password"
                                value={draft.currentPassword}
                                onChange={e => setDraft({...draft, currentPassword: e.target.value})}
                                className={cn('text-sm', fieldErrors?.currentPassword && 'border-danger')}
                            />
                        </FormField>

                        <FormField id="password-new" label={t('admin.profile.password.new')} required error={fieldErrors?.newPassword}>
                            <PasswordInput
                                id="password-new"
                                required
                                aria-required
                                aria-invalid={Boolean(fieldErrors?.newPassword)}
                                autoComplete="new-password"
                                value={draft.newPassword}
                                onChange={e => setDraft({...draft, newPassword: e.target.value})}
                                className={cn('text-sm', fieldErrors?.newPassword && 'border-danger')}
                            />
                        </FormField>

                        <FormField id="password-confirm" label={t('admin.profile.password.confirm')} required error={fieldErrors?.confirmPassword}>
                            <PasswordInput
                                id="password-confirm"
                                required
                                aria-required
                                aria-invalid={Boolean(fieldErrors?.confirmPassword)}
                                autoComplete="new-password"
                                value={draft.confirmPassword}
                                onChange={e => setDraft({...draft, confirmPassword: e.target.value})}
                                className={cn('text-sm', fieldErrors?.confirmPassword && 'border-danger')}
                            />
                        </FormField>

                        <p className="text-xs text-slate-500">{t('admin.profile.password.hint')}</p>
                        {change.error && !fieldErrors && <ErrorNotice error={change.error}/>}

                        <Button
                            type="submit"
                            size="sm"
                            isLoading={change.isPending}
                            disabled={!canSubmitPasswordChange(draft)}
                            leftIcon={<KeyRound size={15} aria-hidden="true"/>}
                        >
                            {t('admin.profile.password.submit')}
                        </Button>
                    </form>
                )}
            </CardContent>
        </Card>
    );
}
