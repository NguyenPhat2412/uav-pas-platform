/** Display labels only. API values and authorization contracts remain unchanged. */
const labels: Record<string, string> = {
  DRAFT: 'Bản nháp', PENDING_CONFIRMATION: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận',
  RESOURCE_RESERVED: 'Đã bố trí tài nguyên', READY: 'Sẵn sàng', IN_PROGRESS: 'Đang thực hiện',
  COMPLETED: 'Hoàn tất', CANCELLED: 'Đã hủy', REJECTED: 'Đã từ chối', FAILED: 'Không thành công',
  UAV_RENTAL: 'Thuê UAV', AREA_INSPECTION: 'Khảo sát khu vực', AERIAL_RECORDING: 'Quay chụp trên không',
  DATA_COLLECTION: 'Thu thập dữ liệu', OTHER: 'Khác', LOW: 'Thấp', NORMAL: 'Bình thường', HIGH: 'Cao', URGENT: 'Khẩn cấp',
  INPUT: 'Dữ liệu đầu vào', OUTPUT: 'Kết quả', FLIGHT_DATA: 'Dữ liệu chuyến bay', DOCUMENT: 'Tài liệu', IMAGE: 'Hình ảnh', VIDEO: 'Video',
  ROLE_ADMIN: 'Quản trị viên', ROLE_COMMANDER: 'Điều phối viên', ROLE_OPERATOR: 'Người vận hành', ROLE_PILOT: 'Phi công UAV', ROLE_CUSTOMER: 'Khách hàng', ROLE_USER: 'Người dùng',
  ACTIVE: 'Đang hoạt động', INACTIVE: 'Ngừng hoạt động', LOCKED: 'Đã khóa', AVAILABLE: 'Sẵn có', ASSIGNED: 'Đã phân công', IN_USE: 'Đang sử dụng', MAINTENANCE: 'Bảo trì',
  SUSPENDED: 'Đã khóa', UNKNOWN: 'Chưa xác định', ONLINE: 'Trực tuyến', OFFLINE: 'Ngoại tuyến', RESERVED: 'Đã giữ', ERROR: 'Có lỗi', WARNING: 'Cần chú ý', PERMISSION: 'Quyền truy cập', INVENTORY: 'Kho thiết bị', DASHBOARD: 'Tổng quan', AUTH: 'Đăng nhập', AUDIT: 'Nhật ký',
  CREATE: 'Tạo mới', UPDATE: 'Cập nhật', DELETE: 'Xóa', STATUS_CHANGE: 'Đổi trạng thái', ASSIGN: 'Phân công', RESERVE: 'Giữ thiết bị', RELEASE: 'Hoàn trả', UPLOAD: 'Tải lên', DOWNLOAD: 'Tải xuống',
  LOGIN: 'Đăng nhập', LOGOUT: 'Đăng xuất', GRANT: 'Cấp quyền', REVOKE: 'Thu hồi quyền', STOCK_IN: 'Nhập kho', STOCK_OUT: 'Xuất kho', TRANSFER: 'Điều chuyển', OPERATOR: 'Người vận hành',
  MISSION: 'Nhiệm vụ', MISSION_MEDIA: 'Tệp nhiệm vụ', MEDIA: 'Tệp', UAV: 'UAV', EQUIPMENT: 'Thiết bị', STATION: 'Trạm', USER: 'Người dùng', USER_PROFILE: 'Hồ sơ cá nhân',
  OPERATOR_REPLACED: 'Thay người vận hành', OPERATOR_UNASSIGNED: 'Gỡ người vận hành', STATION_REPLACED: 'Đổi trạm', STATION_UNASSIGNED: 'Gỡ trạm', EQUIPMENT_CHANGED: 'Đổi thiết bị hoặc số lượng', EQUIPMENT_RELEASED: 'Hoàn trả thiết bị', UAV_REPLACED: 'Thay UAV', UAV_UNASSIGNED: 'Gỡ UAV khỏi nhiệm vụ',
  OPERATOR_ACCEPTED: 'Đã nhận nhiệm vụ', OPERATOR_CONFLICT: 'Báo vướng mắc',
  MAINTENANCE_SCHEDULE: 'Lịch bảo trì', REPAIR_ORDER: 'Phiếu sửa chữa',
  CREATED: 'Tạo mới', UPDATED: 'Đã cập nhật', PAUSED: 'Tạm dừng', STARTED: 'Đã bắt đầu sửa chữa',
};
export function displayLabel(value?: string | null): string { return value ? labels[value] ?? value : '—'; }
export function auditDetail(value?: string | null): string {
  if (!value) return '—';
  const profile = /^Updated fields: (fullName(?:, phoneNumber)?|phoneNumber)$/.exec(value);
  if (profile) return `Cập nhật hồ sơ: ${profile[1].split(', ').map(field => field === 'fullName' ? 'họ tên' : 'số điện thoại').join(', ')}`;
  const materials = /^MATERIALS_UPDATED lines=([0-9]+) totalVND=([0-9]+)$/.exec(value);
  if (materials) return `Cập nhật ${materials[1]} dòng vật tư · Tổng ${new Intl.NumberFormat('vi-VN').format(BigInt(materials[2]))} ₫`;
  const advanced = /^ADVANCED order=([0-9]+)$/.exec(value);
  if (advanced) return `Cập nhật kỳ bảo trì tiếp theo sau phiếu #${advanced[1]}`;
  const separator = value.indexOf(':');
  const prefix = value.slice(0, separator);
  return separator > 0 && labels[prefix] ? `${labels[prefix]}: ${value.slice(separator + 1)}` : displayLabel(value);
}
export function serviceName(service: { code: string; name: string }): string {
  const defaults = ['Basic UAV Rental', 'Area Inspection', 'Aerial Video Recording', 'Data Collection'];
  return defaults.includes(service.name) ? displayLabel(service.code) : service.name;
}
export function formatDate(value?: string): string {
  if (!value) return 'Chưa cập nhật';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Chưa cập nhật' : new Intl.DateTimeFormat('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }).format(date);
}
export const terminalStatuses = ['COMPLETED', 'CANCELLED', 'REJECTED', 'FAILED'];
export function missionHint(status: string): string {
  return ({ DRAFT: 'Kiểm tra thông tin và gửi yêu cầu để được xác nhận.', PENDING_CONFIRMATION: 'Yêu cầu đang chờ đội điều phối xác nhận.', CONFIRMED: 'Đội điều phối đang bố trí trạm, UAV và người vận hành.', RESOURCE_RESERVED: 'Tài nguyên đã được bố trí. Chuẩn bị cho bước sẵn sàng.', READY: 'Nhiệm vụ đã sẵn sàng để người được phân công bắt đầu.', IN_PROGRESS: 'Nhiệm vụ đang được thực hiện. Kết quả sẽ được cập nhật tại đây.', COMPLETED: 'Nhiệm vụ đã hoàn tất. Bạn có thể xem kết quả và lịch sử bên dưới.', CANCELLED: 'Nhiệm vụ đã hủy. Thông tin được giữ lại để tra cứu.', REJECTED: 'Yêu cầu đã bị từ chối. Xem lý do trong lịch sử.', FAILED: 'Nhiệm vụ chưa hoàn thành. Xem ghi nhận trong lịch sử.' } as Record<string,string>)[status] ?? 'Theo dõi cập nhật của nhiệm vụ tại đây.';
}
export interface TimelineEvent { id: number; eventType: string; newStatus?: string; oldStatus?: string; description?: string; actor?: string; createdAt?: string }
const eventLabels: Record<string,string> = { OPERATOR_REPLACED:'Thay người vận hành', OPERATOR_UNASSIGNED:'Gỡ người vận hành', STATION_REPLACED:'Đổi trạm', STATION_UNASSIGNED:'Gỡ trạm', EQUIPMENT_CHANGED:'Đổi thiết bị hoặc số lượng', EQUIPMENT_RELEASED:'Hoàn trả thiết bị', CREATED:'Tạo yêu cầu', SUBMITTED:'Gửi xác nhận', UPDATED:'Cập nhật yêu cầu', STATION_ASSIGNED:'Bố trí trạm', UAV_ASSIGNED:'Bố trí UAV', UAV_REPLACED:'Thay UAV', UAV_UNASSIGNED:'Gỡ UAV khỏi nhiệm vụ', OPERATOR_ASSIGNED:'Phân công người vận hành', OPERATOR_ACCEPTED:'Người vận hành đã nhận nhiệm vụ', OPERATOR_CONFLICT:'Người vận hành báo vướng mắc', EQUIPMENT_RESERVED:'Giữ thiết bị', MEDIA_ATTACHED:'Bổ sung tệp', CANCELLED:'Hủy nhiệm vụ', REJECTED:'Từ chối yêu cầu', COMPLETED:'Hoàn tất nhiệm vụ', FAILED:'Ghi nhận không thành công' };
export function eventTitle(event: TimelineEvent): string { return event.eventType === 'STATUS_CHANGED' ? displayLabel(event.newStatus) : eventLabels[event.eventType] ?? 'Cập nhật nhiệm vụ'; }
export function eventNote(event: TimelineEvent): string | undefined {
  // Preserve user-authored reasons, while keeping generated backend messages out of the interface.
  return ['REJECTED','FAILED','COMPLETED','OPERATOR_CONFLICT','UAV_REPLACED','UAV_UNASSIGNED','OPERATOR_REPLACED','OPERATOR_UNASSIGNED','STATION_REPLACED','STATION_UNASSIGNED','EQUIPMENT_CHANGED','EQUIPMENT_RELEASED'].includes(event.eventType) ? event.description : undefined;
}
