import type {CustomerProfile, ProfileErrors, ProfileFields} from '@/types/profile/profile.types';
import type {Translate} from '@/types';
import {translateMessage} from '@/lib/format';

export type {CustomerProfile, ProfileErrors, ProfileFields, Translate};

// Without a translator the Vietnamese default is returned, which keeps these helpers usable outside React.
const message = (t: Translate | undefined, key: string, fallback: string) =>
    translateMessage(t, `profile.errors.${key}`, fallback);

export function profilePayload(fields: ProfileFields, revision: string) {
    if (!/^[a-f0-9]{64}$/.test(revision ?? '')) throw new Error('Vui lòng tải lại phiên bản hồ sơ trước khi lưu.');
    return {
        fullName: fields.fullName.trim() || null,
        phoneNumber: fields.phoneNumber.trim(),
        expectedRevision: revision
    };
}

export function profileError(error: unknown, t?: Translate): { kind: 'fields' | 'phone' | 'conflict' | 'uncertain' | 'other'; message: string; fields?: ProfileErrors } {
    // The backend checks every rule and names the field; show its message next to that input.
    // Read structurally (not instanceof ApiError) so this module stays import-free for its tests.
    const fieldMap = (error as { fields?: Record<string, string> } | null)?.fields;
    if (fieldMap && Object.keys(fieldMap).length) {
        return {kind: 'fields', message: Object.values(fieldMap)[0], fields: fieldMap as ProfileErrors};
    }
    const value = error as { status?: number; message?: string; code?: string } | null;
    if (value?.status === 409 && (value.code === 'PHONE_EXISTS' || value.message === 'Phone number already exists in the system')) return {
        kind: 'phone',
        message: message(t, 'phoneTaken', 'Số điện thoại đã được sử dụng. Vui lòng nhập số khác.')
    };
    if (value?.status === 409) return {
        kind: 'conflict',
        message: message(t, 'conflict', 'Hồ sơ đã thay đổi ở nơi khác. Nội dung bạn đang nhập vẫn được giữ lại. Hãy tải bản mới nhất trước khi sửa tiếp.')
    };
    if (value?.status === 401) return {kind: 'other', message: message(t, 'session', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')};
    if (value?.status === 403) return {
        kind: 'other',
        message: message(t, 'forbidden', 'Tài khoản hiện không thể cập nhật hồ sơ. Vui lòng liên hệ quản trị viên.')
    };
    if (!value?.status || value.status >= 500) return {
        kind: 'uncertain',
        message: message(t, 'uncertain', 'Chưa xác nhận được kết quả lưu. Nội dung đang nhập vẫn được giữ lại; hãy kiểm tra bản mới nhất khi kết nối ổn định.')
    };
    return {kind: 'other', message: message(t, 'other', 'Không thể lưu hồ sơ. Vui lòng kiểm tra họ tên và số điện thoại rồi thử lại.')};
}
