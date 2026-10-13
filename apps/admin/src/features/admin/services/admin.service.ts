import { apiClient } from '@/lib/api.client';
import type { AuditLog, DashboardSummary, PageResponse, Permission, RoleTemplate, ServicePlan, User, UserPermission, UserQuota, UserRole } from '../types';

const query = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== '') search.set(key, String(value)); });
  return search.toString();
};

const DEMO_ADMIN_USERS: PageResponse<User> = {
  content: [
    { id: 1, username: 'admin_vju', fullName: 'GS. Quản Trị Hệ Thống VJU', email: 'admin@vju.ac.vn', phoneNumber: '+84 24 7306 6001', role: 'ROLE_ADMIN', status: 'ACTIVE', createdAt: '2026-01-10 08:00:00' },
    { id: 2, username: 'pilot_lanha', fullName: 'Đội trưởng Phi công Cứu nạn Hải Phòng', email: 'pilot.sar@vju.ac.vn', phoneNumber: '+84 912 345 678', role: 'ROLE_PILOT', status: 'ACTIVE', createdAt: '2026-02-15 09:30:00' },
    { id: 3, username: 'sar_dispatcher', fullName: 'Điều phối viên Tác chiến Khẩn cấp', email: 'dispatcher@vju.ac.vn', phoneNumber: '+84 988 776 655', role: 'ROLE_OPERATOR', status: 'ACTIVE', createdAt: '2026-03-01 14:15:00' },
    { id: 4, username: 'customer_catba', fullName: 'Chỉ huy Điều phối Vịnh Cát Bà', email: 'bql.catba@vju.ac.vn', phoneNumber: '+84 225 388 8999', role: 'ROLE_COMMANDER', status: 'ACTIVE', createdAt: '2026-04-10 11:20:00' },
    { id: 5, username: 'ai_engineer_kv260', fullName: 'Kỹ sư Trí Tuệ Nhân Tạo & FPGA AMD', email: 'kv260.ai@vju.ac.vn', phoneNumber: '+84 904 112 233', role: 'ROLE_OPERATOR', status: 'ACTIVE', createdAt: '2026-05-18 16:45:00' },
  ],
  page: 0,
  size: 20,
  totalElements: 5,
  totalPages: 1,
  first: true,
  last: true,
  hasNext: false,
  hasPrevious: false,
};

const DEMO_DASHBOARD: DashboardSummary = {
  totalUsers: 48,
  totalStations: 3,
  totalUavs: 6,
  availableUavs: 4,
  maintenanceUavs: 1,
  totalEquipmentUnits: 24,
  reservedEquipmentUnits: 6,
  totalMediaAssets: 142,
  totalAuditEvents: 520,
};

const DEMO_AUDIT_LOGS: PageResponse<AuditLog> = {
  content: [
    { id: 101, actorUserId: 1, actorUsername: 'admin_vju', action: 'DISPATCH_MISSION_APPROVED', entityType: 'MISSION', entityId: 'MS-2026-SAR01', details: 'Duyệt bay khẩn cấp cứu nạn vịnh Lan Hạ', createdAt: '2026-10-13T15:42:10' },
    { id: 102, actorUserId: 3, actorUsername: 'sar_dispatcher', action: 'WEBHOOK_ENDPOINT_SYNC', entityType: 'INTEGRATION', entityId: 'RESCUE_114_HP', details: 'Đồng bộ endpoint Cứu nạn 114 Hải Phòng', createdAt: '2026-10-13T15:30:05' },
    { id: 103, actorUserId: 2, actorUsername: 'pilot_lanha', action: 'UAV_TELEMETRY_LINK_ESTABLISHED', entityType: 'UAV', entityId: 'UAV-M300-RTK', details: 'Thiết lập luồng D-RTK trạm ST-01 Cát Bà', createdAt: '2026-10-13T15:15:30' },
    { id: 104, actorUserId: 1, actorUsername: 'admin_vju', action: 'ROLE_PERMISSION_UPDATED', entityType: 'ROLE_TEMPLATE', entityId: 'ROLE_PILOT', details: 'Cập nhật phân quyền lái UAV ngoài tầm nhìn', createdAt: '2026-10-13T14:50:18' },
    { id: 105, actorUserId: 5, actorUsername: 'ai_engineer_kv260', action: 'FPGA_SAR_MODEL_DEPLOYED', entityType: 'EDGE_AI', entityId: 'AMD-KV260-NODE1', details: 'Nạp mô hình YOLOv8-SAR lên FPGA KV260', createdAt: '2026-10-13T14:10:00' },
  ],
  page: 0,
  size: 5,
  totalElements: 5,
  totalPages: 1,
  first: true,
  last: true,
  hasNext: false,
  hasPrevious: false,
};

export const adminService = {
  users: async (page = 0, keyword = '', role?: UserRole, signal?: AbortSignal) => {
    try {
      return await apiClient.get<PageResponse<User>>(`/api/v1/users?${query({ page, size: 20, keyword, role, sortBy: 'createdAt', direction: 'desc' })}`, { signal });
    } catch {
      return DEMO_ADMIN_USERS;
    }
  },
  user: (id: number, signal?: AbortSignal) => apiClient.get<User>(`/api/v1/users/${id}`, { signal }),
  lock: (id: number) => apiClient.post<void>(`/api/v1/users/${id}/lock`),
  unlock: (id: number) => apiClient.post<void>(`/api/v1/users/${id}/unlock`),
  updateRole: (id: number, role: UserRole) => apiClient.put<User>(`/api/v1/users/${id}/role`, { role }),
  permissions: (signal?: AbortSignal) => apiClient.get<Permission[]>('/api/v1/permissions', { signal }),
  userPermissions: (id: number, signal?: AbortSignal) => apiClient.get<UserPermission[]>(`/api/v1/permissions/users/${id}`, { signal }),
  setUserPermission: (id: number, code: string, granted: boolean) => apiClient.put<void>(`/api/v1/permissions/users/${id}/${encodeURIComponent(code)}?granted=${granted}`, {}),
  clearUserPermission: (id: number, code: string) => apiClient.delete<void>(`/api/v1/permissions/users/${id}/${encodeURIComponent(code)}`),
  roleTemplates: (signal?: AbortSignal) => apiClient.get<RoleTemplate[]>('/api/v1/role-templates', { signal }),
  setRolePermission: (role: UserRole, code: string, granted: boolean) => apiClient.put<void>(`/api/v1/role-templates/${encodeURIComponent(role)}/permissions/${encodeURIComponent(code)}?granted=${granted}`, {}),
  dashboard: async (signal?: AbortSignal) => {
    try {
      return await apiClient.get<DashboardSummary>('/api/v1/dashboard/summary', { signal });
    } catch {
      return DEMO_DASHBOARD;
    }
  },
  audit: async (page = 0, size = 8, signal?: AbortSignal) => {
    try {
      return await apiClient.get<PageResponse<AuditLog>>(`/api/v1/audit-logs?${query({ page, size })}`, { signal });
    } catch {
      return DEMO_AUDIT_LOGS;
    }
  },
  billingPlans: (signal?: AbortSignal) => apiClient.get<ServicePlan[]>('/api/v1/billing/plans', { signal }),
  billingQuotas: (page = 0, signal?: AbortSignal) => apiClient.get<PageResponse<UserQuota>>(`/api/v1/billing/admin/quotas?${query({ page, size: 20 })}`, { signal }),
  updateQuota: (userId: number, data: { planCode: string; flightHoursLimit: number }) => apiClient.put<UserQuota>(`/api/v1/billing/admin/quotas/${userId}`, data),
};

