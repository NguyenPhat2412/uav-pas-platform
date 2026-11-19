import Image from 'next/image';
import Link from 'next/link';
import {Compass, ShieldCheck, Users} from 'lucide-react';
import {keepVietnamesePhrases} from '@/lib/typography';
import {pageMetadata} from '@/content/marketing/metadata';
import {scenes} from '@/components/marketing/UavPhoto';
import {CustomerCta} from '@/components/marketing/PublicPage';

export const metadata = pageMetadata(
    'Giới thiệu UAV PAS',
    'UAV PAS là sản phẩm đồ án nghiên cứu và trình diễn kỹ thuật do Nguyễn Phát xây dựng: nền tảng điều phối dịch vụ bay UAV và mô phỏng chuyến bay.',
    '/about',
    true,
);

const pillars = [
    {
        icon: ShieldCheck,
        title: 'Nền tảng đứng giữa điều phối',
        description:
            'Khách hàng chọn dịch vụ và vẽ vùng bay cho dự án; UAV PAS thẩm định và giao đơn cho đối tác đội bay đã xác minh.',
    },
    {
        icon: Compass,
        title: 'Mô phỏng bay làm trọng tâm',
        description:
            'Hệ thống tập trung kiểm chứng luồng điều phối, mô phỏng lộ trình quét lưới, lệnh Fail-safe và theo dõi tiến độ trực quan.',
    },
    {
        icon: Users,
        title: '3 cổng làm việc tách bạch',
        description:
            'Cổng Khách hàng đặt dịch vụ theo dự án, Cổng Đối tác đội bay phân công kỹ sư & UAV, và Cổng Quản trị duyệt hồ sơ & giao đơn.',
    },
] as const;

export default function AboutPage() {
    return (
        <div className="bg-card text-foreground">
            <section className="relative flex min-h-[320px] w-full items-end overflow-hidden py-12 text-white">
                <Image
                    src={scenes.rentalFleet.src}
                    alt={scenes.rentalFleet.alt}
                    fill
                    sizes="100vw"
                    className="object-cover object-center"
                    preload
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/30"/>
                <div className="relative z-10 mx-auto w-full max-w-[1280px] space-y-3 px-4 sm:px-6 lg:px-8">
                    <p className="m-0 text-xs font-extrabold uppercase tracking-widest text-rose-400">
                        Về dự án UAV PAS
                    </p>
                    <h1 className="m-0 max-w-3xl text-2xl font-black leading-tight tracking-tight text-white sm:text-4xl">
                        {keepVietnamesePhrases('Nền tảng điều phối dịch vụ bay UAV & mô phỏng hành trình.')}
                    </h1>
                </div>
            </section>

            <section className="py-10 sm:py-14">
                <div className="mx-auto w-full max-w-[1280px] space-y-10 px-4 sm:px-6 lg:px-8">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 space-y-2.5">
                        <h2 className="m-0 text-lg font-extrabold text-slate-900">Phạm vi sản phẩm & tác giả</h2>
                        <p className="m-0 text-sm leading-relaxed text-slate-700">
                            UAV PAS là sản phẩm đồ án kỹ thuật phần mềm do <strong>Nguyễn Phát</strong> thiết kế và xây dựng. Hệ thống hoạt động như nền tảng trung gian điều phối dịch vụ bay UAV, kết hợp bộ mô phỏng bay trên bản đồ và quản trị đơn hàng đa cổng.
                        </p>
                        <p className="m-0 text-xs leading-relaxed text-slate-600">
                            Phạm vi đồ án không thực hiện bay thực địa và không kết nối thanh toán ngân hàng thật; mọi đơn giá, ký quỹ và ví đối soát đều được hiển thị ở chế độ minh hoạ để kiểm chứng trọn vẹn quy trình nghiệp vụ.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        {pillars.map(({icon: Icon, title, description}) => (
                            <article key={title} className="space-y-2.5 rounded-panel border border-slate-200 bg-white p-5 shadow-2xs">
                                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-uav-red-light text-primary">
                                    <Icon size={19} aria-hidden="true"/>
                                </span>
                                <h3 className="m-0 text-base font-bold text-slate-900">{title}</h3>
                                <p className="m-0 text-xs leading-relaxed text-slate-600">{description}</p>
                            </article>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-slate-200 bg-white px-5 py-4 text-xs text-slate-600">
                        <span>Nguồn ảnh công cộng được ghi công đầy đủ tại trang ghi nhận nguồn.</span>
                        <Link href="/credits" className="font-bold text-primary hover:underline">
                            Xem trang ghi nhận nguồn →
                        </Link>
                    </div>

                    <CustomerCta/>
                </div>
            </section>
        </div>
    );
}
