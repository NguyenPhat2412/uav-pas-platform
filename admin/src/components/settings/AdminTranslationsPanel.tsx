'use client';

import React, {useState} from 'react';
import {Globe, Languages, Plus, Save, Search, Trash2} from 'lucide-react';
import {AdminPage} from '@/components/layout/AdminPage';
import {Pagination} from '@/components/data/Pagination';
import {QueryState} from '@/components/data/WorkspaceState';
import {Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, FormField, Input, Select, Textarea} from '@/components/ui';
import {useAdminI18nMutations, useAdminI18nNamespaces, useAdminTranslations} from '@/hooks/useAdminI18n';
import {useI18n} from '@/providers/I18nContext';
import {toast} from '@/providers/ToastContext';
import type {UiTranslationRow} from '@/types/i18n.types';

interface DraftEditorState {
    translationKey: string;
    namespace: string;
    description: string;
    vi: string;
    en: string;
    ja: string;
    isNew: boolean;
}

export default function AdminTranslationsPanel() {
    return (
        <AdminPage
            title="publicSite.profileHub.adminI18nTitle"
            activeResource="translations"
            permission="USER_MANAGE"
        >
            <TranslationsWorkspace/>
        </AdminPage>
    );
}

function TranslationsWorkspace() {
    const {t} = useI18n();
    const [namespace, setNamespace] = useState('');
    const [keyword, setKeyword] = useState('');
    const [page, setPage] = useState(0);
    const [editor, setEditor] = useState<DraftEditorState | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const namespacesQuery = useAdminI18nNamespaces();
    const listQuery = useAdminTranslations({namespace, keyword, page, size: 20});
    const {upsert, remove} = useAdminI18nMutations();

    const namespaces = namespacesQuery.data ?? [];
    const rows = listQuery.data?.content ?? [];
    const totalElements = listQuery.data?.totalElements ?? 0;
    const totalPages = listQuery.data?.totalPages ?? 0;

    const openEdit = (row: UiTranslationRow) => {
        setErrorMsg(null);
        setEditor({
            translationKey: row.translationKey,
            namespace: row.namespace,
            description: row.description ?? '',
            vi: row.vi ?? '',
            en: row.en ?? '',
            ja: row.ja ?? '',
            isNew: false,
        });
    };

    const openCreate = () => {
        setErrorMsg(null);
        setEditor({
            translationKey: namespace ? `${namespace}.` : 'publicSite.',
            namespace: namespace || 'publicSite',
            description: '',
            vi: '',
            en: '',
            ja: '',
            isNew: true,
        });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editor) return;
        const key = editor.translationKey.trim();
        if (!key || !key.includes('.')) {
            setErrorMsg('Khóa ngôn ngữ cần có định dạng phân cấp (ví dụ: publicSite.hero.title).');
            return;
        }
        setErrorMsg(null);
        try {
            await upsert.mutateAsync({
                translationKey: key,
                namespace: editor.namespace.trim() || key.split('.')[0],
                description: editor.description.trim() || undefined,
                translations: {
                    vi: editor.vi,
                    en: editor.en,
                    ja: editor.ja,
                },
            });
            toast.success('Đã lưu bản dịch đa ngôn ngữ vào PostgreSQL và làm mới API cache.');
            setEditor(null);
        } catch (err) {
            setErrorMsg(err instanceof Error ? err.message : 'Không thể lưu bản dịch.');
        }
    };

    return (
        <div className="space-y-5 pb-12">
            {/* Toolbar (60% bg-card, 30% slate borders/text, 10% primary CTA) */}
            <Card className="border-slate-200 bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-[260px] flex-1 flex-wrap items-center gap-2.5">
                        <label className="relative min-w-[240px] flex-1">
                            <span className="sr-only">{t('common.search')}</span>
                            <Search size={15} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"/>
                            <Input
                                type="search"
                                value={keyword}
                                onChange={e => {
                                    setKeyword(e.target.value);
                                    setPage(0);
                                }}
                                placeholder="Tìm theo khóa (publicSite.hero...) hoặc nội dung VI / EN / JA..."
                                className="h-10 pl-9 text-xs"
                            />
                        </label>
                        <Select
                            aria-label="Phân vùng Namespace"
                            value={namespace}
                            onChange={e => {
                                setNamespace(e.target.value);
                                setPage(0);
                            }}
                            className="h-10 w-auto min-w-[180px] text-xs font-semibold"
                        >
                            <option value="">Tất cả phân vùng ({totalElements})</option>
                            {namespaces.map(ns => (
                                <option key={ns} value={ns}>{ns}</option>
                            ))}
                        </Select>
                    </div>
                    <Button type="button" size="sm" leftIcon={<Plus size={15} aria-hidden="true"/>} onClick={openCreate}>
                        Thêm khóa dịch mới
                    </Button>
                </div>
            </Card>

            {editor && (
                <Card className="border-slate-200 border-t-2 border-t-primary bg-white">
                    <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-slate-200 px-5 py-3.5">
                        <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-900">
                            <Languages size={17} className="text-primary" aria-hidden="true"/>
                            {editor.isNew ? 'Tạo khóa đa ngôn ngữ mới trong Database' : `Chỉnh sửa: ${editor.translationKey}`}
                        </CardTitle>
                        <Button type="button" size="sm" variant="outline" onClick={() => setEditor(null)}>
                            Đóng
                        </Button>
                    </CardHeader>
                    <CardContent className="p-5">
                        <form onSubmit={e => void handleSave(e)} className="space-y-4">
                            {errorMsg && <Alert variant="error">{errorMsg}</Alert>}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <FormField id="i18n-key" label="Khóa ngôn ngữ (Dot-key)" required className="sm:col-span-2">
                                    <Input
                                        id="i18n-key"
                                        value={editor.translationKey}
                                        disabled={!editor.isNew}
                                        onChange={e => setEditor({...editor, translationKey: e.target.value})}
                                        className="h-10 font-mono text-xs"
                                    />
                                </FormField>
                                <FormField id="i18n-ns" label="Phân vùng (Namespace)" optional>
                                    <Input
                                        id="i18n-ns"
                                        value={editor.namespace}
                                        onChange={e => setEditor({...editor, namespace: e.target.value})}
                                        className="h-10 font-mono text-xs"
                                    />
                                </FormField>
                            </div>
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                                <FormField id="i18n-vi" label="Tiếng Việt (vi)" required>
                                    <Textarea
                                        id="i18n-vi"
                                        rows={4}
                                        value={editor.vi}
                                        onChange={e => setEditor({...editor, vi: e.target.value})}
                                        className="text-xs leading-relaxed"
                                    />
                                </FormField>
                                <FormField id="i18n-en" label="English (en)" required>
                                    <Textarea
                                        id="i18n-en"
                                        rows={4}
                                        value={editor.en}
                                        onChange={e => setEditor({...editor, en: e.target.value})}
                                        className="text-xs leading-relaxed"
                                    />
                                </FormField>
                                <FormField id="i18n-ja" label="日本語 (ja)" required>
                                    <Textarea
                                        id="i18n-ja"
                                        rows={4}
                                        value={editor.ja}
                                        onChange={e => setEditor({...editor, ja: e.target.value})}
                                        className="text-xs leading-relaxed"
                                    />
                                </FormField>
                            </div>
                            <div className="flex items-center justify-end gap-2.5 pt-1">
                                <Button type="button" size="sm" variant="outline" onClick={() => setEditor(null)}>
                                    {t('common.cancel')}
                                </Button>
                                <Button type="submit" size="sm" isLoading={upsert.isPending} leftIcon={<Save size={15} aria-hidden="true"/>}>
                                    Lưu vào Database & Cập nhật API
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            <Card className="overflow-hidden border-slate-200 bg-white">
                <QueryState query={listQuery}>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[920px] border-collapse text-left text-xs">
                            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                                <tr>
                                    <th className="w-[240px] px-4 py-3">Khóa & Phân vùng</th>
                                    <th className="px-4 py-3">Tiếng Việt (VI)</th>
                                    <th className="px-4 py-3">English (EN)</th>
                                    <th className="px-4 py-3">日本語 (JA)</th>
                                    <th className="w-[120px] px-4 py-3 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                                            Không tìm thấy khóa ngôn ngữ phù hợp.
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map(row => (
                                        <tr key={row.translationKey} className="align-top transition-colors hover:bg-slate-50/70">
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-1.5">
                                                    <Globe size={13} className="shrink-0 text-primary" aria-hidden="true"/>
                                                    <Badge variant="outline">{row.namespace}</Badge>
                                                </div>
                                                <code className="mt-1.5 block break-all font-mono text-[11px] font-semibold text-slate-900">
                                                    {row.translationKey}
                                                </code>
                                            </td>
                                            <td className="px-4 py-3.5 leading-relaxed text-slate-800">{row.vi || '—'}</td>
                                            <td className="px-4 py-3.5 leading-relaxed text-slate-700">{row.en || '—'}</td>
                                            <td className="px-4 py-3.5 leading-relaxed text-slate-700">{row.ja || '—'}</td>
                                            <td className="px-4 py-3.5 text-right">
                                                <div className="inline-flex items-center gap-1.5">
                                                    <Button type="button" size="sm" variant="outline" onClick={() => openEdit(row)}>
                                                        Sửa
                                                    </Button>
                                                    {row.id != null && (
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="ghost"
                                                            aria-label={`Xóa ${row.translationKey}`}
                                                            onClick={() => void remove.mutateAsync(row.id!)}
                                                        >
                                                            <Trash2 size={14} className="text-danger"/>
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <div className="border-t border-slate-200 p-3">
                            <Pagination page={page} totalPages={totalPages} total={totalElements} onChange={setPage}/>
                        </div>
                    )}
                </QueryState>
            </Card>
        </div>
    );
}
