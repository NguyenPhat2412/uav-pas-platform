import type {Mission, MissionInput, MissionStatus, MissionType, PageResponse} from "@/types/customer";
import type {FlightPlan, FlightPlanInput} from "@/types/mission/flight-plan.types";
import type {MissionFormErrors, MissionUpdateInput} from "@/types/mission/mission.types";
import type {Translate} from "@/types";
import {translateMessage} from "@/lib/format";

export type {MissionFormErrors, MissionUpdateInput, Translate};

export const missionTypes: MissionType[] = ['UAV_RENTAL', 'AREA_INSPECTION', 'AERIAL_RECORDING', 'DATA_COLLECTION', 'OTHER'];
export const missionStatuses: MissionStatus[] = ['DRAFT', 'PENDING_CONFIRMATION', 'CONFIRMED', 'RESOURCE_RESERVED', 'READY', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED', 'FAILED'];

// Without a translator the Vietnamese default is returned, which keeps these helpers usable outside React.
const message = (t: Translate | undefined, key: string, fallback: string, params?: Record<string, string | number>) =>
    translateMessage(t, `missions.errors.${key}`, fallback, params);

/** Field errors from the backend (keys are request field names, e.g. title or flightPlan.vertices), or null. */
export function missionFieldErrors(error: unknown): MissionFormErrors | null {
    const fields = (error as { fields?: Record<string, string> } | null)?.fields;
    // Read structurally (not instanceof ApiError) so this module stays import-free for its tests.
    return fields && Object.keys(fields).length ? fields as MissionFormErrors : null;
}

/** Whether a flight plan describes a usable area for its type. Kept here so this module stays import-free. */
export function flightPlanComplete(plan: FlightPlanInput): boolean {
    if (plan.areaType === 'POLYGON') return plan.vertices.length >= 3;
    if (plan.areaType === 'CIRCLE') return plan.vertices.length === 1 && !!plan.radiusMeters;
    return plan.takeoffLatitude != null && plan.takeoffLongitude != null;
}

// Service codes are a separate catalogue; only known enum values may suggest a type.
export function missionTypeForService(code: string | undefined, current: MissionType): MissionType {
    return missionTypes.find(type => type === code) ?? current;
}

export function missionUpdatePayload(form: MissionInput): MissionUpdateInput {
    return {
        title: form.title.trim(),
        description: form.description ?? '',
        requestedDate: form.requestedDate,
        startTime: form.startTime,
        expectedEndTime: form.expectedEndTime,
        locationName: form.locationName.trim(),
        latitude: form.latitude,
        longitude: form.longitude,
        priority: form.priority ?? 'NORMAL',
        notes: form.notes ?? '',
        // Omitted entirely when no plan was drawn, so plain requests keep their original shape.
        ...(form.flightPlan ? {flightPlan: form.flightPlan} : {}),
    };
}

export function missionDraftUpdatePayload(form: MissionInput, expectedVersion: number): MissionUpdateInput & {
    expectedVersion: number
} {
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) {
        throw new Error('Thiếu phiên bản bản nháp hợp lệ. Hãy tải bản mới nhất trước khi lưu.');
    }
    return {...missionUpdatePayload(form), expectedVersion};
}

export function missionFormFromDetail(mission: Mission): MissionInput {
    const {flightPlan, ...rest} = mission;
    return {
        ...missionUpdatePayload(rest), missionType: mission.missionType, serviceId: mission.serviceId,
        ...(flightPlan ? {flightPlan: toFlightPlanInput(flightPlan)} : {}),
    };
}

/** Drops the server-computed geometry; it is recomputed on every save. */
function toFlightPlanInput(plan: FlightPlan): FlightPlanInput {
    return {
        areaType: plan.areaType, vertices: plan.vertices ?? [], radiusMeters: plan.radiusMeters ?? undefined,
        takeoffLatitude: plan.takeoffLatitude ?? undefined, takeoffLongitude: plan.takeoffLongitude ?? undefined,
        altitudeAglMeters: plan.altitudeAglMeters, targetGsdCm: plan.targetGsdCm, forwardOverlap: plan.forwardOverlap,
        sideOverlap: plan.sideOverlap, sensors: plan.sensors ?? [], obstacles: plan.obstacles ?? undefined, permitSupport: plan.permitSupport,
    };
}

export function canEditMission(mission: Mission, userId: number | undefined, canUpdate: boolean): boolean {
    return userId != null && mission.customerId === userId && mission.status === 'DRAFT' && canUpdate;
}

export function missionPageRange(page: Pick<PageResponse<unknown>, 'page' | 'size' | 'content' | 'totalElements'>) {
    return {
        first: page.content.length ? page.page * page.size + 1 : 0,
        last: page.content.length ? Math.min(page.page * page.size + page.content.length, page.totalElements) : 0,
        total: page.totalElements
    };
}

export function missionListFilters(search: string, status: MissionStatus | '') {
    return {search, status, page: 0};
}

export function missionFormError(error: unknown, t?: Translate): string {
    const status = error && typeof error === 'object' && 'status' in error ? error.status : undefined;
    if (status === 400) return message(t, 'save400', 'Thông tin chưa hợp lệ. Kiểm tra các trường và ngày yêu cầu rồi thử lại.');
    if (status === 401) return message(t, 'save401', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    if (status === 403) return message(t, 'save403', 'Bạn không có quyền lưu yêu cầu này hoặc quyền của bạn đã thay đổi.');
    if (status === 404) return message(t, 'save404', 'Không tìm thấy yêu cầu hoặc dịch vụ đã chọn. Vui lòng tải lại thông tin.');
    if (status === 409) return message(t, 'save409', 'Thông tin hoặc trạng thái yêu cầu đã thay đổi. Hãy tải và kiểm tra bản mới nhất trước khi lưu lại.');
    return message(t, 'saveUnknown', 'Chưa xác nhận được kết quả lưu. Hãy kiểm tra danh sách nhiệm vụ trước khi thử lại để tránh tạo trùng.');
}
