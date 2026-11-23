'use client';

import {useState} from 'react';
import {
    AlertCircle,
    CheckCircle2,
    CircleDashed,
    Clock,
    ExternalLink,
    FileText,
    MessageSquareWarning,
    Plus,
    Trash2,
    Upload,
} from 'lucide-react';
import {Button} from '@/components/customer/CustomerUi';
import {OptionalMark, RequiredMark} from '@/components/ui';
import {
    computeCustomerRequiredDocStats,
    CUSTOMER_PROVIDER_DOC_RULES,
} from '@/components/marketplace/provider/ProviderKycReadinessCard';
import {
    DOCUMENT_TYPE_OPTIONS,
    extractActionableError,
} from '@/forms/marketplace/marketplace-forms';
import type {
    ProviderDocument,
    ProviderDocumentInput,
    ProviderDocumentType,
    ProviderProfile,
    ProviderType,
} from '@/types/marketplace/marketplace.types';

const INPUT_CLASS =
    'h-10 w-full rounded-control border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 outline-none focus:border-primary';

export function ProviderDocumentsSection({
    profile,
    providerType,
    isAdding,
    onAddDocument,
    onDeleteDocument,
    onError,
}: {
    profile: ProviderProfile | null;
    providerType: ProviderType;
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

    const documents = profile?.documents ?? [];
    const docsByType = new Map<ProviderDocumentType, ProviderDocument[]>();
    for (const doc of documents) {
        const list = docsByType.get(doc.documentType) ?? [];
        list.push(doc);
        docsByType.set(doc.documentType, list);
    }

    const reqStats = computeCustomerRequiredDocStats(providerType, documents);
    const visibleRules = CUSTOMER_PROVIDER_DOC_RULES.filter(rule => {
        const level = providerType === 'COMPANY' ? rule.company : rule.individual;
        return level !== 'NOT_APPLICABLE' || (docsByType.get(rule.code)?.length ?? 0) > 0;
    });

    const labelForType = (code: ProviderDocumentType) =>
        DOCUMENT_TYPE_OPTIONS.find(d => d.value === code)?.label ?? code;

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
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <h2 className="m-0 text-base font-extrabold text-slate-900">
                        3. Bộ Hồ sơ Pháp lý, Phép bay & Phụ lục Đối soát
                    </h2>
                    <p className="m-0 mt-0.5 text-xs text-slate-500">
                        Danh mục giấy tờ tự động điều chỉnh theo loại hình{' '}
                        <strong className="text-slate-700">
                            {providerType === 'COMPANY' ? 'Doanh nghiệp / Pháp nhân' : 'Phi công / Chuyên gia cá nhân'}
                        </strong>
                        . Nhấn chọn một mục còn thiếu để điền nhanh biểu mẫu tải lên.
                    </p>
                </div>
                <span
                    className={`rounded-full px-3 py-1 text-xs font-bold tabular-nums ${
                        reqStats.uploaded >= reqStats.total
                            ? 'bg-slate-900 text-white'
                            : 'bg-amber-50 text-amber-800'
                    }`}
                >
                    Đã nộp {reqStats.uploaded}/{reqStats.total} mục bắt buộc
                </span>
            </div>

            {/* Mandatory Document Checklist */}
            <div className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 sm:grid-cols-2">
                {visibleRules.map(rule => {
                    const level = providerType === 'COMPANY' ? rule.company : rule.individual;
                    const isRequired = level === 'REQUIRED';
                    const matched = docsByType.get(rule.code) ?? [];
                    const latest = matched[0];
                    const hasApproved = matched.some(d => d.status === 'APPROVED');
                    const hasRejected = matched.some(d => d.status === 'REJECTED');
                    const rejectedNote = matched.find(d => d.status === 'REJECTED' && d.reviewerNote)?.reviewerNote;

                    const statusBadge = hasApproved ? (
                        <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-bold text-white">
                            Hợp lệ
                        </span>
                    ) : hasRejected ? (
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-danger">
                            Cần bổ sung
                        </span>
                    ) : latest ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                            Chờ thẩm định
                        </span>
                    ) : (
                        <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                            Chưa nộp
                        </span>
                    );

                    return (
                        <div
                            key={rule.code}
                            className={`flex flex-col justify-between gap-2 rounded-xl border bg-white p-3 text-xs ${
                                hasRejected
                                    ? 'border-rose-300'
                                    : !latest && isRequired
                                      ? 'border-amber-200'
                                      : 'border-slate-200'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex min-w-0 items-start gap-2">
                                    {hasApproved ? (
                                        <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-slate-900" aria-hidden="true"/>
                                    ) : hasRejected ? (
                                        <AlertCircle size={15} className="mt-0.5 shrink-0 text-danger" aria-hidden="true"/>
                                    ) : latest ? (
                                        <Clock size={15} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true"/>
                                    ) : (
                                        <CircleDashed
                                            size={15}
                                            className={`mt-0.5 shrink-0 ${isRequired ? 'text-amber-600' : 'text-slate-400'}`}
                                            aria-hidden="true"
                                        />
                                    )}
                                    <div className="min-w-0">
                                        <div className="font-bold text-slate-900 leading-snug">
                                            {labelForType(rule.code)}
                                        </div>
                                        <span
                                            className={`mt-0.5 inline-block text-[10px] font-bold ${
                                                isRequired ? 'text-rose-700' : 'text-slate-500'
                                            }`}
                                        >
                                            {isRequired ? 'Bắt buộc' : 'Theo vùng bay / nhiệm vụ'}
                                        </span>
                                    </div>
                                </div>
                                <div className="shrink-0">{statusBadge}</div>
                            </div>

                            {rejectedNote && (
                                <p className="m-0 flex items-start gap-1 rounded-lg bg-rose-50 px-2 py-1 text-[11px] text-danger">
                                    <MessageSquareWarning size={12} className="mt-0.5 shrink-0" aria-hidden="true"/>
                                    <span>Phản hồi thẩm định: {rejectedNote}</span>
                                </p>
                            )}

                            {profile && (!latest || hasRejected) && (
                                <button
                                    type="button"
                                    onClick={() => setDocForm(s => ({...s, documentType: rule.code}))}
                                    className="inline-flex w-fit items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-800 transition-colors hover:border-primary hover:text-primary"
                                >
                                    <Upload size={11} aria-hidden="true"/>
                                    Chọn tải lên
                                </button>
                            )}
                        </div>
                    );
                })}
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
                        const isApproved = doc.status === 'APPROVED';
                        const statusLabel =
                            doc.status === 'APPROVED'
                                ? 'Hợp lệ'
                                : doc.status === 'REJECTED'
                                  ? 'Cần bổ sung'
                                  : 'Chờ thẩm định';
                        const statusClass =
                            doc.status === 'APPROVED'
                                ? 'bg-slate-900 text-white'
                                : doc.status === 'REJECTED'
                                  ? 'bg-rose-100 text-danger'
                                  : 'bg-amber-100 text-amber-800';
                        return (
                            <li key={doc.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs">
                                <div className="flex items-center gap-2.5">
                                    <FileText size={16} className="shrink-0 text-primary" aria-hidden="true"/>
                                    <div>
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
                                                ({labelForType(doc.documentType)}
                                                {doc.documentNumber ? ` · Số: ${doc.documentNumber}` : ''})
                                            </span>
                                        </div>
                                        {doc.reviewerNote && (
                                            <p className="m-0 mt-0.5 text-rose-700">Ghi chú thẩm định: {doc.reviewerNote}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap ${statusClass}`}>
                                        {statusLabel}
                                    </span>
                                    <button
                                        type="button"
                                        disabled={isApproved}
                                        title={isApproved ? 'Giấy tờ đã được phê duyệt, không thể xoá' : undefined}
                                        onClick={() => onDeleteDocument(doc.id)}
                                        className="rounded-control p-1.5 text-slate-400 hover:bg-rose-50 hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
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
