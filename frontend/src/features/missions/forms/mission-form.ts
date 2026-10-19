import type { Mission, MissionInput, MissionStatus, MissionType, PageResponse } from "@/types/customer";

export const missionTypes: MissionType[] = ['UAV_RENTAL', 'AREA_INSPECTION', 'AERIAL_RECORDING', 'DATA_COLLECTION', 'OTHER'];
export const missionStatuses: MissionStatus[] = ['DRAFT', 'PENDING_CONFIRMATION', 'CONFIRMED', 'RESOURCE_RESERVED', 'READY', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED', 'FAILED'];
export const missionLimits = { title: 180, locationName: 255, description: 2000, notes: 2000 } as const;
export type MissionFormErrors = Partial<Record<keyof MissionInput, string>>;
export type MissionUpdateInput = Omit<MissionInput, 'missionType' | 'serviceId'>;

export function localDateToday(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validDateTime(value: string): boolean {
  const parts = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,6})?)?$/.exec(value);
  return !!parts && validDate(parts[1]) && Number(parts[2]) < 24 && Number(parts[3]) < 60 && Number(parts[4] ?? 0) < 60;
}

function comparableDateTime(value: string): string {
  const [time, fraction = ''] = value.split('.');
  return `${time.length === 16 ? `${time}:00` : time}.${fraction.padEnd(6, '0')}`;
}

export function validateMissionForm(form: MissionInput, today = localDateToday()): MissionFormErrors {
  const errors: MissionFormErrors = {};
  if (!form.title.trim()) errors.title = 'Nhập tiêu đề yêu cầu.';
  else if (form.title.trim().length > missionLimits.title) errors.title = 'Tiêu đề không được vượt quá 180 ký tự.';
  if (!form.locationName.trim()) errors.locationName = 'Nhập địa điểm thực hiện.';
  else if (form.locationName.trim().length > missionLimits.locationName) errors.locationName = 'Địa điểm không được vượt quá 255 ký tự.';
  if ((form.description?.length ?? 0) > missionLimits.description) errors.description = 'Mô tả không được vượt quá 2.000 ký tự.';
  if ((form.notes?.length ?? 0) > missionLimits.notes) errors.notes = 'Ghi chú không được vượt quá 2.000 ký tự.';
  if (!validDate(form.requestedDate)) errors.requestedDate = 'Chọn ngày yêu cầu hợp lệ.';
  else if (form.requestedDate < today) errors.requestedDate = 'Ngày yêu cầu phải từ hôm nay trở đi.';
  if (!validDateTime(form.startTime)) errors.startTime = 'Chọn ngày và giờ bắt đầu hợp lệ.';
  if (!validDateTime(form.expectedEndTime)) errors.expectedEndTime = 'Chọn ngày và giờ kết thúc hợp lệ.';
  else if (!errors.startTime && comparableDateTime(form.expectedEndTime) <= comparableDateTime(form.startTime)) errors.expectedEndTime = 'Thời gian kết thúc phải sau thời gian bắt đầu.';
  if (!missionTypes.includes(form.missionType)) errors.missionType = 'Chọn loại nhiệm vụ hợp lệ.';
  if (form.priority && !['LOW', 'NORMAL', 'HIGH', 'URGENT'].includes(form.priority)) errors.priority = 'Chọn mức ưu tiên hợp lệ.';
  for (const [key, maximum] of [['latitude', 90], ['longitude', 180]] as const) {
    const value = form[key];
    if (value != null && (!Number.isFinite(value) || Math.abs(value) > maximum)) errors[key] = `Nhập giá trị từ -${maximum} đến ${maximum}.`;
  }
  return errors;
}

// Service codes are a separate catalogue; only known enum values may suggest a type.
export function missionTypeForService(code: string | undefined, current: MissionType): MissionType {
  return missionTypes.find(type => type === code) ?? current;
}

export function missionUpdatePayload(form: MissionInput): MissionUpdateInput {
  return {
    title: form.title.trim(), description: form.description ?? '', requestedDate: form.requestedDate,
    startTime: form.startTime, expectedEndTime: form.expectedEndTime, locationName: form.locationName.trim(),
    latitude: form.latitude, longitude: form.longitude, priority: form.priority ?? 'NORMAL', notes: form.notes ?? '',
  };
}

export function missionDraftUpdatePayload(form: MissionInput, expectedVersion: number): MissionUpdateInput & { expectedVersion: number } {
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) {
    throw new Error('Thiếu phiên bản bản nháp hợp lệ. Hãy tải bản mới nhất trước khi lưu.');
  }
  return { ...missionUpdatePayload(form), expectedVersion };
}

export function missionFormFromDetail(mission: Mission): MissionInput {
  return { ...missionUpdatePayload(mission), missionType: mission.missionType, serviceId: mission.serviceId };
}

export function canEditMission(mission: Mission, userId: number | undefined, canUpdate: boolean): boolean {
  return userId != null && mission.customerId === userId && mission.status === 'DRAFT' && canUpdate;
}

export function missionPageRange(page: Pick<PageResponse<unknown>, 'page' | 'size' | 'content' | 'totalElements'>) {
  return { first: page.content.length ? page.page * page.size + 1 : 0, last: page.content.length ? Math.min(page.page * page.size + page.content.length, page.totalElements) : 0, total: page.totalElements };
}

export function missionListFilters(search: string, status: MissionStatus | '') {
  return { search, status, page: 0 };
}

export function missionFormError(error: unknown): string {
  const status = error && typeof error === 'object' && 'status' in error ? error.status : undefined;
  if (status === 400) return 'Thông tin chưa hợp lệ. Kiểm tra các trường và ngày yêu cầu rồi thử lại.';
  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  if (status === 403) return 'Bạn không có quyền lưu yêu cầu này hoặc quyền của bạn đã thay đổi.';
  if (status === 404) return 'Không tìm thấy yêu cầu hoặc dịch vụ đã chọn. Vui lòng tải lại thông tin.';
  if (status === 409) return 'Thông tin hoặc trạng thái yêu cầu đã thay đổi. Hãy tải và kiểm tra bản mới nhất trước khi lưu lại.';
  return 'Chưa xác nhận được kết quả lưu. Hãy kiểm tra danh sách nhiệm vụ trước khi thử lại để tránh tạo trùng.';
}
