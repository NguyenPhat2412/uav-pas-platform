import {apiClient, apiRequest} from '@/lib/api';
import {API_ROUTES} from '@/lib/api/routes';
import {buildQueryString} from '@/lib/format';
import {profilePayload} from '@/features/profile/forms/profile-form';
import type {Invoice, PageResponse, ServicePlan} from '@/types';
import type {
    AiRouterSettings,
    AiRouterSettingsInput,
    AiRouterStatus,
    AssistantAttachmentInput,
    AssistantConversation,
    AssistantConversationDetail,
    AssistantInfo,
    AssistantMessage,
    AssistantPortal,
    AssistantReply,
    ConversationFilter,
} from '@/features/assistant/types/assistant.types';
import type {
    AuthResponse,
    ForgotPasswordRequest,
    LoginRequest,
    OtpChallengeResponse,
    RegisterRequest,
    ResendOtpRequest,
    ResetPasswordRequest,
    TwoFactorDisableRequest,
    TwoFactorSetupRequest,
    TwoFactorSetupResponse,
    TwoFactorStatusResponse,
    TwoFactorVerifyRequest,
    UserResponse,
    VerifyOtpRequest,
} from '@/features/auth/types/auth.types';
import type {
    BankTransferInstructions,
    BankTransferStatus,
    CreateInvoiceInput,
    InvoiceFilters,
    PlanInput,
} from '@/features/billing/types/billing.types';
import type {
    ServiceOffering,
    ServiceOfferingInput,
    ServiceOfferingUpdate,
} from '@/features/catalog/types/service-offering.types';
import type {CustomerAnalytics, DashboardSummary} from '@/features/dashboard/types/dashboard.types';
import type {
    NotificationRecord,
    NotificationResponse,
    SendNotificationInput,
} from '@/features/notifications/types/notification.types';
import type {
    BillingProfile,
    BillingProfileFields,
    CustomerProfile,
    ProfileFields,
    SignedAvatarUpload,
} from '@/features/profile/types/profile.types';
import type {
    AiDetection,
    AiTask,
    SarCockpitMission,
    SarDispatchResult,
    SarFlightPlan,
} from '@/features/sar/types/sar.types';
import type {SystemHealth} from '@/features/settings/types/system-health.types';
import type {FleetMap} from '@/features/uavs/types/fleet-map.types';
import type {UavTelemetry} from '@/features/uavs/types/telemetry.types';

export {adminService} from '@/lib/api/admin';
export {customerService} from '@/lib/api/customer';
export {operationsService, type MediaInput, type QuantityInput} from '@/lib/api/resources';
export {maintenanceService} from '@/lib/api/maintenance';
export {missionService} from '@/lib/api/missions';

export type {
    ConversationFilter,
    BankTransferInstructions,
    BankTransferStatus,
    CreateInvoiceInput,
    InvoiceFilters,
    PlanInput,
};

export const assistantService = {
    settings: (signal?: AbortSignal) => apiClient.get<AiRouterSettings>(API_ROUTES.aiRouter.settings, {signal}),
    save: (input: AiRouterSettingsInput) => apiClient.put<AiRouterSettings>(API_ROUTES.aiRouter.settings, input),
    status: (signal?: AbortSignal) => apiClient.get<AiRouterStatus>(API_ROUTES.aiRouter.status, {signal}),
    info: (signal?: AbortSignal) => apiClient.get<AssistantInfo>(API_ROUTES.assistant.info, {signal}),
    chat: (mode: number, messages: AssistantMessage[], portal: AssistantPortal, conversationId: number | null,
           attachments: AssistantAttachmentInput[] = []) =>
        apiClient.post<AssistantReply>(API_ROUTES.assistant.chat, {
            mode,
            messages: messages.map(({role, content}) => ({role, content})),
            portal,
            conversationId,
            attachments: attachments.length ? attachments : undefined,
        }),
    conversations: (filter: ConversationFilter, signal?: AbortSignal) =>
        apiClient.get<PageResponse<AssistantConversation>>(`${API_ROUTES.assistant.conversations}?${buildQueryString({
            page: filter.page,
            size: filter.size,
            portal: filter.portal || undefined,
            q: filter.q || undefined,
        })}`, {signal}),
    conversation: (id: number, signal?: AbortSignal) =>
        apiClient.get<AssistantConversationDetail>(API_ROUTES.assistant.conversation(id), {signal}),
    deleteConversation: (id: number) => apiClient.delete<void>(API_ROUTES.assistant.conversation(id)),
};

export const assistantKeys = {
    settings: ['ai-router', 'settings'] as const,
    status: ['ai-router', 'status'] as const,
    info: ['assistant', 'info'] as const,
    conversations: ['assistant', 'conversations'] as const,
    conversationList: (filter: ConversationFilter) => ['assistant', 'conversations', filter] as const,
    conversation: (id: number) => ['assistant', 'conversations', 'detail', id] as const,
};

export const authService = {
    async login(credentials: LoginRequest): Promise<AuthResponse> {
        return apiClient.post<AuthResponse>(API_ROUTES.auth.login, credentials);
    },
    /** Signs in with a Google ID token; the answer has the same shape as a password login. */
    async loginWithGoogle(credential: string): Promise<AuthResponse> {
        return apiClient.post<AuthResponse>(API_ROUTES.auth.google, {credential});
    },
    async register(data: RegisterRequest): Promise<UserResponse> {
        return apiClient.post<UserResponse>(API_ROUTES.auth.register, data);
    },
    async registerWithOtp(data: RegisterRequest): Promise<OtpChallengeResponse> {
        return apiClient.post<OtpChallengeResponse>(API_ROUTES.auth.registerOtp, data);
    },
    async verifyEmail(data: VerifyOtpRequest): Promise<AuthResponse> {
        return apiClient.post<AuthResponse>(API_ROUTES.auth.verifyEmail, data);
    },
    async verify2fa(data: VerifyOtpRequest): Promise<AuthResponse> {
        return apiClient.post<AuthResponse>(API_ROUTES.auth.verify2fa, data);
    },
    async resendOtp(data: ResendOtpRequest): Promise<OtpChallengeResponse> {
        return apiClient.post<OtpChallengeResponse>(API_ROUTES.auth.resendOtp, data);
    },
    async forgotPassword(data: ForgotPasswordRequest): Promise<OtpChallengeResponse> {
        return apiClient.post<OtpChallengeResponse>(API_ROUTES.auth.forgotPassword, data);
    },
    async resetPassword(data: ResetPasswordRequest): Promise<{ message: string }> {
        return apiClient.post<{ message: string }>(API_ROUTES.auth.resetPassword, data);
    },
    async get2faStatus(signal?: AbortSignal): Promise<TwoFactorStatusResponse> {
        return apiClient.get<TwoFactorStatusResponse>(API_ROUTES.auth.twoFactorStatus, {signal});
    },
    async setup2fa(data: TwoFactorSetupRequest): Promise<TwoFactorSetupResponse> {
        return apiClient.post<TwoFactorSetupResponse>(API_ROUTES.auth.twoFactorSetup, data);
    },
    async enable2fa(data: TwoFactorVerifyRequest): Promise<TwoFactorStatusResponse> {
        return apiClient.post<TwoFactorStatusResponse>(API_ROUTES.auth.twoFactorEnable, data);
    },
    async disable2fa(data: TwoFactorDisableRequest = {}): Promise<TwoFactorStatusResponse> {
        return apiClient.post<TwoFactorStatusResponse>(API_ROUTES.auth.twoFactorDisable, data);
    },
    async refreshToken(refreshToken: string): Promise<AuthResponse> {
        return apiClient.post<AuthResponse>(API_ROUTES.auth.refresh, {refreshToken});
    },
    async logout(refreshToken?: string): Promise<void> {
        try {
            await apiClient.post<{ message: string }>(API_ROUTES.auth.logout, {refreshToken});
        } catch (e) {
            console.warn('Backend logout call completed with note:', e);
        }
    },
    async getMe(): Promise<UserResponse> {
        return apiClient.get<UserResponse>(API_ROUTES.auth.me);
    },
};

export const bankTransferService = {
    status: (signal?: AbortSignal) =>
        apiClient.get<BankTransferStatus>(API_ROUTES.billing.bankTransferStatus, {signal}),
    instructions: (invoiceId: number, signal?: AbortSignal) =>
        apiClient.get<BankTransferInstructions>(API_ROUTES.billing.bankTransferInstructions(invoiceId), {signal}),
    /** Returns the plan invoice to pay, or undefined (HTTP 204) when a free plan was applied immediately. */
    subscribe: (planCode: string) =>
        apiClient.post<Invoice | undefined>(API_ROUTES.billing.subscriptions, {planCode}),
    confirm: (invoiceId: number, bankReference: string) =>
        apiClient.post<Invoice>(API_ROUTES.billing.confirmPayment(invoiceId), {bankReference}),
};

export const invoicesService = {
    /** Managers receive every customer's invoices; the backend scopes others to their own. */
    page: (page: number, filters: InvoiceFilters, signal?: AbortSignal) =>
        apiClient.get<PageResponse<Invoice>>(`${API_ROUTES.billing.invoices}?${buildQueryString({
            page,
            size: 20,
            status: filters.status || undefined,
            overdue: filters.overdue ? 'true' : undefined,
        })}`, {signal}),
    create: (input: CreateInvoiceInput) => apiClient.post<Invoice>(API_ROUTES.billing.invoices, input),
};

export const plansService = {
    /** Every plan including inactive ones; the public /billing/plans only lists active plans. */
    all: (signal?: AbortSignal) => apiClient.get<ServicePlan[]>(API_ROUTES.billing.adminPlans, {signal}),
    create: (input: PlanInput) => apiClient.post<ServicePlan>(API_ROUTES.billing.adminPlans, input),
    update: (id: number, input: Omit<PlanInput, 'code'>) =>
        apiClient.put<ServicePlan>(API_ROUTES.billing.adminPlanById(id), input),
    setActive: (id: number, active: boolean) =>
        apiClient.patch<ServicePlan>(API_ROUTES.billing.adminPlanActive(id, active)),
};

export const serviceOfferingsService = {
    /** Includes deactivated services; the customer catalog only ever sees active ones. */
    all: (signal?: AbortSignal) => apiClient.get<ServiceOffering[]>(API_ROUTES.uavServices.all, {signal}),
    create: (input: ServiceOfferingInput) => apiClient.post<ServiceOffering>(API_ROUTES.uavServices.list, input),
    update: (id: number, input: ServiceOfferingUpdate) =>
        apiClient.put<ServiceOffering>(API_ROUTES.uavServices.detail(id), input),
    setActive: (id: number, active: boolean) =>
        apiClient.patch<ServiceOffering>(API_ROUTES.uavServices.setActive(id, active)),
};

export const dashboardService = {
    getSummary: () => apiClient.get<DashboardSummary>(API_ROUTES.dashboard.summary),
    getCustomerAnalytics: (signal?: AbortSignal) =>
        apiClient.get<CustomerAnalytics>(API_ROUTES.dashboard.customerAnalytics, {signal}),
};

export const notificationsService = {
    page: (page: number, size: number, signal?: AbortSignal) =>
        apiClient.get<PageResponse<NotificationRecord>>(`${API_ROUTES.notifications.list}?${buildQueryString({page, size})}`, {signal}),
    recent: (size = 50, signal?: AbortSignal) =>
        apiClient.get<{ content: NotificationResponse[] }>(`${API_ROUTES.notifications.list}?${buildQueryString({size})}`, {signal}),
    unreadCount: (signal?: AbortSignal) =>
        apiClient.get<{ unreadCount: number }>(API_ROUTES.notifications.unreadCount, {signal}),
    markRead: (id: number | string) =>
        apiClient.patch<NotificationRecord>(API_ROUTES.notifications.markRead(id)),
    markAllRead: () => apiClient.post(API_ROUTES.notifications.markAllRead),
    send: (input: SendNotificationInput) =>
        apiClient.post<NotificationRecord>(API_ROUTES.notifications.list, input),
};

export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const AVATAR_MAX_BYTES = 5_000_000;

export function avatarFileError(file: File): 'type' | 'size' | null {
    if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) return 'type';
    if (file.size < 1 || file.size > AVATAR_MAX_BYTES) return 'size';
    return null;
}

/** Signed upload straight to storage, then the backend confirms the object and makes it the avatar. */
export const avatarService = {
    upload: async (file: File) => {
        const signed = await apiClient.post<SignedAvatarUpload>(API_ROUTES.users.avatarUploadUrl, {
            originalName: file.name, contentType: file.type, size: file.size
        });
        await apiRequest<void>(signed.url, {
            method: 'PUT',
            headers: {'If-None-Match': '*', 'Content-Type': file.type},
            body: file
        });
        return apiClient.put<{ avatarUrl: string | null }>(API_ROUTES.users.avatar, {mediaId: signed.mediaId});
    },
    remove: () => apiClient.delete<void>(API_ROUTES.users.avatar),
};

export const profileService = {
    get: (signal?: AbortSignal) =>
        apiClient.get<CustomerProfile>(API_ROUTES.users.profile, {signal}),
    update: (fields: ProfileFields, revision: string) =>
        apiClient.patch<CustomerProfile>(API_ROUTES.users.profile, profilePayload(fields, revision)),
    changePassword: (currentPassword: string, newPassword: string, confirmPassword?: string) =>
        apiClient.post<void>(API_ROUTES.users.profilePassword, {currentPassword, newPassword, confirmPassword}),
    getBilling: (signal?: AbortSignal) =>
        apiClient.get<BillingProfile>(API_ROUTES.users.profileBilling, {signal}),
    updateBilling: (fields: BillingProfileFields, expectedVersion: number) =>
        apiClient.put<BillingProfile>(API_ROUTES.users.profileBilling, {expectedVersion, ...fields}),
};

export const sarService = {
    missions: (includeClosed = false, signal?: AbortSignal) =>
        apiClient.get<SarCockpitMission[]>(`${API_ROUTES.sar.missions}?includeClosed=${includeClosed}`, {signal}),
    detections: (missionId: number, signal?: AbortSignal) =>
        apiClient.get<AiDetection[]>(API_ROUTES.ai.detections(missionId), {signal}),
    tasks: (missionId: number, signal?: AbortSignal) =>
        apiClient.get<AiTask[]>(API_ROUTES.ai.tasks(missionId), {signal}),
    verify: (detectionId: number, verified: boolean) =>
        apiClient.patch<AiDetection>(API_ROUTES.ai.verifyDetection(detectionId), {verified}),
    dispatchRescue: (missionId: number, payload: Record<string, unknown>) =>
        apiClient.post<SarDispatchResult>(API_ROUTES.sar.dispatchRescue(missionId), payload),
    returnToHome: (missionId: number) =>
        apiClient.post<SarDispatchResult>(API_ROUTES.sar.returnToHome(missionId)),
    flightPlan: (missionId: number, lkpLat: number, lkpLng: number, sweepWidthMeters = 60, maxLegs = 12) =>
        apiClient.post<SarFlightPlan>(API_ROUTES.sar.flightPlan, {missionId, lkpLat, lkpLng, sweepWidthMeters, maxLegs}),
};

/** Keys shared by every cockpit widget so a verify in one view refreshes the others. */
export const sarKeys = {
    missions: ['sar', 'missions'] as const,
    detections: (missionId: number) => ['sar', 'detections', missionId] as const,
    tasks: (missionId: number) => ['sar', 'tasks', missionId] as const,
    telemetry: (missionId: number) => ['sar', 'telemetry', missionId] as const,
};

/** searchAreaPolygon is stored as JSON [[lat, lng], ...]; anything else draws no polygon. */
export function parseSearchArea(raw: string | null): Array<[number, number]> {
    if (!raw) return [];
    try {
        const value: unknown = JSON.parse(raw);
        if (!Array.isArray(value)) return [];
        const points = value.filter((p): p is [number, number] =>
            Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1])
            && Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 180);
        return points.length >= 3 ? points : [];
    } catch {
        return [];
    }
}

export const systemHealthService = {
    get: (signal?: AbortSignal) => apiClient.get<SystemHealth>(API_ROUTES.dashboard.systemHealth, {signal}),
};

export const fleetMapService = {
    get: (signal?: AbortSignal) => apiClient.get<FleetMap>(API_ROUTES.dashboard.fleetMap, {signal}),
};

/** Every call resolves to undefined (HTTP 204) when the UAV has never reported. */
export const telemetryService = {
    latest: (uavId: number, signal?: AbortSignal) =>
        apiClient.get<UavTelemetry | undefined>(API_ROUTES.uavs.latestTelemetry(uavId), {signal}),
    fleet: (signal?: AbortSignal) =>
        apiClient.get<UavTelemetry[]>(API_ROUTES.uavs.fleetTelemetry, {signal}),
    forMission: (missionId: number, signal?: AbortSignal) =>
        apiClient.get<UavTelemetry | undefined>(API_ROUTES.missions.latestTelemetry(missionId), {signal}),
};

/** Telemetry is polled; device gateways push at roughly 1 Hz, the UI refreshes every few seconds. */
export const TELEMETRY_POLL_MS = 5000;
