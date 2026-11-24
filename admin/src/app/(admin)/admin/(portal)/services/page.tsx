import Link from 'next/link';
import {AdminPage} from '@/components/layout/AdminPage';
import {AdminServicesPanel} from "@/components/catalog/AdminServicesPanel";

export default function Page() {
    return <AdminPage title="admin.pages.services.title" permission="MISSION_CONFIRM" activeResource="services">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-panel border border-uav-blue/25 bg-uav-blue-light/60 px-4 py-3 text-xs text-slate-800">
            <span>
                <strong>Nhóm nghiệp vụ kỹ thuật cốt lõi (4 mã hệ thống).</strong> Để duyệt mở bán, quản lý đơn giá và các gói dịch vụ hiển thị cho khách hàng, sử dụng màn hình Sàn dịch vụ.
            </span>
            <Link
                href="/admin/marketplace/listings"
                className="inline-flex min-h-8 shrink-0 items-center rounded-control bg-primary px-3 font-bold whitespace-nowrap text-primary-foreground hover:bg-primary-hover"
            >
                Mở Duyệt dịch vụ Sàn →
            </Link>
        </div>
        <AdminServicesPanel/>
    </AdminPage>;
}
