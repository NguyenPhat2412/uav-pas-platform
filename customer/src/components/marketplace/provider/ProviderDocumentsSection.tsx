'use client';

import {useState} from 'react';
import {ExternalLink, FileText, Plus, Trash2} from 'lucide-react';
import {Button} from '@/components/customer/CustomerUi';
import {OptionalMark, RequiredMark} from '@/components/ui';
import {
    DOCUMENT_TYPE_OPTIONS,
    extractActionableError,
} from '@/forms/marketplace/marketplace-forms';
import type {
    ProviderDocumentInput,
    ProviderDocumentType,
    ProviderProfile,
} from '@/types/marketplace/marketplace.types';

const INPUT_CLASS =
    'h-10 w-full rounded-control border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 outline-none focus:border-primary';

export function ProviderDocumentsSection({
    profile,
    isAdding,
    onAddDocument,
    onDeleteDocument,
    onError,
}: {
    profile: ProviderProfile | null;
    isAdding: boolean;
    onAddDocument: (input: ProviderDocumentInput) => Promise<unknown>;
    onDeleteDocument: (id: number) => void;
    onError: (msg: string) => void;
}) {
    const [docForm, setDocForm] = useState<ProviderDocumentInput>({
        documentType: 'PILOT_CERTIFICATE',
        title: '',
        documentNumber: '',
        fileUrl: '',
    });

    const submitDoc = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!docForm.title.trim()) return;
        const trimmedUrl = docForm.fileUrl?.trim() || undefined;
        if (trimmedUrl && !/^https?:\/\//i.test(trimmedUrl)) {
            onError('Đường dẫn tệp chứng chỉ (nếu nhập) phải bắt đầu bằng http:// hoặc https://.');
            return;
        }
        onError('');
        try {
            await onAddDocument({
                ...docForm,
                title: docForm.title.trim(),
                documentNumber: docForm.documentNumber?.trim() || undefined,
                fileUrl: trimmedUrl,
            });
            setDocForm({documentType: 'PILOT_CERTIFICATE', title: '', documentNumber: '', fileUrl: ''});
        } catch (err) {
            onError(extractActionableError(err, 'Không thể đính kèm hồ sơ. Hãy lưu thông tin đối tác trước.'));
        }
    };

    return (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div>
                <h2 className="m-0 text-base font-extrabold text-slate-900">3. Hồ sơ Pháp lý & Chứng chỉ bay đính kèm</h2>
                <p className="m-0 mt-0.5 text-xs text-slate-500">
                    Khai báo giấy phép kinh doanh, chứng chỉ điều khiển UAV hoặc bảo hiểm trách nhiệm để tăng độ tin cậy với khách hàng.
                </p>
            </div>

            {profile && (
                <form onSubmit={submitDoc} className="grid grid-cols-1 items-end gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-5">
                    <label className="grid gap-1 text-xs font-bold text-slate-700">
                        <span>Loại tài liệu<RequiredMark/></span>
                        <select
                            aria-label="Loại tài liệu pháp lý"
                            className={INPUT_CLASS}
                            value={docForm.documentType}
                            onChange={e => setDocForm(s => ({...s, documentType: e.target.value as ProviderDocumentType}))}
                        >
                            {DOCUMENT_TYPE_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </label>
                    <label className="grid gap-1 text-xs font-bold text-slate-700">
                        <span>Tên chứng chỉ / giấy phép<RequiredMark/></span>
                        <input
                            required
                            aria-label="Tên chứng chỉ hoặc giấy phép"
                            className={INPUT_CLASS}
                            value={docForm.title}
                            onChange={e => setDocForm(s => ({...s, title: e.target.value}))}
                            placeholder="VD: Bằng lái UAV hạng A"
                        />
                    </label>
                    <label className="grid gap-1 text-xs font-bold text-slate-700">
                        <span>Số hiệu hồ sơ<OptionalMark/></span>
                        <input
                            aria-label="Số hiệu hồ sơ"
                            className={INPUT_CLASS}
                            value={docForm.documentNumber ?? ''}
                            onChange={e => setDocForm(s => ({...s, documentNumber: e.target.value}))}
                            placeholder="Số hiệu hồ sơ"
                        />
                    </label>
                    <label className="grid gap-1 text-xs font-bold text-slate-700">
                        <span>Liên kết minh chứng<OptionalMark/></span>
                        <input
                            type="url"
                            aria-label="Liên kết tài liệu minh chứng"
                            className={INPUT_CLASS}
                            value={docForm.fileUrl ?? ''}
                            onChange={e => setDocForm(s => ({...s, fileUrl: e.target.value}))}
                            placeholder="https://..."
                        />
                    </label>
                    <Button type="submit" disabled={isAdding}>
                        <Plus size={14} className="mr-1 inline" aria-hidden="true"/>
                        Thêm hồ sơ
                    </Button>
                </form>
            )}

            {!profile ? (
                <p className="m-0 text-xs text-slate-500">Hãy lưu thông tin đối tác ở mục 1 trước khi đính kèm chứng chỉ.</p>
            ) : profile.documents.length === 0 ? (
                <p className="m-0 text-xs text-slate-500">Chưa có tài liệu đính kèm nào.</p>
            ) : (
                <ul className="m-0 list-none divide-y divide-slate-100 p-0">
                    {profile.documents.map(doc => {
                        const safeHref = doc.fileUrl && /^https?:\/\//i.test(doc.fileUrl) ? doc.fileUrl : null;
                        return (
                            <li key={doc.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs">
                                <div className="flex items-center gap-2.5">
                                    <FileText size={16} className="text-primary" aria-hidden="true"/>
                                    <div>
                                        {safeHref ? (
                                            <a
                                                href={safeHref}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 font-bold text-slate-900 hover:text-primary"
                                            >
                                                {doc.title}
                                                <ExternalLink size={11} aria-hidden="true"/>
                                            </a>
                                        ) : (
                                            <strong className="font-bold text-slate-900">{doc.title}</strong>
                                        )}
                                        <span className="ml-2 text-slate-500">
                                            ({DOCUMENT_TYPE_OPTIONS.find(d => d.value === doc.documentType)?.label ?? doc.documentType}
                                            {doc.documentNumber ? ` · Số: ${doc.documentNumber}` : ''})
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                                        {doc.status}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => onDeleteDocument(doc.id)}
                                        className="rounded-control p-1.5 text-slate-400 hover:bg-rose-50 hover:text-danger"
                                        aria-label="Xoá tài liệu"
                                    >
                                        <Trash2 size={14} aria-hidden="true"/>
                                    </button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}
