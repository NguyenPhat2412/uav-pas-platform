import type {Translate} from '@/types';

/**
 * Dịch khóa đa ngôn ngữ với giá trị mặc định (fallback) tiếng Việt khi chạy ngoài React
 * (ví dụ trong các hàm kiểm tra hợp lệ form hoặc unit test).
 */
export function translateMessage(
    t: Translate | undefined,
    key: string,
    fallback: string,
    params?: Record<string, string | number>,
): string {
    return t ? t(key, params) : fallback;
}

/**
 * Tạo chuỗi query URL từ object tham số, tự động loại bỏ các trường `undefined`, `null` hoặc chuỗi rỗng `''`.
 */
export function buildQueryString(
    params: Record<string, string | number | boolean | undefined | null>,
): string {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') {
            search.set(key, String(value));
        }
    }
    return search.toString();
}

/**
 * Định dạng số đo Telemetry / phần cứng (làm tròn theo số chữ số thập phân, trả về '—' nếu null/undefined).
 */
export function formatTelemetryNumber(
    value: number | null | undefined,
    formatNumber: (n: number) => string,
    digits = 1,
): string {
    if (value == null || !Number.isFinite(value)) return '—';
    const factor = 10 ** digits;
    return formatNumber(Math.round(value * factor) / factor);
}

/**
 * Định dạng ngày ngắn gọn có giá trị dự phòng `'—'` khi rỗng hoặc không hợp lệ.
 */
export function formatShortDate(
    value: string | null | undefined,
    formatDate: (v: string, opts?: Intl.DateTimeFormatOptions) => string,
): string {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '—';
    return formatDate(value, {dateStyle: 'short'});
}

/**
 * Định dạng dung lượng tệp tin (B / KB / MB / GB) dùng chung cho danh sách Media.
 */
export function formatFileSize(
    bytes: number,
    formatNumber: (n: number, opts?: Intl.NumberFormatOptions) => string,
): string {
    if (bytes >= 1e9) return `${formatNumber(bytes / 1e9, {maximumFractionDigits: 2})} GB`;
    if (bytes >= 1e6) return `${formatNumber(bytes / 1e6, {maximumFractionDigits: 1})} MB`;
    if (bytes >= 1e3) return `${formatNumber(Math.round(bytes / 1e3))} KB`;
    return `${formatNumber(bytes)} B`;
}
