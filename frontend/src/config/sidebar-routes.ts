import {
    Activity,
    Archive,
    BookOpenCheck,
    CirclePlus,
    BarChart3,
    Bell,
    Boxes,
    ClipboardList,
    CreditCard,
    Crosshair,
    Database,
    FileCheck2,
    FileKey2,
    FileLock2,
    FileSpreadsheet,
    FolderOpen,
    Gauge,
    GraduationCap,
    HardDrive,
    Inbox,
    KeyRound,
    LayoutDashboard,
    Lock,
    Mail,
    Map as MapIcon,
    MapPinned,
    MessagesSquare,
    Package,
    PlaneTakeoff,
    Radio,
    ReceiptText,
    Rocket,
    Router,
    ScrollText,
    Server,
    Settings,
    ShieldCheck,
    Siren,
    TableProperties,
    User,
    Users,
    Wrench,
} from 'lucide-react';
import {activeDestination} from '@/lib/navigation';
import type {
    AdminNavGroup,
    CustomerNavBadge,
    CustomerNavGroup,
    OperationsNavGroup,
    SidebarRouteItem,
} from '@/types/ui';

export type {
    AdminNavGroup,
    CustomerNavBadge,
    CustomerNavGroup,
    OperationsNavGroup,
    SidebarRouteItem,
};

/**
 * Cấu hình tập trung toàn bộ đường dẫn (routes) hiển thị trên thanh Sidebar của 3 cổng:
 * 1. Admin Portal (`ADMIN_SIDEBAR_GROUPS`, `ADMIN_SIDEBAR_ROUTES`)
 * 2. Operations Portal (`OPERATIONS_SIDEBAR_GROUPS`, `OPERATIONS_SIDEBAR_ROUTES`)
 * 3. Customer Portal (`CUSTOMER_SIDEBAR_GROUPS`, `CUSTOMER_SIDEBAR_ROUTES`)
 *
 * Bạn chỉ cần thêm / sửa / sắp xếp các mục tại file này để quản lý toàn bộ Sidebar.
 */

// ============================================================================
// 1. ADMIN PORTAL SIDEBAR ROUTES (7 Nhóm Chuyên biệt)
// ============================================================================
// The admin sidebar lists admin pages only; customer and operations pages are reached through
// the portal switcher, so each portal keeps its own navigation.
export const ADMIN_SIDEBAR_GROUPS: readonly AdminNavGroup[] = [
    'overview',
    'commerce',
    'access',
    'training',
    'intelligence',
    'security',
    'system',
    'infrastructure',
] as const;

export const ADMIN_SIDEBAR_ROUTES: SidebarRouteItem<AdminNavGroup>[] = [
    // 1. Nhóm: Tổng quan & Phân tích (overview)
    {
        href: '/admin/dashboard',
        key: 'dashboard',
        group: 'overview',
        icon: LayoutDashboard,
        permission: 'DASHBOARD_READ',
    },
    {
        href: '/admin/reports',
        key: 'reports',
        group: 'overview',
        icon: BarChart3,
        permission: 'DASHBOARD_READ',
    },
    {
        href: '/admin/notifications',
        key: 'notifications',
        group: 'overview',
        icon: Inbox,
        permission: 'DASHBOARD_READ',
    },
    {
        href: '/admin/fleet-map',
        key: 'fleetMap',
        defaultLabel: 'Bản đồ đội bay',
        group: 'overview',
        icon: MapIcon,
        permission: 'MISSION_VIEW_ALL',
    },

    // 5. Nhóm: Tài chính & Hạn mức (commerce) — Đã tách riêng 3 trang con chuyên biệt
    {
        href: '/admin/services',
        key: 'services',
        group: 'commerce',
        icon: Package,
        permission: 'MISSION_CONFIRM',
    },
    {
        href: '/admin/billing/plans',
        key: 'billingPlans',
        group: 'commerce',
        icon: CreditCard,
        permission: 'USER_MANAGE',
        aliases: ['/admin/billing'],
    },
    {
        href: '/admin/billing/quotas',
        key: 'billingQuotas',
        group: 'commerce',
        icon: Gauge,
        permission: 'USER_MANAGE',
    },
    {
        href: '/admin/billing/invoices',
        key: 'billingInvoices',
        group: 'commerce',
        icon: FileSpreadsheet,
        permission: 'USER_MANAGE',
    },
    {
        href: '/admin/billing/transactions',
        key: 'billingTransactions',
        group: 'commerce',
        icon: ReceiptText,
        permission: 'USER_MANAGE',
    },
    {
        href: '/admin/billing/outbox',
        key: 'billingOutbox',
        group: 'commerce',
        icon: Inbox,
        permission: 'USER_MANAGE',
    },

    // 4. Nhóm: Người dùng & Phân quyền (access) — Đã tách riêng 5 trang con chuyên biệt
    {
        href: '/admin/users',
        key: 'users',
        group: 'access',
        icon: Users,
        permission: 'USER_READ',
    },
    {
        href: '/admin/access-control',
        key: 'accessControl',
        group: 'access',
        icon: ShieldCheck,
        permission: 'PERMISSION_MANAGE',
    },
    {
        href: '/admin/access-control/role-templates',
        key: 'roleTemplates',
        group: 'access',
        icon: KeyRound,
        permission: 'PERMISSION_MANAGE',
        aliases: ['/admin/role-templates'],
    },
    {
        href: '/admin/access-control/role-matrix',
        key: 'roleMatrix',
        group: 'access',
        icon: TableProperties,
        permission: 'PERMISSION_MANAGE',
        aliases: ['/admin/role-matrix'],
    },
    {
        href: '/admin/access-control/permissions',
        key: 'permissions',
        group: 'access',
        icon: Lock,
        permission: 'PERMISSION_MANAGE',
        aliases: ['/admin/permissions'],
    },

    // 5. Nhóm: Đào tạo & SOP (training) — mỗi cổng một mục; /admin/training chuyển về mục khách hàng.
    {
        href: '/admin/training/customer',
        key: 'trainingCustomer',
        defaultLabel: 'Đào tạo khách hàng',
        group: 'training',
        icon: BookOpenCheck,
    },
    {
        href: '/admin/training/operations',
        key: 'trainingOperations',
        defaultLabel: 'SOP điều hành',
        group: 'training',
        icon: Crosshair,
    },
    {
        href: '/admin/training/admin',
        key: 'trainingAdmin',
        defaultLabel: 'Quy chuẩn quản trị',
        group: 'training',
        icon: FileCheck2,
    },

    // 6. Nhóm: Trí tuệ Nhân tạo & Tích hợp (intelligence)
    {
        href: '/admin/ai-router',
        key: 'aiRouter',
        group: 'intelligence',
        icon: Router,
        permission: 'PERMISSION_MANAGE',
    },
    {
        href: '/admin/ai-router/conversations',
        key: 'aiConversations',
        group: 'intelligence',
        icon: MessagesSquare,
        permission: 'PERMISSION_MANAGE',
    },
    {
        href: '/admin/webhooks',
        key: 'webhooks',
        group: 'intelligence',
        icon: Radio,
        permission: 'USER_MANAGE',
    },

    // 7. Nhóm: Bảo mật (security) — phiên, chính sách đăng nhập, bí mật, khóa thiết bị
    {
        href: '/admin/security/sessions',
        key: 'securitySessions',
        group: 'security',
        icon: ShieldCheck,
        permission: 'PERMISSION_MANAGE',
        aliases: ['/admin/security'],
    },
    {
        href: '/admin/security/policy',
        key: 'securityPolicy',
        group: 'security',
        icon: FileLock2,
        permission: 'PERMISSION_MANAGE',
    },
    {
        href: '/admin/security/secrets',
        key: 'securitySecrets',
        group: 'security',
        icon: KeyRound,
        permission: 'PERMISSION_MANAGE',
    },
    {
        href: '/admin/device-keys',
        key: 'deviceKeys',
        group: 'security',
        icon: KeyRound,
        permission: 'PERMISSION_MANAGE',
    },

    // 8. Nhóm: Hệ thống & Kiểm toán (system)
    {
        href: '/admin/alerts',
        key: 'alerts',
        group: 'system',
        icon: Siren,
        permission: 'DASHBOARD_READ',
    },
    {
        href: '/admin/settings',
        key: 'settings',
        group: 'system',
        icon: Settings,
        permission: 'USER_MANAGE',
    },
    {
        href: '/admin/audit-logs',
        key: 'auditLogs',
        group: 'system',
        icon: ScrollText,
        permission: 'AUDIT_READ',
    },

    // 9. Nhóm: Hạ tầng (infrastructure) — chỉ xem; thao tác máy chủ làm qua SSH theo deploy/DEPLOY.md
    {
        href: '/admin/infrastructure',
        key: 'infrastructure',
        group: 'infrastructure',
        icon: Server,
        permission: 'PERMISSION_MANAGE',
    },
    {
        href: '/admin/system-health',
        key: 'systemHealth',
        group: 'infrastructure',
        icon: Activity,
        permission: 'PERMISSION_MANAGE',
    },
    {
        href: '/admin/infrastructure/deployment',
        key: 'infrastructureDeployment',
        group: 'infrastructure',
        icon: Rocket,
        permission: 'PERMISSION_MANAGE',
    },
    {
        href: '/admin/infrastructure/backups',
        key: 'infrastructureBackups',
        group: 'infrastructure',
        icon: Archive,
        permission: 'PERMISSION_MANAGE',
    },
    {
        href: '/admin/infrastructure/storage',
        key: 'infrastructureStorage',
        group: 'infrastructure',
        icon: HardDrive,
        permission: 'PERMISSION_MANAGE',
    },
    {
        href: '/admin/files',
        key: 'files',
        group: 'infrastructure',
        icon: FolderOpen,
        permission: 'PERMISSION_MANAGE',
    },
    {
        href: '/admin/infrastructure/database',
        key: 'infrastructureDatabase',
        group: 'infrastructure',
        icon: Database,
        permission: 'PERMISSION_MANAGE',
    },
    {
        href: '/admin/infrastructure/email',
        key: 'infrastructureEmail',
        group: 'infrastructure',
        icon: Mail,
        permission: 'PERMISSION_MANAGE',
    },
];

// ============================================================================
// 2. OPERATIONS PORTAL SIDEBAR ROUTES
// ============================================================================
export const OPERATIONS_SIDEBAR_GROUPS: readonly OperationsNavGroup[] = [
    'command',
    'missions',
    'assets',
    'monitoring',
] as const;

export const OPERATIONS_SIDEBAR_ROUTES: SidebarRouteItem<OperationsNavGroup>[] = [
    // Nhóm: Chỉ huy & Tác chiến (command)
    {
        href: '/operations/overview',
        key: 'overview',
        group: 'command',
        icon: LayoutDashboard,
        permission: 'DASHBOARD_READ',
    },
    {
        href: '/operations/sar-cockpit',
        key: 'sar',
        group: 'command',
        icon: Crosshair,
        permission: 'MISSION_VIEW',
        aliases: ['/operations/flight-ops'],
    },

    // Nhóm: Điều phối nhiệm vụ (missions)
    {
        href: '/operations/dispatch/missions',
        key: 'dispatchMissions',
        group: 'missions',
        icon: Activity,
        permission: 'MISSION_VIEW_ALL',
        aliases: ['/operations/missions/dispatch', '/operations/admin/missions'],
    },
    {
        href: '/operations/assigned-missions',
        key: 'assignedMissions',
        group: 'missions',
        icon: ClipboardList,
        permission: 'MISSION_VIEW',
        aliases: ['/operations/missions/assigned', '/operations/operator/missions'],
    },

    // Nhóm: Trạm & Đội bay (assets)
    {
        href: '/operations/stations',
        key: 'stations',
        group: 'assets',
        icon: MapPinned,
        permission: 'STATION_READ',
    },
    {
        href: '/operations/uavs',
        key: 'uavs',
        group: 'assets',
        icon: PlaneTakeoff,
        permission: 'UAV_READ',
    },
    {
        href: '/operations/maintenance',
        key: 'maintenance',
        group: 'assets',
        icon: Wrench,
        permission: 'UAV_MANAGE',
    },
    {
        href: '/operations/inventory',
        key: 'inventory',
        group: 'assets',
        icon: Boxes,
        permission: 'INVENTORY_READ',
    },

    // Nhóm: Giám sát & Nhật ký (monitoring)
    {
        href: '/operations/media',
        key: 'media',
        group: 'monitoring',
        icon: FileKey2,
        permission: 'MEDIA_READ',
    },
    {
        href: '/operations/notifications',
        key: 'notifications',
        group: 'monitoring',
        icon: Bell,
    },
    {
        href: '/operations/audit',
        key: 'audit',
        group: 'monitoring',
        icon: Activity,
        permission: 'AUDIT_READ',
    },
    {
        href: '/operations/training',
        key: 'training',
        defaultLabel: 'Đào tạo & SOP UAV',
        group: 'monitoring',
        icon: GraduationCap,
    },
];

// ============================================================================
// 3. CUSTOMER PORTAL SIDEBAR ROUTES
// ============================================================================
export const CUSTOMER_SIDEBAR_GROUPS: readonly CustomerNavGroup[] = [
    'overview',
    'missions',
    'services',
    'support',
] as const;

// Grouped by what the customer is doing: checking in, running flights, buying, getting help.
export const CUSTOMER_SIDEBAR_ROUTES: SidebarRouteItem<CustomerNavGroup>[] = [
    // Nhóm: Tổng quan (overview)
    {
        href: '/customer/dashboard',
        key: 'dashboard',
        defaultLabel: 'Tổng quan',
        group: 'overview',
        icon: LayoutDashboard,
        permission: 'MISSION_VIEW',
    },
    {
        href: '/customer/notifications',
        key: 'notifications',
        defaultLabel: 'Thông báo',
        group: 'overview',
        icon: Bell,
        badge: 'unreadNotifications',
    },

    // Nhóm: Nhiệm vụ bay (missions)
    {
        href: '/customer/missions/create',
        key: 'createRequest',
        defaultLabel: 'Tạo yêu cầu',
        group: 'missions',
        icon: CirclePlus,
        permission: 'MISSION_CREATE',
    },
    {
        href: '/customer/missions',
        key: 'missions',
        defaultLabel: 'Nhiệm vụ của tôi',
        group: 'missions',
        icon: Activity,
        permission: 'MISSION_VIEW',
        badge: 'activeMissions',
    },

    // Nhóm: Dịch vụ & thanh toán (services)
    {
        href: '/customer/services',
        key: 'services',
        defaultLabel: 'Dịch vụ UAV',
        group: 'services',
        icon: Boxes,
        permission: 'MISSION_VIEW',
    },
    {
        href: '/customer/billing',
        key: 'billing',
        defaultLabel: 'Gói cước & hóa đơn',
        group: 'services',
        icon: CreditCard,
        badge: 'pendingInvoices',
    },

    // Nhóm: Hỗ trợ & tài khoản (support)
    {
        href: '/customer/training',
        key: 'training',
        defaultLabel: 'Hướng dẫn sử dụng',
        group: 'support',
        icon: GraduationCap,
    },
    {
        href: '/customer/profile',
        key: 'profile',
        defaultLabel: 'Tài khoản',
        group: 'support',
        icon: User,
    },
];

/**
 * Tìm mục Sidebar đang active dựa trên pathname hiện tại, hỗ trợ tự động ánh xạ
 * các đường dẫn alias (ví dụ `/admin/role-templates` -> `/admin/access-control/role-templates`)
 * và ưu tiên đường dẫn con cụ thể nhất.
 */
export function resolveSidebarActiveItem<T extends { href: string; aliases?: string[] }>(
    visibleItems: readonly T[],
    pathname: string,
    activeResource?: string,
): T | undefined {
    // An alias only claims a path that no item links to directly, so /admin/billing/quotas stays
    // with its own entry instead of the plans entry that aliases /admin/billing.
    const ownsDirectly = visibleItems.some(item => pathname === item.href || pathname.startsWith(`${item.href}/`));
    const ownerPath = ownsDirectly ? undefined : visibleItems.find(item =>
        item.aliases?.some(alias => pathname === alias || pathname.startsWith(`${alias}/`)),
    )?.href;
    return activeDestination(visibleItems, ownerPath ?? pathname, activeResource);
}
