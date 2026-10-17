/**
 * Centralized API Route Registry for UAV Platform (VJU PAS)
 * Single source of truth for all Backend /api/v1/* endpoints across Frontend portals.
 */
export const API_ROUTES = {
  auth: {
    login: '/api/v1/auth/login',
    register: '/api/v1/auth/register',
    refresh: '/api/v1/auth/refresh',
    logout: '/api/v1/auth/logout',
    me: '/api/v1/auth/me',
    zaloAuthorize: '/api/v1/auth/zalo/authorize',
    zaloCallback: '/api/v1/auth/zalo/callback',
  },
  users: {
    list: '/api/v1/users',
    detail: (userId: string) => `/api/v1/users/${userId}`,
    status: (userId: string) => `/api/v1/users/${userId}/status`,
    role: (userId: string) => `/api/v1/users/${userId}/role`,
    effectivePermissions: (userId: string) => `/api/v1/users/${userId}/effective-permissions`,
    overrides: (userId: string) => `/api/v1/users/${userId}/permission-overrides`,
    removeOverride: (userId: string, code: string) =>
      `/api/v1/users/${userId}/permission-overrides/${encodeURIComponent(code)}`,
  },
  permissions: {
    list: '/api/v1/permissions',
    me: '/api/v1/permissions/me',
  },
  roleTemplates: {
    list: '/api/v1/role-templates',
    byRole: (role: string) => `/api/v1/role-templates/${role}`,
  },
  dashboard: {
    summary: '/api/v1/dashboard/summary',
  },
  stations: {
    list: '/api/v1/stations',
    detail: (id: string) => `/api/v1/stations/${id}`,
  },
  uavs: {
    list: '/api/v1/uavs',
    detail: (id: string) => `/api/v1/uavs/${id}`,
    assignStation: (uavId: string) => `/api/v1/uavs/${uavId}/assign-station`,
    telemetry: (uavId: string) => `/api/v1/uavs/${uavId}/telemetry`,
    latestTelemetry: (uavId: string) => `/api/v1/uavs/${uavId}/telemetry/latest`,
    telemetryHistory: (uavId: string) => `/api/v1/uavs/${uavId}/telemetry/history`,
  },
  inventory: {
    items: '/api/v1/inventory/items',
    itemById: (id: string) => `/api/v1/inventory/items/${id}`,
    requests: '/api/v1/inventory/requests',
    approveRequest: (id: string) => `/api/v1/inventory/requests/${id}/approve`,
    rejectRequest: (id: string) => `/api/v1/inventory/requests/${id}/reject`,
    returnRequest: (id: string) => `/api/v1/inventory/requests/${id}/return`,
  },
  missions: {
    list: '/api/v1/missions',
    detail: (id: string) => `/api/v1/missions/${id}`,
    submit: (id: string) => `/api/v1/missions/${id}/submit`,
    approve: (id: string) => `/api/v1/missions/${id}/approve`,
    reject: (id: string) => `/api/v1/missions/${id}/reject`,
    schedule: (id: string) => `/api/v1/missions/${id}/schedule`,
    start: (id: string) => `/api/v1/missions/${id}/start`,
    complete: (id: string) => `/api/v1/missions/${id}/complete`,
    cancel: (id: string) => `/api/v1/missions/${id}/cancel`,
    assign: (id: string) => `/api/v1/missions/${id}/assign`,
  },
  media: {
    list: '/api/v1/media',
    presignUpload: '/api/v1/media/presign-upload',
    confirmUpload: (id: string) => `/api/v1/media/${id}/confirm-upload`,
    completeUpload: (id: string) => `/api/v1/media/${id}/complete`,
    downloadUrl: (id: string) => `/api/v1/media/${id}/download-url`,
  },
  auditLogs: {
    list: '/api/v1/audit-logs',
  },
  sar: {
    gridGenerate: '/api/v1/sar/grid/generate',
    detections: (missionId?: string) =>
      missionId ? `/api/v1/sar/detections?missionId=${encodeURIComponent(missionId)}` : '/api/v1/sar/detections',
    verifyDetection: (detectionId: string, verified: boolean) =>
      `/api/v1/sar/detections/${encodeURIComponent(detectionId)}/verify?verified=${verified}`,
    command: (uavId: string) => `/api/v1/sar/command/${encodeURIComponent(uavId)}`,
    wsEndpoint: '/ws-uav',
  },
  ai: {
    models: '/api/v1/ai/models',
    activateModel: (modelId: string) => `/api/v1/ai/models/${encodeURIComponent(modelId)}/activate`,
    infer: '/api/v1/ai/infer',
    jobs: (missionId?: string) =>
      missionId ? `/api/v1/ai/jobs?missionId=${encodeURIComponent(missionId)}` : '/api/v1/ai/jobs',
  },
  notifications: {
    list: '/api/v1/notifications',
    unreadCount: '/api/v1/notifications/unread-count',
    markRead: (id: string) => `/api/v1/notifications/${id}/read`,
    markAllRead: '/api/v1/notifications/read-all',
  },
  billing: {
    plans: '/api/v1/billing/plans',
    subscription: '/api/v1/billing/quota',
    subscribe: '/api/v1/billing/subscribe',
    invoices: '/api/v1/billing/invoices',
    createInvoice: '/api/v1/billing/invoices/create',
    paymentIpn: '/api/v1/billing/webhook/payment-ipn',
    allInvoices: '/api/v1/billing/admin/all-invoices',
    revenueSummary: '/api/v1/billing/admin/revenue-summary',
  },
  reports: {
    operations: '/api/v1/reports/operations-summary',
    exportOperationsCsv: '/api/v1/reports/export-csv',
  },
  settings: {
    list: '/api/v1/settings',
    byKey: (key: string) => `/api/v1/settings/${encodeURIComponent(key)}`,
  },
  webhooks: {
    list: '/api/v1/webhooks/subscriptions',
    detail: (id: string) => `/api/v1/webhooks/subscriptions/${id}`,
    logs: '/api/v1/webhooks/logs',
    test: '/api/v1/webhooks/test-dispatch',
    status: '/api/v1/webhooks/status',
  },
} as const;

export type ApiRoutes = typeof API_ROUTES;
