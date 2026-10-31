/** Display labels only. API values and authorization contracts remain unchanged. */
import type {PresentationLocale, TimelineEvent} from '@/types';

export type {PresentationLocale, TimelineEvent};

// Set by I18nProvider so these plain helpers follow the portal language without a hook at every call site.
let activeLocale: PresentationLocale = 'vi';

export function setPresentationLocale(locale: PresentationLocale) {
    activeLocale = locale;
}

export function getPresentationLocale(): PresentationLocale {
    return activeLocale;
}

const intlLocales: Record<PresentationLocale, string> = {vi: 'vi-VN', en: 'en-US', ja: 'ja-JP'};

const labelTranslations: Record<'en' | 'ja', Record<string, string>> = {
    en: {
        DRAFT: 'Draft', PENDING_CONFIRMATION: 'Awaiting confirmation', CONFIRMED: 'Confirmed',
        RESOURCE_RESERVED: 'Resources reserved', READY: 'Ready', IN_PROGRESS: 'In progress', COMPLETED: 'Completed',
        CANCELLED: 'Cancelled', REJECTED: 'Rejected', FAILED: 'Unsuccessful',
        UAV_RENTAL: 'UAV rental', AREA_INSPECTION: 'Area inspection', AERIAL_RECORDING: 'Aerial recording',
        DATA_COLLECTION: 'Data collection', OTHER: 'Other',
        LOW: 'Low', NORMAL: 'Normal', HIGH: 'High', URGENT: 'Urgent',
        INPUT: 'Input data', OUTPUT: 'Result', FLIGHT_DATA: 'Flight data', DOCUMENT: 'Document', IMAGE: 'Image', VIDEO: 'Video',
        ROLE_ADMIN: 'Administrator', ROLE_COMMANDER: 'Commander', ROLE_OPERATOR: 'Operator', ROLE_PILOT: 'Customer',
        ROLE_CUSTOMER: 'Customer', ROLE_USER: 'User',
        ACTIVE: 'Active', INACTIVE: 'Inactive', LOCKED: 'Locked', AVAILABLE: 'Available', ASSIGNED: 'Assigned',
        IN_USE: 'In use', MAINTENANCE: 'Maintenance', SUSPENDED: 'Locked', UNKNOWN: 'Unknown', ONLINE: 'Online',
        OFFLINE: 'Offline', RESERVED: 'Reserved', ERROR: 'Error', WARNING: 'Needs attention',
        PERMISSION: 'Access', INVENTORY: 'Inventory', DASHBOARD: 'Overview', AUTH: 'Sign-in', AUDIT: 'Audit log',
        CREATE: 'Create', UPDATE: 'Update', DELETE: 'Delete', STATUS_CHANGE: 'Status change', ASSIGN: 'Assign',
        RESERVE: 'Reserve equipment', RELEASE: 'Release', UPLOAD: 'Upload', DOWNLOAD: 'Download', LOGIN: 'Sign in',
        LOGOUT: 'Sign out', GRANT: 'Grant', REVOKE: 'Revoke', STOCK_IN: 'Stock in', STOCK_OUT: 'Stock out',
        TRANSFER: 'Transfer', OPERATOR: 'Operator', MISSION: 'Mission', MISSION_MEDIA: 'Mission file', MEDIA: 'File',
        UAV: 'UAV', EQUIPMENT: 'Equipment', STATION: 'Station', USER: 'User', USER_PROFILE: 'Profile',
        OPERATOR_REPLACED: 'Operator replaced', OPERATOR_UNASSIGNED: 'Operator removed', STATION_REPLACED: 'Station changed',
        STATION_UNASSIGNED: 'Station removed', EQUIPMENT_CHANGED: 'Equipment or quantity changed',
        EQUIPMENT_RELEASED: 'Equipment returned', UAV_REPLACED: 'UAV replaced', UAV_UNASSIGNED: 'UAV removed from mission',
        OPERATOR_ACCEPTED: 'Mission accepted', OPERATOR_CONFLICT: 'Issue reported',
        MAINTENANCE_SCHEDULE: 'Maintenance schedule', REPAIR_ORDER: 'Repair order', MONTHLY: 'month', YEARLY: 'year',
        CREATED: 'Created', UPDATED: 'Updated', PAUSED: 'Paused', STARTED: 'Repair started',
        AVATAR_UPDATED: 'Profile picture updated', AVATAR_REMOVED: 'Profile picture removed',
    },
    ja: {
        DRAFT: '下書き', PENDING_CONFIRMATION: '確認待ち', CONFIRMED: '確認済み', RESOURCE_RESERVED: 'リソース手配済み',
        READY: '準備完了', IN_PROGRESS: '実施中', COMPLETED: '完了', CANCELLED: 'キャンセル済み', REJECTED: '却下',
        FAILED: '未完了',
        UAV_RENTAL: 'UAVレンタル', AREA_INSPECTION: 'エリア調査', AERIAL_RECORDING: '空撮', DATA_COLLECTION: 'データ収集',
        OTHER: 'その他',
        LOW: '低', NORMAL: '通常', HIGH: '高', URGENT: '緊急',
        INPUT: '入力データ', OUTPUT: '成果物', FLIGHT_DATA: '飛行データ', DOCUMENT: '文書', IMAGE: '画像', VIDEO: '動画',
        ROLE_ADMIN: '管理者', ROLE_COMMANDER: '指揮担当', ROLE_OPERATOR: 'オペレーター', ROLE_PILOT: '顧客',
        ROLE_CUSTOMER: '顧客', ROLE_USER: 'ユーザー',
        ACTIVE: '稼働中', INACTIVE: '停止中', LOCKED: 'ロック中', AVAILABLE: '利用可能', ASSIGNED: '割り当て済み',
        IN_USE: '使用中', MAINTENANCE: 'メンテナンス', SUSPENDED: 'ロック中', UNKNOWN: '不明', ONLINE: 'オンライン',
        OFFLINE: 'オフライン', RESERVED: '確保済み', ERROR: 'エラー', WARNING: '要注意',
        PERMISSION: 'アクセス権', INVENTORY: '機材在庫', DASHBOARD: '概要', AUTH: 'ログイン', AUDIT: '監査ログ',
        CREATE: '作成', UPDATE: '更新', DELETE: '削除', STATUS_CHANGE: 'ステータス変更', ASSIGN: '割り当て',
        RESERVE: '機材確保', RELEASE: '返却', UPLOAD: 'アップロード', DOWNLOAD: 'ダウンロード', LOGIN: 'ログイン',
        LOGOUT: 'ログアウト', GRANT: '権限付与', REVOKE: '権限取り消し', STOCK_IN: '入庫', STOCK_OUT: '出庫',
        TRANSFER: '移管', OPERATOR: 'オペレーター', MISSION: 'ミッション', MISSION_MEDIA: 'ミッションファイル',
        MEDIA: 'ファイル', UAV: 'UAV', EQUIPMENT: '機材', STATION: 'ステーション', USER: 'ユーザー',
        USER_PROFILE: 'プロフィール',
        OPERATOR_REPLACED: 'オペレーター交代', OPERATOR_UNASSIGNED: 'オペレーター解除', STATION_REPLACED: 'ステーション変更',
        STATION_UNASSIGNED: 'ステーション解除', EQUIPMENT_CHANGED: '機材または数量の変更', EQUIPMENT_RELEASED: '機材返却',
        UAV_REPLACED: 'UAV交換', UAV_UNASSIGNED: 'UAVをミッションから解除', OPERATOR_ACCEPTED: 'ミッション受諾',
        OPERATOR_CONFLICT: '問題の報告', MAINTENANCE_SCHEDULE: 'メンテナンス計画', REPAIR_ORDER: '修理票', MONTHLY: 'か月',
        YEARLY: '年', CREATED: '作成済み', UPDATED: '更新済み', PAUSED: '一時停止', STARTED: '修理開始',
        AVATAR_UPDATED: 'プロフィール画像を更新', AVATAR_REMOVED: 'プロフィール画像を削除',
    },
};

function label(value: string): string | undefined {
    return activeLocale === 'vi' ? labels[value] : labelTranslations[activeLocale][value] ?? labels[value];
}

const presentationText: Record<PresentationLocale, { notUpdated: string; missionUpdate: string; defaultHint: string }> = {
    vi: {notUpdated: 'Chưa cập nhật', missionUpdate: 'Cập nhật nhiệm vụ', defaultHint: 'Theo dõi cập nhật của nhiệm vụ tại đây.'},
    en: {notUpdated: 'Not updated yet', missionUpdate: 'Mission update', defaultHint: 'Follow mission updates here.'},
    ja: {notUpdated: '未更新', missionUpdate: 'ミッション更新', defaultHint: 'ミッションの更新はここで確認できます。'},
};

const labels: Record<string, string> = {
    DRAFT: 'Bản nháp',
    PENDING_CONFIRMATION: 'Chờ xác nhận',
    CONFIRMED: 'Đã xác nhận',
    RESOURCE_RESERVED: 'Đã bố trí tài nguyên',
    READY: 'Sẵn sàng',
    IN_PROGRESS: 'Đang thực hiện',
    COMPLETED: 'Hoàn tất',
    CANCELLED: 'Đã hủy',
    REJECTED: 'Đã từ chối',
    FAILED: 'Không thành công',
    UAV_RENTAL: 'Thuê UAV',
    AREA_INSPECTION: 'Khảo sát khu vực',
    AERIAL_RECORDING: 'Quay chụp trên không',
    DATA_COLLECTION: 'Thu thập dữ liệu',
    OTHER: 'Khác',
    LOW: 'Thấp',
    NORMAL: 'Bình thường',
    HIGH: 'Cao',
    URGENT: 'Khẩn cấp',
    INPUT: 'Dữ liệu đầu vào',
    OUTPUT: 'Kết quả',
    FLIGHT_DATA: 'Dữ liệu chuyến bay',
    DOCUMENT: 'Tài liệu',
    IMAGE: 'Hình ảnh',
    VIDEO: 'Video',
    ROLE_ADMIN: 'Quản trị viên',
    ROLE_COMMANDER: 'Điều phối viên',
    ROLE_OPERATOR: 'Người vận hành',
    ROLE_PILOT: 'Khách hàng',
    ROLE_CUSTOMER: 'Khách hàng',
    ROLE_USER: 'Người dùng',
    ACTIVE: 'Đang hoạt động',
    INACTIVE: 'Ngừng hoạt động',
    LOCKED: 'Đã khóa',
    AVAILABLE: 'Sẵn có',
    ASSIGNED: 'Đã phân công',
    IN_USE: 'Đang sử dụng',
    MAINTENANCE: 'Bảo trì',
    SUSPENDED: 'Đã khóa',
    UNKNOWN: 'Chưa xác định',
    ONLINE: 'Trực tuyến',
    OFFLINE: 'Ngoại tuyến',
    RESERVED: 'Đã giữ',
    ERROR: 'Có lỗi',
    WARNING: 'Cần chú ý',
    PERMISSION: 'Quyền truy cập',
    INVENTORY: 'Kho thiết bị',
    DASHBOARD: 'Tổng quan',
    AUTH: 'Đăng nhập',
    AUDIT: 'Nhật ký',
    CREATE: 'Tạo mới',
    UPDATE: 'Cập nhật',
    DELETE: 'Xóa',
    STATUS_CHANGE: 'Đổi trạng thái',
    ASSIGN: 'Phân công',
    RESERVE: 'Giữ thiết bị',
    RELEASE: 'Hoàn trả',
    UPLOAD: 'Tải lên',
    DOWNLOAD: 'Tải xuống',
    LOGIN: 'Đăng nhập',
    LOGOUT: 'Đăng xuất',
    GRANT: 'Cấp quyền',
    REVOKE: 'Thu hồi quyền',
    STOCK_IN: 'Nhập kho',
    STOCK_OUT: 'Xuất kho',
    TRANSFER: 'Điều chuyển',
    OPERATOR: 'Người vận hành',
    MISSION: 'Nhiệm vụ',
    MISSION_MEDIA: 'Tệp nhiệm vụ',
    MEDIA: 'Tệp',
    UAV: 'UAV',
    EQUIPMENT: 'Thiết bị',
    STATION: 'Trạm',
    USER: 'Người dùng',
    USER_PROFILE: 'Hồ sơ cá nhân',
    OPERATOR_REPLACED: 'Thay người vận hành',
    OPERATOR_UNASSIGNED: 'Gỡ người vận hành',
    STATION_REPLACED: 'Đổi trạm',
    STATION_UNASSIGNED: 'Gỡ trạm',
    EQUIPMENT_CHANGED: 'Đổi thiết bị hoặc số lượng',
    EQUIPMENT_RELEASED: 'Hoàn trả thiết bị',
    UAV_REPLACED: 'Thay UAV',
    UAV_UNASSIGNED: 'Gỡ UAV khỏi nhiệm vụ',
    OPERATOR_ACCEPTED: 'Đã nhận nhiệm vụ',
    OPERATOR_CONFLICT: 'Báo vướng mắc',
    MAINTENANCE_SCHEDULE: 'Lịch bảo trì',
    REPAIR_ORDER: 'Phiếu sửa chữa',
    MONTHLY: 'tháng',
    YEARLY: 'năm',
    CREATED: 'Tạo mới',
    UPDATED: 'Đã cập nhật',
    PAUSED: 'Tạm dừng',
    STARTED: 'Đã bắt đầu sửa chữa',
    AVATAR_UPDATED: 'Cập nhật ảnh đại diện',
    AVATAR_REMOVED: 'Xóa ảnh đại diện',
};

export function displayLabel(value?: string | null): string {
    return value ? label(value) ?? value : '—';
}

const auditText: Record<PresentationLocale, {
    profile: (fields: string) => string; fullName: string; phone: string;
    materials: (lines: string, total: string) => string; advanced: (order: string) => string;
}> = {
    vi: {
        profile: fields => `Cập nhật hồ sơ: ${fields}`, fullName: 'họ tên', phone: 'số điện thoại',
        materials: (lines, total) => `Cập nhật ${lines} dòng vật tư · Tổng ${total} ₫`,
        advanced: order => `Cập nhật kỳ bảo trì tiếp theo sau phiếu #${order}`
    },
    en: {
        profile: fields => `Profile updated: ${fields}`, fullName: 'full name', phone: 'phone number',
        materials: (lines, total) => `Updated ${lines} material lines · Total ₫${total}`,
        advanced: order => `Next maintenance period updated after order #${order}`
    },
    ja: {
        profile: fields => `プロフィール更新：${fields}`, fullName: '氏名', phone: '電話番号',
        materials: (lines, total) => `資材 ${lines} 行を更新・合計 ${total} ₫`,
        advanced: order => `修理票 #${order} の後に次回メンテナンス時期を更新`
    },
};

export function auditDetail(value?: string | null): string {
    if (!value) return '—';
    const profile = /^Updated fields: (fullName(?:, phoneNumber)?|phoneNumber)$/.exec(value);
    const text = auditText[activeLocale];
    if (profile) return text.profile(profile[1].split(', ').map(field => field === 'fullName' ? text.fullName : text.phone).join(', '));
    const materials = /^MATERIALS_UPDATED lines=([0-9]+) totalVND=([0-9]+)$/.exec(value);
    if (materials) return text.materials(materials[1], new Intl.NumberFormat(intlLocales[activeLocale]).format(BigInt(materials[2])));
    const advanced = /^ADVANCED order=([0-9]+)$/.exec(value);
    if (advanced) return text.advanced(advanced[1]);
    const separator = value.indexOf(':');
    const prefix = value.slice(0, separator);
    const prefixLabel = separator > 0 ? label(prefix) : undefined;
    return prefixLabel ? `${prefixLabel}: ${value.slice(separator + 1)}` : displayLabel(value);
}

export function serviceName(service: { code: string; name: string }): string {
    const defaults = ['Basic UAV Rental', 'Area Inspection', 'Aerial Video Recording', 'Data Collection'];
    return defaults.includes(service.name) ? displayLabel(service.code) : service.name;
}

export function formatDate(value?: string): string {
    const empty = presentationText[activeLocale].notUpdated;
    if (!value) return empty;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? empty : new Intl.DateTimeFormat(intlLocales[activeLocale], {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

export const terminalStatuses = ['COMPLETED', 'CANCELLED', 'REJECTED', 'FAILED'];

const missionHints: Record<'en' | 'ja', Record<string, string>> = {
    en: {
        DRAFT: 'Review the details and submit the request for confirmation.',
        PENDING_CONFIRMATION: 'The request is waiting for the dispatch team to confirm.',
        CONFIRMED: 'The dispatch team is arranging the station, UAV and operator.',
        RESOURCE_RESERVED: 'Resources are reserved. Preparing to get ready.',
        READY: 'The mission is ready for the assigned operator to start.',
        IN_PROGRESS: 'The mission is in progress. Results will be updated here.',
        COMPLETED: 'The mission is complete. You can review the results and history below.',
        CANCELLED: 'The mission was cancelled. Its details are kept for reference.',
        REJECTED: 'The request was rejected. See the reason in the history.',
        FAILED: 'The mission was not completed. See the notes in the history.'
    },
    ja: {
        DRAFT: '内容を確認し、依頼を送信して確認を受けてください。',
        PENDING_CONFIRMATION: '依頼は配車チームの確認待ちです。',
        CONFIRMED: '配車チームがステーション・UAV・オペレーターを手配しています。',
        RESOURCE_RESERVED: 'リソースを確保しました。準備完了に向けて準備中です。',
        READY: '割り当てられた担当者が開始できる状態です。',
        IN_PROGRESS: 'ミッション実施中です。結果はここに更新されます。',
        COMPLETED: 'ミッションが完了しました。下で結果と履歴を確認できます。',
        CANCELLED: 'ミッションはキャンセルされました。情報は参照用に保存されています。',
        REJECTED: '依頼は却下されました。理由は履歴をご覧ください。',
        FAILED: 'ミッションは完了しませんでした。履歴の記録をご覧ください。'
    },
};

export function missionHint(status: string): string {
    if (activeLocale !== 'vi') return missionHints[activeLocale][status] ?? presentationText[activeLocale].defaultHint;
    return ({
        DRAFT: 'Kiểm tra thông tin và gửi yêu cầu để được xác nhận.',
        PENDING_CONFIRMATION: 'Yêu cầu đang chờ đội điều phối xác nhận.',
        CONFIRMED: 'Đội điều phối đang bố trí trạm, UAV và người vận hành.',
        RESOURCE_RESERVED: 'Tài nguyên đã được bố trí. Chuẩn bị cho bước sẵn sàng.',
        READY: 'Nhiệm vụ đã sẵn sàng để người được phân công bắt đầu.',
        IN_PROGRESS: 'Nhiệm vụ đang được thực hiện. Kết quả sẽ được cập nhật tại đây.',
        COMPLETED: 'Nhiệm vụ đã hoàn tất. Bạn có thể xem kết quả và lịch sử bên dưới.',
        CANCELLED: 'Nhiệm vụ đã hủy. Thông tin được giữ lại để tra cứu.',
        REJECTED: 'Yêu cầu đã bị từ chối. Xem lý do trong lịch sử.',
        FAILED: 'Nhiệm vụ chưa hoàn thành. Xem ghi nhận trong lịch sử.'
    } as Record<string, string>)[status] ?? 'Theo dõi cập nhật của nhiệm vụ tại đây.';
}

const eventLabels: Record<string, string> = {
    OPERATOR_REPLACED: 'Thay người vận hành',
    OPERATOR_UNASSIGNED: 'Gỡ người vận hành',
    STATION_REPLACED: 'Đổi trạm',
    STATION_UNASSIGNED: 'Gỡ trạm',
    EQUIPMENT_CHANGED: 'Đổi thiết bị hoặc số lượng',
    EQUIPMENT_RELEASED: 'Hoàn trả thiết bị',
    CREATED: 'Tạo yêu cầu',
    SUBMITTED: 'Gửi xác nhận',
    UPDATED: 'Cập nhật yêu cầu',
    STATION_ASSIGNED: 'Bố trí trạm',
    UAV_ASSIGNED: 'Bố trí UAV',
    UAV_REPLACED: 'Thay UAV',
    UAV_UNASSIGNED: 'Gỡ UAV khỏi nhiệm vụ',
    OPERATOR_ASSIGNED: 'Phân công người vận hành',
    OPERATOR_ACCEPTED: 'Người vận hành đã nhận nhiệm vụ',
    OPERATOR_CONFLICT: 'Người vận hành báo vướng mắc',
    EQUIPMENT_RESERVED: 'Giữ thiết bị',
    MEDIA_ATTACHED: 'Bổ sung tệp',
    CANCELLED: 'Hủy nhiệm vụ',
    REJECTED: 'Từ chối yêu cầu',
    COMPLETED: 'Hoàn tất nhiệm vụ',
    FAILED: 'Ghi nhận không thành công'
};

const eventTranslations: Record<'en' | 'ja', Record<string, string>> = {
    en: {
        OPERATOR_REPLACED: 'Operator replaced', OPERATOR_UNASSIGNED: 'Operator removed', STATION_REPLACED: 'Station changed',
        STATION_UNASSIGNED: 'Station removed', EQUIPMENT_CHANGED: 'Equipment or quantity changed',
        EQUIPMENT_RELEASED: 'Equipment returned', CREATED: 'Request created', SUBMITTED: 'Submitted for confirmation',
        UPDATED: 'Request updated', STATION_ASSIGNED: 'Station assigned', UAV_ASSIGNED: 'UAV assigned',
        UAV_REPLACED: 'UAV replaced', UAV_UNASSIGNED: 'UAV removed from mission', OPERATOR_ASSIGNED: 'Operator assigned',
        OPERATOR_ACCEPTED: 'Operator accepted the mission', OPERATOR_CONFLICT: 'Operator reported an issue',
        EQUIPMENT_RESERVED: 'Equipment reserved', MEDIA_ATTACHED: 'File added', CANCELLED: 'Mission cancelled',
        REJECTED: 'Request rejected', COMPLETED: 'Mission completed', FAILED: 'Marked unsuccessful'
    },
    ja: {
        OPERATOR_REPLACED: 'オペレーター交代', OPERATOR_UNASSIGNED: 'オペレーター解除', STATION_REPLACED: 'ステーション変更',
        STATION_UNASSIGNED: 'ステーション解除', EQUIPMENT_CHANGED: '機材または数量の変更', EQUIPMENT_RELEASED: '機材返却',
        CREATED: '依頼作成', SUBMITTED: '確認依頼を送信', UPDATED: '依頼を更新', STATION_ASSIGNED: 'ステーション手配',
        UAV_ASSIGNED: 'UAV手配', UAV_REPLACED: 'UAV交換', UAV_UNASSIGNED: 'UAVをミッションから解除',
        OPERATOR_ASSIGNED: 'オペレーター割り当て', OPERATOR_ACCEPTED: 'オペレーターが受諾', OPERATOR_CONFLICT: 'オペレーターが問題を報告',
        EQUIPMENT_RESERVED: '機材確保', MEDIA_ATTACHED: 'ファイル追加', CANCELLED: 'ミッションをキャンセル',
        REJECTED: '依頼を却下', COMPLETED: 'ミッション完了', FAILED: '未完了として記録'
    },
};

export function eventTitle(event: TimelineEvent): string {
    if (event.eventType === 'STATUS_CHANGED') return displayLabel(event.newStatus);
    const title = activeLocale === 'vi' ? eventLabels[event.eventType] : eventTranslations[activeLocale][event.eventType];
    return title ?? presentationText[activeLocale].missionUpdate;
}

export function eventNote(event: TimelineEvent): string | undefined {
    // Preserve user-authored reasons, while keeping generated backend messages out of the interface.
    return ['REJECTED', 'FAILED', 'COMPLETED', 'OPERATOR_CONFLICT', 'UAV_REPLACED', 'UAV_UNASSIGNED', 'OPERATOR_REPLACED', 'OPERATOR_UNASSIGNED', 'STATION_REPLACED', 'STATION_UNASSIGNED', 'EQUIPMENT_CHANGED', 'EQUIPMENT_RELEASED'].includes(event.eventType) ? event.description : undefined;
}

const planNames: Record<PresentationLocale, Record<string, string>> = {
    vi: {
        'Gói Tiêu Chuẩn (Basic)': 'Gói tiêu chuẩn',
        'Gói Chuyên Nghiệp (Pro)': 'Gói chuyên nghiệp',
        'Gói Tác Chiến Đặc Biệt (Enterprise/SAR)': 'Gói tác chiến đặc biệt'
    },
    en: {
        'Gói Tiêu Chuẩn (Basic)': 'Standard plan',
        'Gói Chuyên Nghiệp (Pro)': 'Professional plan',
        'Gói Tác Chiến Đặc Biệt (Enterprise/SAR)': 'Special operations plan'
    },
    ja: {
        'Gói Tiêu Chuẩn (Basic)': 'スタンダードプラン',
        'Gói Chuyên Nghiệp (Pro)': 'プロフェッショナルプラン',
        'Gói Tác Chiến Đặc Biệt (Enterprise/SAR)': '特別作戦プラン'
    },
};

export function planName(value?: string): string {
    return planNames[activeLocale][value ?? ''] ?? value ?? '—';
}

export function permissionLabel(code: string, description?: string): string {
    const labels: Record<string, string> = {
        MISSION_STATUS_UPDATE: 'Cập nhật trạng thái nhiệm vụ',
        MISSION_MEDIA_VIEW: 'Xem tệp nhiệm vụ',
        MISSION_MEDIA_UPLOAD: 'Tải tệp lên nhiệm vụ',
        MISSION_TIMELINE_VIEW: 'Xem lịch sử nhiệm vụ',
        DASHBOARD_MISSION: 'Xem tổng quan nhiệm vụ',
        MISSION_VIEW: 'Xem nhiệm vụ được phép truy cập',
        MISSION_VIEW_ALL: 'Xem tất cả nhiệm vụ',
        MISSION_CREATE: 'Tạo nhiệm vụ',
        MISSION_UPDATE: 'Cập nhật nhiệm vụ',
        MISSION_SUBMIT: 'Gửi yêu cầu nhiệm vụ',
        MISSION_CANCEL: 'Hủy nhiệm vụ',
        MISSION_CONFIRM: 'Xác nhận nhiệm vụ',
        MISSION_REJECT: 'Từ chối nhiệm vụ',
        MISSION_ASSIGN_STATION: 'Bố trí trạm',
        MISSION_ASSIGN_UAV: 'Bố trí UAV',
        MISSION_ASSIGN_OPERATOR: 'Phân công người vận hành',
        MISSION_RESERVE_EQUIPMENT: 'Giữ thiết bị cho nhiệm vụ',
        MISSION_READY: 'Đánh dấu sẵn sàng',
        MISSION_START: 'Bắt đầu nhiệm vụ',
        MISSION_COMPLETE: 'Hoàn tất nhiệm vụ',
        MISSION_FAIL: 'Ghi nhận nhiệm vụ không thành công',
        USER_READ: 'Xem người dùng',
        USER_MANAGE: 'Quản lý người dùng',
        PERMISSION_MANAGE: 'Quản lý quyền truy cập',
        DASHBOARD_READ: 'Xem tổng quan',
        AUDIT_READ: 'Xem nhật ký',
        STATION_READ: 'Xem trạm',
        STATION_MANAGE: 'Quản lý trạm',
        UAV_READ: 'Xem UAV',
        UAV_MANAGE: 'Quản lý UAV',
        INVENTORY_READ: 'Xem kho thiết bị',
        INVENTORY_MANAGE: 'Quản lý kho thiết bị',
        MEDIA_READ: 'Xem tệp',
        MEDIA_MANAGE: 'Quản lý tệp'
    };
    if (activeLocale !== 'vi') return permissionTranslations[activeLocale][code] ?? description ?? code;
    return labels[code] ?? description ?? code;
}

const permissionTranslations: Record<'en' | 'ja', Record<string, string>> = {
    en: {
        MISSION_STATUS_UPDATE: 'Update mission status', MISSION_MEDIA_VIEW: 'View mission files',
        MISSION_MEDIA_UPLOAD: 'Upload mission files', MISSION_TIMELINE_VIEW: 'View mission history',
        DASHBOARD_MISSION: 'View mission overview', MISSION_VIEW: 'View permitted missions', MISSION_VIEW_ALL: 'View all missions',
        MISSION_CREATE: 'Create missions', MISSION_UPDATE: 'Update missions', MISSION_SUBMIT: 'Submit mission requests',
        MISSION_CANCEL: 'Cancel missions', MISSION_CONFIRM: 'Confirm missions', MISSION_REJECT: 'Reject missions',
        MISSION_ASSIGN_STATION: 'Assign stations', MISSION_ASSIGN_UAV: 'Assign UAVs', MISSION_ASSIGN_OPERATOR: 'Assign operators',
        MISSION_RESERVE_EQUIPMENT: 'Reserve equipment for missions', MISSION_READY: 'Mark missions ready',
        MISSION_START: 'Start missions', MISSION_COMPLETE: 'Complete missions', MISSION_FAIL: 'Mark missions unsuccessful',
        USER_READ: 'View users', USER_MANAGE: 'Manage users', PERMISSION_MANAGE: 'Manage access', DASHBOARD_READ: 'View overview',
        AUDIT_READ: 'View audit log', STATION_READ: 'View stations', STATION_MANAGE: 'Manage stations', UAV_READ: 'View UAVs',
        UAV_MANAGE: 'Manage UAVs', INVENTORY_READ: 'View inventory', INVENTORY_MANAGE: 'Manage inventory',
        MEDIA_READ: 'View files', MEDIA_MANAGE: 'Manage files'
    },
    ja: {
        MISSION_STATUS_UPDATE: 'ミッション状態の更新', MISSION_MEDIA_VIEW: 'ミッションファイルの閲覧',
        MISSION_MEDIA_UPLOAD: 'ミッションファイルのアップロード', MISSION_TIMELINE_VIEW: 'ミッション履歴の閲覧',
        DASHBOARD_MISSION: 'ミッション概要の閲覧', MISSION_VIEW: '許可されたミッションの閲覧', MISSION_VIEW_ALL: '全ミッションの閲覧',
        MISSION_CREATE: 'ミッションの作成', MISSION_UPDATE: 'ミッションの更新', MISSION_SUBMIT: 'ミッション依頼の送信',
        MISSION_CANCEL: 'ミッションのキャンセル', MISSION_CONFIRM: 'ミッションの確認', MISSION_REJECT: 'ミッションの却下',
        MISSION_ASSIGN_STATION: 'ステーションの手配', MISSION_ASSIGN_UAV: 'UAVの手配', MISSION_ASSIGN_OPERATOR: 'オペレーターの割り当て',
        MISSION_RESERVE_EQUIPMENT: 'ミッション用機材の確保', MISSION_READY: '準備完了にする', MISSION_START: 'ミッションの開始',
        MISSION_COMPLETE: 'ミッションの完了', MISSION_FAIL: 'ミッションを未完了として記録', USER_READ: 'ユーザーの閲覧',
        USER_MANAGE: 'ユーザーの管理', PERMISSION_MANAGE: 'アクセス権の管理', DASHBOARD_READ: '概要の閲覧', AUDIT_READ: '監査ログの閲覧',
        STATION_READ: 'ステーションの閲覧', STATION_MANAGE: 'ステーションの管理', UAV_READ: 'UAVの閲覧', UAV_MANAGE: 'UAVの管理',
        INVENTORY_READ: '機材在庫の閲覧', INVENTORY_MANAGE: '機材在庫の管理', MEDIA_READ: 'ファイルの閲覧', MEDIA_MANAGE: 'ファイルの管理'
    },
};

const settingTranslations: Record<'en' | 'ja', Record<string, string>> = {
    en: {
        'uav.safety.min_battery_threshold': 'Minimum battery threshold (%)',
        'uav.safety.max_wind_speed_limit': 'Maximum wind speed (m/s)',
        'uav.mission.max_flight_duration_minutes': 'Maximum flight session (minutes)',
        'ai.detection.default_model': 'Default detection model',
        'ai.detection.confidence_threshold': 'Detection confidence threshold',
        'ai.detection.orchestration_mode': 'AI processing allocation mode',
        'billing.currency': 'Currency',
        'billing.auto_generate_invoice': 'Generate invoices automatically',
        'billing.hourly_rate_vnd': 'Estimated hourly rate (VND)'
    },
    ja: {
        'uav.safety.min_battery_threshold': '最低バッテリー残量（%）',
        'uav.safety.max_wind_speed_limit': '最大風速（m/s）',
        'uav.mission.max_flight_duration_minutes': '最大飛行時間（分）',
        'ai.detection.default_model': '既定の検出モデル',
        'ai.detection.confidence_threshold': '検出の信頼度しきい値',
        'ai.detection.orchestration_mode': 'AI処理の割り当てモード',
        'billing.currency': '通貨',
        'billing.auto_generate_invoice': '請求書を自動作成',
        'billing.hourly_rate_vnd': '想定時間単価（VND）'
    },
};

export function settingLabel(key: string, description?: string): string {
    if (activeLocale !== 'vi') return settingTranslations[activeLocale][key] ?? description ?? key;
    return ({
        'uav.safety.min_battery_threshold': 'Ngưỡng pin tối thiểu (%)',
        'uav.safety.max_wind_speed_limit': 'Tốc độ gió tối đa (m/s)',
        'uav.mission.max_flight_duration_minutes': 'Thời lượng ca bay tối đa (phút)',
        'ai.detection.default_model': 'Mô hình nhận diện mặc định',
        'ai.detection.confidence_threshold': 'Ngưỡng tin cậy nhận diện',
        'ai.detection.orchestration_mode': 'Chế độ phân bổ xử lý AI',
        'billing.currency': 'Đơn vị tiền tệ',
        'billing.auto_generate_invoice': 'Tự động lập hóa đơn',
        'billing.hourly_rate_vnd': 'Đơn giá mỗi giờ dự kiến (VND)'
    } as Record<string, string>)[key] ?? description ?? key;
}

const portalLabels: Record<PresentationLocale, Record<'admin' | 'operations' | 'customer', string>> = {
    vi: {admin: 'Quản trị', operations: 'Vận hành', customer: 'Khách hàng'},
    en: {admin: 'Admin', operations: 'Operations', customer: 'Customer'},
    ja: {admin: '管理', operations: '運用', customer: '顧客'},
};

export function portalLabel(portal: 'admin' | 'operations' | 'customer'): string {
    return portalLabels[activeLocale][portal];
}
