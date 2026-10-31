import {apiClient, API_ROUTES} from '@/lib/api';
import type {AdminTrainingLesson, TrainingAssetConfirmation, TrainingAssetUploadRequest, TrainingAssetUploadTicket, TrainingCourseDetail, TrainingCourseSummary, TrainingDocument, TrainingLessonDetail, TrainingOverview, TrainingPortalTier, UpdateTrainingLessonProgressPayload, UpdateTrainingProgressPayload, UpsertTrainingDocumentPayload, UpsertTrainingLessonPayload} from '@/types/training/training.types';

export const trainingService = {
    getOverview: (
        params: {portal: TrainingPortalTier; category?: string; search?: string},
        signal?: AbortSignal,
    ) => {
        const query = new URLSearchParams({portal: params.portal});
        if (params.category && params.category !== 'ALL') {
            query.set('category', params.category);
        }
        if (params.search && params.search.trim()) {
            query.set('search', params.search.trim());
        }
        return apiClient.get<TrainingOverview>(`${API_ROUTES.training.list}?${query.toString()}`, {signal});
    },

    getByCode: (codeOrSlug: string, signal?: AbortSignal) =>
        apiClient.get<TrainingDocument>(API_ROUTES.training.byCode(codeOrSlug), {signal}),

    updateProgress: (documentId: number, payload: UpdateTrainingProgressPayload) =>
        apiClient.put<TrainingDocument>(API_ROUTES.training.progress(documentId), payload),

    createDocument: (payload: UpsertTrainingDocumentPayload) =>
        apiClient.post<TrainingDocument>(API_ROUTES.training.list, payload),

    updateDocument: (id: number, payload: UpsertTrainingDocumentPayload) =>
        apiClient.put<TrainingDocument>(API_ROUTES.training.byId(id), payload),

    // Courses (docs/training-courses-api.md)
    listCourses: (portal: TrainingPortalTier, signal?: AbortSignal) =>
        apiClient.get<TrainingCourseSummary[]>(`${API_ROUTES.training.courses}?portal=${portal}`, {signal}),

    getCourse: (codeOrSlug: string, signal?: AbortSignal) =>
        apiClient.get<TrainingCourseDetail>(API_ROUTES.training.course(codeOrSlug), {signal}),

    getLesson: (id: number, signal?: AbortSignal) =>
        apiClient.get<TrainingLessonDetail>(API_ROUTES.training.lesson(id), {signal}),

    updateLessonProgress: (id: number, payload: UpdateTrainingLessonProgressPayload) =>
        apiClient.put<TrainingLessonDetail>(API_ROUTES.training.lessonProgress(id), payload),

    adminListLessons: (courseId: number, signal?: AbortSignal) =>
        apiClient.get<AdminTrainingLesson[]>(API_ROUTES.training.adminCourseLessons(courseId), {signal}),

    adminCreateLesson: (payload: UpsertTrainingLessonPayload) =>
        apiClient.post<AdminTrainingLesson>(API_ROUTES.training.adminLessons, payload),

    adminUpdateLesson: (id: number, payload: UpsertTrainingLessonPayload) =>
        apiClient.put<AdminTrainingLesson>(API_ROUTES.training.adminLesson(id), payload),

    adminDeleteLesson: (id: number) => apiClient.delete<void>(API_ROUTES.training.adminLesson(id)),

    adminSetCover: (courseId: number, assetId: number | null) =>
        apiClient.put<TrainingCourseSummary>(API_ROUTES.training.adminCourseCover(courseId), {assetId}),

    /**
     * Register the file, PUT it straight to storage with the signed URL (progress reported 0–1), then
     * have the backend confirm the object. Resolves with the READY asset. `contentType` overrides an
     * empty `file.type` (common for Office files; the caller infers it from the extension).
     */
    uploadAsset: async (file: File, onProgress?: (fraction: number) => void, signal?: AbortSignal, contentType = file.type) => {
        const request: TrainingAssetUploadRequest = {fileName: file.name, contentType, size: file.size};
        const ticket = await apiClient.post<TrainingAssetUploadTicket>(API_ROUTES.training.adminAssets, request, {signal});
        await putFileWithProgress(ticket, file, onProgress, signal);
        return apiClient.post<TrainingAssetConfirmation>(API_ROUTES.training.adminAssetConfirm(ticket.assetId), undefined, {signal});
    },
};

/**
 * XMLHttpRequest rather than fetch so the upload can report progress. No cookies or app headers go to
 * the storage host: only the headers the signed URL was issued with, every one of them (the signature
 * covers them, e.g. `Content-Type` and `If-None-Match: *`).
 */
function putFileWithProgress(
    ticket: TrainingAssetUploadTicket,
    file: File,
    onProgress?: (fraction: number) => void,
    signal?: AbortSignal,
): Promise<void> {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(new DOMException('Upload aborted', 'AbortError'));
            return;
        }
        const xhr = new XMLHttpRequest();
        xhr.open(ticket.method || 'PUT', ticket.uploadUrl);
        xhr.withCredentials = false;
        for (const [name, value] of Object.entries(ticket.headers ?? {})) xhr.setRequestHeader(name, value);
        xhr.upload.onprogress = event => {
            if (event.lengthComputable) onProgress?.(event.loaded / event.total);
        };
        const abort = () => xhr.abort();
        signal?.addEventListener('abort', abort, {once: true});
        const settle = () => signal?.removeEventListener('abort', abort);
        xhr.onload = () => {
            settle();
            if (xhr.status >= 200 && xhr.status < 300) {
                onProgress?.(1);
                resolve();
            } else {
                reject(new Error(`Kho lưu trữ từ chối tệp (HTTP ${xhr.status}).`));
            }
        };
        xhr.onerror = () => {
            settle();
            reject(new Error('Không tải được tệp lên kho lưu trữ. Kiểm tra kết nối và thử lại.'));
        };
        xhr.onabort = () => {
            settle();
            reject(new DOMException('Upload aborted', 'AbortError'));
        };
        xhr.send(file);
    });
}
