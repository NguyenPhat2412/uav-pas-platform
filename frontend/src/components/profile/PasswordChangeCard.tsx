'use client';

import {useState, type FormEvent} from 'react';
import {KeyRound, LogOut} from 'lucide-react';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {ErrorNotice} from '@/components/data/WorkspaceState';
import {RequiredMark} from '@/components/shared/RequiredMark';
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
    const field = 'mt-1 w-full border border-slate-200 px-3 py-2 text-[13px] font-normal focus:border-primary focus:outline-none aria-[invalid=true]:border-danger';
    return <section className="border border-slate-200 bg-white" aria-labelledby="password-title">
        <header className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
            <KeyRound size={17} className="text-primary" aria-hidden="true"/>
            <h2 id="password-title" className="text-[15px] font-bold text-slate-900">{t('admin.profile.password.title')}</h2>
        </header>
        {done ? <div className="space-y-3 p-5">
            <p role="status" className="border-l-[3px] border-l-uav-blue bg-uav-blue-light px-3 py-2 text-[13px] text-uav-blue">
                {t('admin.profile.password.done')}</p>
            <button type="button" onClick={() => void logout()}
                    className="inline-flex h-9 items-center gap-1.5 bg-primary px-4 text-[13px] font-semibold text-primary-foreground">
                <LogOut size={15} aria-hidden="true"/>{t('admin.profile.password.signInAgain')}</button>
        </div> : <form className="space-y-4 p-5" onSubmit={e => void submit(e)} noValidate>
            <label className="block text-[13px] font-semibold text-slate-600">{t('admin.profile.password.current')}<RequiredMark/>
                <input type="password" aria-required aria-invalid={Boolean(fieldErrors?.currentPassword)} autoComplete="current-password" value={draft.currentPassword} onChange={e => setDraft({...draft, currentPassword: e.target.value})} className={field}/>
                {fieldErrors?.currentPassword && <span className="mt-1 block text-xs font-normal text-danger">{fieldErrors.currentPassword}</span>}</label>
            <label className="block text-[13px] font-semibold text-slate-600">{t('admin.profile.password.new')}<RequiredMark/>
                <input type="password" aria-required aria-invalid={Boolean(fieldErrors?.newPassword)} autoComplete="new-password" value={draft.newPassword}
                       onChange={e => setDraft({...draft, newPassword: e.target.value})} className={field}/>
                {fieldErrors?.newPassword && <span className="mt-1 block text-xs font-normal text-danger">{fieldErrors.newPassword}</span>}</label>
            <label className="block text-[13px] font-semibold text-slate-600">{t('admin.profile.password.confirm')}<RequiredMark/>
                <input type="password" aria-required aria-invalid={Boolean(fieldErrors?.confirmPassword)} autoComplete="new-password" value={draft.confirmPassword}
                       onChange={e => setDraft({...draft, confirmPassword: e.target.value})} className={field}/>
                {fieldErrors?.confirmPassword && <span className="mt-1 block text-xs font-normal text-danger">{fieldErrors.confirmPassword}</span>}</label>
            <p className="text-xs text-slate-500">{t('admin.profile.password.hint')}</p>
            {change.error && !fieldErrors && <ErrorNotice error={change.error}/>}
            <button type="submit" disabled={change.isPending || !canSubmitPasswordChange(draft)}
                    className="inline-flex h-9 items-center gap-1.5 bg-primary px-4 text-[13px] font-semibold text-primary-foreground disabled:opacity-50">
                <KeyRound size={15} aria-hidden="true"/>{t('admin.profile.password.submit')}</button>
        </form>}
    </section>;
}
