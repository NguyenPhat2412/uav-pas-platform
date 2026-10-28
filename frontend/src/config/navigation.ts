import {
    Activity,
    BarChart3,
    Boxes,
    ClipboardList,
    CreditCard,
    Crosshair,
    FileKey2,
    KeyRound,
    LayoutDashboard,
    MapPinned,
    PlaneTakeoff,
    Radio,
    Settings,
    ShieldCheck,
    User,
    Users,
    Wrench,
    type LucideIcon,
} from 'lucide-react';

export interface NavItem {
    href: string;
    key: string;
    defaultLabel: string;
    icon: LucideIcon;
    permission?: string;
}

export interface NavSection {
    id: 'customer' | 'operations' | 'admin';
    key: string;
    defaultTitle: string;
    items: NavItem[];
}

export const portalSections: NavSection[] = [
    {
        id: 'customer',
        key: 'customerSection',
        defaultTitle: 'DỊCH VỤ & KHÁCH HÀNG',
        items: [
            {
                href: "/customer/dashboard",
                key: 'dashboard',
                defaultLabel: 'Tổng quan khách hàng',
                icon: LayoutDashboard,
                permission: 'MISSION_VIEW'
            },
            {
                href: "/customer/services",
                key: 'services',
                defaultLabel: 'Dịch vụ UAV',
                icon: Boxes,
                permission: 'MISSION_VIEW'
            },
            {
                href: "/customer/missions",
                key: 'missions',
                defaultLabel: 'Nhiệm vụ của tôi',
                icon: Activity,
                permission: 'MISSION_VIEW'
            },
            {
                href: "/customer/billing",
                key: 'billing',
                defaultLabel: 'Gói cước & Hóa đơn',
                icon: CreditCard,
                permission: 'MISSION_VIEW'
            },
            {
                href: "/customer/profile",
                key: 'profile',
                defaultLabel: 'Tài khoản cá nhân',
                icon: User,
            },
        ],
    },
    {
        id: 'operations',
        key: 'operationsSection',
        defaultTitle: 'TÁC CHIẾN & VẬN HÀNH',
        items: [
            {
                href: "/operations/overview",
                key: 'overview',
                defaultLabel: 'Tổng quan vận hành',
                icon: LayoutDashboard,
                permission: 'DASHBOARD_READ'
            },
            {
                href: "/operations/sar-cockpit",
                key: 'sar',
                defaultLabel: 'Tác chiến AI & SAR',
                icon: Crosshair,
                permission: 'MISSION_VIEW'
            },
            {
                href: "/operations/dispatch/missions",
                key: 'dispatchMissions',
                defaultLabel: 'Điều phối nhiệm vụ',
                icon: Activity,
                permission: 'MISSION_VIEW_ALL'
            },
            {
                href: "/operations/assigned-missions",
                key: 'assignedMissions',
                defaultLabel: 'Nhiệm vụ được giao',
                icon: ClipboardList,
                permission: 'MISSION_VIEW'
            },
            {
                href: "/operations/stations",
                key: 'stations',
                defaultLabel: 'Trạm mặt đất',
                icon: MapPinned,
                permission: 'STATION_READ'
            },
            {
                href: "/operations/uavs",
                key: 'uavs',
                defaultLabel: 'Đội UAV',
                icon: PlaneTakeoff,
                permission: 'UAV_READ'
            },
            {
                href: "/operations/maintenance",
                key: 'maintenance',
                defaultLabel: 'Bảo trì và sửa chữa',
                icon: Wrench,
                permission: 'UAV_MANAGE'
            },
            {
                href: "/operations/inventory",
                key: 'inventory',
                defaultLabel: 'Kho thiết bị',
                icon: Boxes,
                permission: 'INVENTORY_READ'
            },
            {
                href: "/operations/media",
                key: 'media',
                defaultLabel: 'Tệp kết quả',
                icon: FileKey2,
                permission: 'MEDIA_READ'
            },
            {
                href: "/operations/audit",
                key: 'audit',
                defaultLabel: 'Nhật ký vận hành',
                icon: Activity,
                permission: 'AUDIT_READ'
            },
        ],
    },
    {
        id: 'admin',
        key: 'adminSection',
        defaultTitle: 'QUẢN TRỊ HỆ THỐNG',
        items: [
            {
                href: "/admin/dashboard",
                key: 'dashboard',
                defaultLabel: 'Tổng quan quản trị',
                icon: LayoutDashboard,
                permission: 'DASHBOARD_READ'
            },
            {
                href: "/admin/users",
                key: 'users',
                defaultLabel: 'Người dùng',
                icon: Users,
                permission: 'USER_READ'
            },
            {
                href: "/admin/access-control",
                key: 'accessControl',
                defaultLabel: 'Kiểm soát truy cập',
                icon: ShieldCheck,
                permission: 'PERMISSION_MANAGE'
            },
            {
                href: "/admin/role-templates",
                key: 'roleTemplates',
                defaultLabel: 'Mẫu vai trò',
                icon: KeyRound,
                permission: 'PERMISSION_MANAGE'
            },
            {
                href: "/admin/permissions",
                key: 'permissions',
                defaultLabel: 'Danh mục quyền',
                icon: FileKey2,
                permission: 'PERMISSION_MANAGE'
            },
            {
                href: "/admin/billing",
                key: 'billing',
                defaultLabel: 'Gói cước & Hạn mức',
                icon: CreditCard,
                permission: 'PERMISSION_MANAGE'
            },
            {
                href: "/admin/reports",
                key: 'reports',
                defaultLabel: 'Báo cáo & Thống kê',
                icon: BarChart3,
                permission: 'DASHBOARD_READ'
            },
            {
                href: "/admin/webhooks",
                key: 'webhooks',
                defaultLabel: 'Webhooks & Tích hợp',
                icon: Radio,
                permission: 'USER_MANAGE'
            },
            {
                href: "/admin/settings",
                key: 'settings',
                defaultLabel: 'Cấu hình hệ thống',
                icon: Settings,
                permission: 'PERMISSION_MANAGE'
            },
            {
                href: "/admin/audit-logs",
                key: 'auditLogs',
                defaultLabel: 'Nhật ký quản trị',
                icon: FileKey2,
                permission: 'AUDIT_READ'
            },
        ],
    },
];

export function getVisibleSections(
    can: (code: string) => boolean,
    permissionsReady: boolean,
    allowedPortalIds?: ('customer' | 'operations' | 'admin')[]
): { section: NavSection; visibleItems: NavItem[] }[] {
    const candidateSections = allowedPortalIds
        ? portalSections.filter(s => allowedPortalIds.includes(s.id))
        : portalSections;

    return candidateSections
        .map(section => ({
            section,
            visibleItems: section.items.filter(item => {
                if (!item.permission) return true;
                return permissionsReady && can(item.permission);
            }),
        }))
        .filter(entry => entry.visibleItems.length > 0);
}
