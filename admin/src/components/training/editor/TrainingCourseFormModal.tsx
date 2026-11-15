'use client';

import {useRef} from 'react';
import {X} from 'lucide-react';
import {Button, FormField, Input, Select, Textarea} from '@/components/ui';
import {ErrorNotice} from '@/components/data/WorkspaceState';
import {useDialogFocusTrap} from '@/hooks/useDialogFocusTrap';
import {
    canSubmitTrainingDocument,
    toUpsertTrainingDocumentPayload,
} from '@/forms/training/training-form';
import type {
    TrainingDocument,
    TrainingPortalTier,
    UpsertTrainingDocumentPayload,
} from '@/types/training/training.types';

export interface TrainingCourseFormModalProps {
    editingDoc: TrainingDocument | null;
    formState: UpsertTrainingDocumentPayload;
    onChangeForm: (next: UpsertTrainingDocumentPayload) => void;
    fieldErrors?: Partial<Record<string, string>> | null;
    error: Error | null;
    isSaving: boolean;
    onClose: () => void;
    onSubmit: (payload: UpsertTrainingDocumentPayload) => void;
}

export function TrainingCourseFormModal({
    editingDoc,
    formState,
    onChangeForm,
    fieldErrors,
    error,
    isSaving,
    onClose,
    onSubmit,
}: TrainingCourseFormModalProps) {
    const dialogRef = useRef<HTMLDivElement>(null);
    useDialogFocusTrap(dialogRef, true, isSaving ? undefined : onClose);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs" role="presentation">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="training-doc-modal-title"
                className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-overlay border border-border bg-card shadow-2xl"
            >
                <div className="flex items-center justify-between border-b border-border bg-surface-variant px-5 py-3.5">
                    <div>
                        <h3 id="training-doc-modal-title" className="text-sm font-bold text-foreground">
                            {editingDoc ? `Sửa tài liệu ${editingDoc.code}` : 'Thêm tài liệu đào tạo'}
                        </h3>
                        <p className="text-[11px] text-muted-foreground">
                            Tài liệu hiện ngay ở cổng đã chọn sau khi lưu.
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isSaving}
                        onClick={onClose}
                        aria-label="Đóng"
                        className="h-8 w-8 px-0"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto p-5 text-xs">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <FormField label="Mã tài liệu (Code)" required error={fieldErrors?.code}>
                            <Input
                                type="text"
                                aria-required
                                aria-invalid={Boolean(fieldErrors?.code)}
                                value={formState.code}
                                onChange={e => onChangeForm({...formState, code: e.target.value})}
                                className="font-mono text-xs"
                            />
                        </FormField>

                        <FormField label="Phân cấp cổng (Portal)" required>
                            <Select
                                value={formState.targetPortal}
                                onChange={e =>
                                    onChangeForm({
                                        ...formState,
                                        targetPortal: e.target.value as TrainingPortalTier,
                                    })
                                }
                                className="text-xs"
                            >
                                <option value="CUSTOMER">CUSTOMER (Khách hàng)</option>
                                <option value="OPERATIONS">OPERATIONS (Điều hành)</option>
                                <option value="ADMIN">ADMIN (Quản trị)</option>
                            </Select>
                        </FormField>

                        <FormField label="Cấp độ SOP" required>
                            <Select
                                value={formState.level}
                                onChange={e => onChangeForm({...formState, level: e.target.value})}
                                className="text-xs"
                            >
                                <option value="FOUNDATION">FOUNDATION (Cơ bản)</option>
                                <option value="STANDARD">STANDARD (Tiêu chuẩn)</option>
                                <option value="ADVANCED">ADVANCED (Chuyên sâu)</option>
                                <option value="SOP_CRITICAL">SOP_CRITICAL (SOP Trọng yếu)</option>
                            </Select>
                        </FormField>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                        <FormField label="Mã chuyên đề (Category)" required className="sm:col-span-2">
                            <Input
                                type="text"
                                aria-required
                                value={formState.category}
                                onChange={e => onChangeForm({...formState, category: e.target.value})}
                                className="font-mono text-xs"
                            />
                        </FormField>

                        <FormField label="Phiên bản (Version)">
                            <Input
                                type="text"
                                value={formState.versionTag}
                                onChange={e => onChangeForm({...formState, versionTag: e.target.value})}
                                className="font-mono text-xs"
                            />
                        </FormField>

                        <FormField label="Thời lượng (Phút)" required error={fieldErrors?.estimatedMinutes}>
                            <Input
                                type="number"
                                aria-required
                                aria-invalid={Boolean(fieldErrors?.estimatedMinutes)}
                                value={formState.estimatedMinutes}
                                onChange={e =>
                                    onChangeForm({
                                        ...formState,
                                        estimatedMinutes: Number(e.target.value),
                                    })
                                }
                                className="font-mono text-xs"
                            />
                        </FormField>
                    </div>

                    <FormField label="Tiêu đề học phần / Tài liệu SOP" required error={fieldErrors?.title}>
                        <Input
                            type="text"
                            aria-required
                            aria-invalid={Boolean(fieldErrors?.title)}
                            value={formState.title}
                            onChange={e => onChangeForm({...formState, title: e.target.value})}
                            className="text-xs"
                        />
                    </FormField>

                    <FormField label="Tóm tắt mục tiêu đào tạo" required error={fieldErrors?.summary}>
                        <Textarea
                            rows={2}
                            aria-required
                            aria-invalid={Boolean(fieldErrors?.summary)}
                            value={formState.summary}
                            onChange={e => onChangeForm({...formState, summary: e.target.value})}
                            className="text-xs"
                        />
                    </FormField>

                    <FormField
                        label="Nội dung chi tiết (Hỗ trợ Markdown: ### Tiêu đề, - Danh sách, | Bảng |)"
                        required
                        error={fieldErrors?.contentMarkdown}
                    >
                        <Textarea
                            rows={8}
                            aria-required
                            aria-invalid={Boolean(fieldErrors?.contentMarkdown)}
                            value={formState.contentMarkdown}
                            onChange={e => onChangeForm({...formState, contentMarkdown: e.target.value})}
                            className="font-mono text-xs"
                        />
                    </FormField>

                    <FormField label="Các bước Checklist thực hành (Mỗi dòng 1 bước kiểm tra)">
                        <Textarea
                            rows={4}
                            value={formState.checklistSteps.join('\n')}
                            onChange={e =>
                                onChangeForm({
                                    ...formState,
                                    checklistSteps: e.target.value
                                        .split('\n')
                                        .map(s => s.trim())
                                        .filter(Boolean),
                                })
                            }
                            className="text-xs"
                        />
                    </FormField>

                    <label className="inline-flex cursor-pointer items-center gap-2">
                        <input
                            type="checkbox"
                            checked={formState.isMandatory}
                            onChange={e => onChangeForm({...formState, isMandatory: e.target.checked})}
                            className="h-4 w-4 accent-primary"
                        />
                        <span className="font-medium text-foreground">
                            Đánh dấu là tài liệu SOP bắt buộc (Mandatory SOP)
                        </span>
                    </label>

                    {error && <ErrorNotice error={error} />}
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-border bg-surface-variant px-5 py-3">
                    <Button type="button" variant="secondary" size="sm" disabled={isSaving} onClick={onClose}>
                        Hủy bỏ
                    </Button>
                    <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        isLoading={isSaving}
                        disabled={isSaving || !canSubmitTrainingDocument(formState)}
                        onClick={() => onSubmit(toUpsertTrainingDocumentPayload(formState))}
                    >
                        {isSaving ? 'Đang lưu...' : editingDoc ? 'Cập nhật SOP' : 'Tạo tài liệu SOP'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
