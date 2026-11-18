'use client';

import {useRef, useState} from 'react';
import {Camera, ImagePlus, Trash2} from 'lucide-react';
import {Avatar} from '@/components/shared/Avatar';
import {Button, Card, CardContent, CardHeader, CardTitle} from '@/components/ui';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {AVATAR_TYPES, avatarFileError} from '@/utils/profile/avatar';
import {useAvatarMutations} from '@/hooks/profile/useProfile';
import type {AvatarUploadStatus as Status} from '@/types/profile/profile.types';

export function AvatarEditor({name}: { name: string }) {
    const {user, refreshUser} = useAuth();
    const {t} = useI18n();
    const input = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState<'upload' | 'remove' | null>(null);
    const [status, setStatus] = useState<Status>(null);

    const avatar = useAvatarMutations();
    const run = async (kind: 'upload' | 'remove', action: () => Promise<unknown>, success: string) => {
        setBusy(kind);
        setStatus(null);
        try {
            await action();
            await refreshUser();
            setStatus({kind: 'success', key: success});
        } catch {
            setStatus({kind: 'error', key: kind === 'upload' ? 'avatar.uploadFailed' : 'avatar.removeFailed'});
        } finally {
            setBusy(null);
            if (input.current) input.current.value = '';
        }
    };

    const choose = (file: File | undefined) => {
        if (!file) return;
        const problem = avatarFileError(file);
        if (problem) {
            setStatus({kind: 'error', key: problem === 'type' ? 'avatar.wrongType' : 'avatar.tooLarge'});
            if (input.current) input.current.value = '';
            return;
        }
        void run('upload', () => avatar.upload.mutateAsync(file), 'avatar.saved');
    };

    return (
        <Card className="rounded-none bg-white" aria-labelledby="ops-avatar-editor-title">
            <CardHeader className="flex-row items-center gap-2 space-y-0">
                <ImagePlus size={17} className="text-primary" aria-hidden="true"/>
                <CardTitle id="ops-avatar-editor-title" className="text-[15px] font-bold text-slate-900">
                    {t('avatar.title')}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap items-center gap-4">
                    <Avatar name={name} avatarUrl={user?.avatarUrl} size={72} className="ring-4 ring-primary/10"/>
                    <div className="grid min-w-0 flex-1 gap-3">
                        <p className="m-0 text-xs text-slate-500">{t('avatar.hint')}</p>
                        <div className="flex flex-wrap gap-2.5">
                            <input
                                ref={input}
                                type="file"
                                accept={AVATAR_TYPES.join(',')}
                                className="sr-only"
                                id="ops-officer-avatar-file"
                                onChange={event => choose(event.target.files?.[0])}
                                disabled={busy !== null}
                            />
                            <Button
                                type="button"
                                size="sm"
                                leftIcon={<Camera size={15} aria-hidden="true"/>}
                                onClick={() => input.current?.click()}
                                disabled={busy !== null}
                            >
                                {busy === 'upload' ? t('avatar.uploading') : user?.avatarUrl ? t('avatar.change') : t('avatar.upload')}
                            </Button>
                            {user?.avatarUrl && (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    leftIcon={<Trash2 size={15} aria-hidden="true"/>}
                                    disabled={busy !== null}
                                    onClick={() => void run('remove', () => avatar.remove.mutateAsync(), 'avatar.removed')}
                                >
                                    {busy === 'remove' ? t('avatar.removing') : t('avatar.remove')}
                                </Button>
                            )}
                        </div>
                        {status && (
                            <p
                                role={status.kind === 'error' ? 'alert' : 'status'}
                                className={`m-0 text-xs font-semibold ${status.kind === 'error' ? 'text-danger' : 'text-slate-800'}`}
                            >
                                {t(status.key)}
                            </p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
