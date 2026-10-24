export type ProfileFields = { fullName: string; phoneNumber: string };
export type CustomerProfile = { id: number; fullName: string | null; phoneNumber: string | null; revision: string };
export type ProfileErrors = Partial<Record<keyof ProfileFields, string>>;
export type Translate = (key: string, params?: Record<string, string | number>) => string;

// Without a translator the Vietnamese default is returned, which keeps these helpers usable outside React.
function message(t: Translate | undefined, key: string, fallback: string): string {
    return t ? t(`profile.errors.${key}`) : fallback;
}

export function validateProfile(fields: ProfileFields, t?: Translate): ProfileErrors {
    const errors: ProfileErrors = {};
    if (fields.fullName.trim().length > 100) errors.fullName = message(t, 'nameTooLong', 'Họ tên không được vượt quá 100 ký tự.');
    if (!fields.phoneNumber.trim()) errors.phoneNumber = message(t, 'phoneRequired', 'Vui lòng nhập số điện thoại.');
    else if (fields.phoneNumber.trim().length > 20) errors.phoneNumber = message(t, 'phoneTooLong', 'Số điện thoại không được vượt quá 20 ký tự.');
    return errors;
}

export function profilePayload(fields: ProfileFields, revision: string) {
    if (!/^[a-f0-9]{64}$/.test(revision ?? '')) throw new Error('Vui lòng tải lại phiên bản hồ sơ trước khi lưu.');
    return {
        fullName: fields.fullName.trim() || null,
        phoneNumber: fields.phoneNumber.trim(),
        expectedRevision: revision
    };
}

export function profileError(error: unknown, t?: Translate): { kind: 'phone' | 'conflict' | 'uncertain' | 'other'; message: string } {
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
