import type {LucideIcon} from 'lucide-react';
import {
    Activity,
    CirclePlus,
    BarChart3,
    Bell,
    Boxes,
    ClipboardList,
    CreditCard,
    Crosshair,
    FileKey2,
    Inbox,
    KeyRound,
    LayoutDashboard,
    Lock,
    Map as MapIcon,
    MapPinned,
    Package,
    Plane,
    PlaneTakeoff,
    Radio,
    Router,
    ScrollText,
    Settings,
    ShieldCheck,
    TableProperties,
    User,
    Users,
    Wrench,
} from 'lucide-react';
import {activeDestination} from '@/components/shared/navigation';

/**
 * Cấu hình tập trung toàn bộ đường dẫn (routes) hiển thị trên thanh Sidebar của 3 cổng:
 * 1. Admin Portal (`ADMIN_SIDEBAR_GROUPS`, `ADMIN_SIDEBAR_ROUTES`)
 * 2. Operations Portal (`OPERATIONS_SIDEBAR_GROUPS`, `OPERATIONS_SIDEBAR_ROUTES`)
 * 3. Customer Portal (`CUSTOMER_SIDEBAR_GROUPS`, `CUSTOMER_SIDEBAR_ROUTES`)
 *
 * Bạn chỉ cần thêm / sửa / sắp xếp các mục tại file này để quản lý toàn bộ Sidebar.
 */

export type AdminNavGroup = 'overview' | 'fleet' | 'access' | 'system';
export type OperationsNavGroup = 'command' | 'missions' | 'assets' | 'monitoring';
export type CustomerNavGroup = 'operations' | 'finance' | 'account';
export type CustomerNavBadge = 'activeMissions' | 'pendingInvoices' | 'unreadNotifications';

export interface SidebarRouteItem<G extends string = string> {
    href: string;
    key: string;
    group: G;
    icon: LucideIcon;
    permission?: string;
    /** Các URL phụ / đường dẫn cũ sẽ tự động kích hoạt (highlight) mục Sidebar này */
    aliases?: string[];
    defaultLabel?: string;
    badge?: CustomerNavBadge;
}

// ============================================================================
// 1. ADMIN PORTAL SIDEBAR ROUTES
// ============================================================================
export const ADMIN_SIDEBAR_GROUPS: readonly AdminNavGroup[] = [
    'overview',
    'fleet',
    'access',
    'system',
] as const;

export const ADMIN_SIDEBAR_ROUTES: SidebarRouteItem<AdminNavGroup>[] = [
    // Nhóm: Tổng quan (overview)
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

    // Nhóm: Đội bay (fleet)
    {
        href: '/admin/fleet-map',
        key: 'fleetMap',
        group: 'fleet',
        icon: MapIcon,
        permission: 'UAV_READ',
    },
    {
        href: '/admin/uavs',
        key: 'uavs',
        group: 'fleet',
        icon: Plane,
        permission: 'UAV_READ',
    },

    // Nhóm: Người dùng & Phân quyền (access) — Đã tách riêng từng trang con trên Sidebar
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

    // Nhóm: Hệ thống (system)
    {
        href: '/admin/services',
        key: 'services',
        group: 'system',
        icon: Package,
        permission: 'MISSION_CONFIRM',
    },
    {
        href: '/admin/billing',
        key: 'billing',
        group: 'system',
        icon: CreditCard,
        permission: 'PERMISSION_MANAGE',
    },
    {
        href: '/admin/webhooks',
        key: 'webhooks',
        group: 'system',
        icon: Radio,
        permission: 'USER_MANAGE',
    },
    {
        href: '/admin/ai-router',
        key: 'aiRouter',
        group: 'system',
        icon: Router,
        permission: 'PERMISSION_MANAGE',
    },
    {
        href: '/admin/settings',
        key: 'settings',
        group: 'system',
        icon: Settings,
        permission: 'PERMISSION_MANAGE',
    },
    {
        href: '/admin/system-health',
        key: 'systemHealth',
        group: 'system',
        icon: Activity,
        permission: 'PERMISSION_MANAGE',
    },
    {
        href: '/admin/audit-logs',
        key: 'auditLogs',
        group: 'system',
        icon: ScrollText,
        permission: 'AUDIT_READ',
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
];

// ============================================================================
// 3. CUSTOMER PORTAL SIDEBAR ROUTES
// ============================================================================
export const CUSTOMER_SIDEBAR_GROUPS: readonly CustomerNavGroup[] = [
    'operations',
    'finance',
    'account',
] as const;

export const CUSTOMER_SIDEBAR_ROUTES: SidebarRouteItem<CustomerNavGroup>[] = [
    // Nhóm: Dịch vụ & Nhiệm vụ (operations)
    {
        href: '/customer/dashboard',
        key: 'dashboard',
        defaultLabel: 'Tổng quan',
        group: 'operations',
        icon: LayoutDashboard,
        permission: 'MISSION_VIEW',
    },
    {
        href: '/customer/missions',
        key: 'missions',
        defaultLabel: 'Nhiệm vụ của tôi',
        group: 'operations',
        icon: Activity,
        permission: 'MISSION_VIEW',
        badge: 'activeMissions',
    },
    {
        href: '/customer/missions/create',
        key: 'createRequest',
        defaultLabel: 'Tạo yêu cầu',
        group: 'operations',
        icon: CirclePlus,
        permission: 'MISSION_CREATE',
    },
    {
        href: '/customer/services',
        key: 'services',
        defaultLabel: 'Dịch vụ UAV',
        group: 'operations',
        icon: Boxes,
        permission: 'MISSION_VIEW',
    },

    // Nhóm: Tài chính (finance)
    {
        href: '/customer/billing',
        key: 'billing',
        defaultLabel: 'Gói cước & Hóa đơn',
        group: 'finance',
        icon: CreditCard,
        badge: 'pendingInvoices',
    },

    // Nhóm: Tài khoản (account)
    {
        href: '/customer/notifications',
        key: 'notifications',
        defaultLabel: 'Thông báo',
        group: 'account',
        icon: Bell,
        badge: 'unreadNotifications',
    },
    {
        href: '/customer/profile',
        key: 'profile',
        defaultLabel: 'Tài khoản',
        group: 'account',
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
    const ownerPath = visibleItems.find(item =>
        item.aliases?.some(alias => pathname === alias || pathname.startsWith(`${alias}/`)),
    )?.href;
    return activeDestination(visibleItems, ownerPath ?? pathname, activeResource);
}
