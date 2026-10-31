'use client';

import {useState, type FormEvent} from 'react';
import {KeyRound, LogOut} from 'lucide-react';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {ErrorNotice} from '@/components/data/WorkspaceState';
import {RequiredMark} from '@/components/shared/RequiredMark';
import {useChangePassword} from '@/hooks/profile/useProfile';

export function PasswordChangeCard() {
    const {logout} = useAuth();
    const {t} = useI18n();
    const [current, setCurrent] = useState('');
    const [next, setNext] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);
    const change = useChangePassword();
    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            await change.mutateAsync({current, next, confirm});
            setCurrent('');
            setNext('');
            setConfirm('');
            setDone(true);
        } catch {
            /* Shown below. */
        }
    };
    const field = 'mt-1 w-full border border-slate-200 px-3 py-2 text-[13px] font-normal focus:border-primary focus:outline-none';
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
                <input type="password" aria-required autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)} className={field}/></label>
            <label className="block text-[13px] font-semibold text-slate-600">{t('admin.profile.password.new')}<RequiredMark/>
                <input type="password" aria-required autoComplete="new-password" value={next}
                       onChange={e => setNext(e.target.value)} className={field}/></label>
            <label className="block text-[13px] font-semibold text-slate-600">{t('admin.profile.password.confirm')}<RequiredMark/>
                <input type="password" aria-required autoComplete="new-password" value={confirm}
                       onChange={e => setConfirm(e.target.value)} className={field}/></label>
            <p className="text-xs text-slate-500">{t('admin.profile.password.hint')}</p>
            {error && <p role="alert" className="border-l-[3px] border-l-red-600 bg-red-50 px-3 py-2 text-[13px] text-red-800">{error}</p>}
            <ErrorNotice error={change.error}/>
            <button type="submit" disabled={change.isPending}
                    className="inline-flex h-9 items-center gap-1.5 bg-primary px-4 text-[13px] font-semibold text-primary-foreground disabled:opacity-50">
                <KeyRound size={15} aria-hidden="true"/>{t('admin.profile.password.submit')}</button>
        </form>}
    </section>;
}
