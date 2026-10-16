export type ProfileFields = { fullName: string; phoneNumber: string };
export type CustomerProfile = { id: number; fullName: string | null; phoneNumber: string | null; revision: string };
export type ProfileErrors = Partial<Record<keyof ProfileFields, string>>;
export function validateProfile(fields: ProfileFields): ProfileErrors {
  const errors: ProfileErrors = {};
  if (fields.fullName.trim().length > 100) errors.fullName = 'Họ tên không được vượt quá 100 ký tự.';
  if (!fields.phoneNumber.trim()) errors.phoneNumber = 'Vui lòng nhập số điện thoại.';
  else if (fields.phoneNumber.trim().length > 20) errors.phoneNumber = 'Số điện thoại không được vượt quá 20 ký tự.';
  return errors;
}
export function profilePayload(fields: ProfileFields, revision: string) {
  if (!/^[a-f0-9]{64}$/.test(revision ?? '')) throw new Error('Vui lòng tải lại phiên bản hồ sơ trước khi lưu.');
  return { fullName: fields.fullName.trim() || null, phoneNumber: fields.phoneNumber.trim(), expectedRevision: revision };
}
export function profileError(error: unknown): {kind: 'phone' | 'conflict' | 'uncertain' | 'other'; message: string} {
  const value = error as { status?: number; message?: string } | null;
  if (value?.status === 409 && value.message === 'Phone number already exists in the system') return {kind:'phone',message:'Số điện thoại đã được sử dụng. Vui lòng nhập số khác.'};
  if (value?.status === 409) return {kind:'conflict',message:'Hồ sơ đã thay đổi ở nơi khác. Nội dung bạn đang nhập vẫn được giữ lại. Hãy tải bản mới nhất trước khi sửa tiếp.'};
  if (value?.status === 401) return {kind:'other',message:'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'};
  if (value?.status === 403) return {kind:'other',message:'Tài khoản hiện không thể cập nhật hồ sơ. Vui lòng liên hệ quản trị viên.'};
  if (!value?.status || value.status >= 500) return {kind:'uncertain',message:'Chưa xác nhận được kết quả lưu. Nội dung đang nhập vẫn được giữ lại; hãy kiểm tra bản mới nhất khi kết nối ổn định.'};
  return {kind:'other',message:'Không thể lưu hồ sơ. Vui lòng kiểm tra họ tên và số điện thoại rồi thử lại.'};
}
