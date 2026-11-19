import {MapPin, PackageCheck, Search, ShieldCheck} from 'lucide-react';
import {keepVietnamesePhrases} from '@/lib/typography';
import {pageMetadata} from '@/content/marketing/metadata';
import {CustomerCta} from '@/components/marketing/PublicPage';
import {HomeSimulationHighlightSection} from '@/components/marketing/HomeSimulationHighlightSection';

export const metadata = pageMetadata(
    'Cách hoạt động — Quy trình 4 bước UAV PAS',
    'Quy trình 4 bước đặt dịch vụ bay UAV: chọn dịch vụ, vẽ vùng bay và chọn lịch, UAV PAS điều phối đội bay đã xác minh, theo dõi chuyến bay mô phỏng và nhận kết quả.',
    '/how-it-works',
    true,
);

const steps = [
    {
        number: '01',
        role: 'Khách hàng',
        icon: Search,
        title: 'Chọn dịch vụ bay phù hợp',
        short: 'Tìm dịch vụ khảo sát, quay chụp, thu thập dữ liệu hoặc thuê UAV theo khu vực. Đơn giá hiển thị ở chế độ minh hoạ.',
    },
    {
        number: '02',
        role: 'Không gian Dự án',
        icon: MapPin,
        title: 'Vẽ vùng bay & chọn lịch',
        short: 'Tạo dự án, khoanh đa giác khu vực bay trên bản đồ số và chọn lịch bay một lần, hàng tuần hoặc hàng tháng.',
    },
    {
        number: '03',
        role: 'Điều phối UAV PAS',
        icon: ShieldCheck,
        title: 'UAV PAS giao đội bay đã xác minh',
        short: 'Nền tảng thẩm định đơn và điều phối cho đối tác đội bay phù hợp. Đội bay phân công kỹ sư và UAV sẵn sàng.',
    },
    {
        number: '04',
        role: 'Theo dõi & Nghiệm thu',
        icon: PackageCheck,
        title: 'Theo dõi chuyến bay mô phỏng & nhận kết quả',
        short: 'Xem đường bay mô phỏng, các mốc trạng thái giao hàng, tải tệp bàn giao và đánh giá sao sau khi hoàn tất.',
    },
] as const;

const orderStages = [
    {step: '1', name: 'Chờ xác nhận'},
    {step: '2', name: 'Chờ bay'},
    {step: '3', name: 'Đang bay mô phỏng'},
    {step: '4', name: 'Đã bàn giao'},
    {step: '5', name: 'Đánh giá sao'},
] as const;

export default function HowItWorksPage() {
    return (
        <div className="bg-card text-foreground">
            <section className="border-b border-border bg-slate-50/70 py-10 sm:py-14">
                <div className="mx-auto w-full max-w-[1280px] space-y-6 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-2xl space-y-2">
                        <p className="m-0 text-xs font-extrabold uppercase tracking-widest text-primary">
                            Quy trình thực hiện · 4 bước rõ ràng
                        </p>
                        <h1 className="m-0 text-2xl font-black tracking-tight text-foreground sm:text-4xl">
                            {keepVietnamesePhrases('Đặt dịch vụ, UAV PAS điều phối đội bay đã xác minh.')}
                        </h1>
                        <p className="m-0 text-sm leading-relaxed text-slate-600">
                            Khách chọn dịch vụ theo dự án, nền tảng đứng giữa điều phối đội bay, theo dõi hành trình mô phỏng và bàn giao kết quả.
                        </p>
                    </div>

                    <ol className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
                        {steps.map(({number, role, icon: Icon, title, short}) => (
                            <li key={number} className="flex flex-col gap-3 rounded-panel border border-slate-200 bg-white p-5 shadow-2xs">
                                <div className="flex items-center justify-between">
                                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-uav-red-light text-primary">
                                        <Icon size={19} aria-hidden="true"/>
                                    </span>
                                    <span className="font-mono text-xs font-extrabold text-slate-400">
                                        {number} · {role}
                                    </span>
                                </div>
                                <h2 className="m-0 text-base font-bold text-slate-900">{keepVietnamesePhrases(title)}</h2>
                                <p className="m-0 text-xs leading-relaxed text-slate-600">{short}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            <HomeSimulationHighlightSection/>

            <section className="py-10 sm:py-14">
                <div className="mx-auto w-full max-w-[1280px] space-y-8 px-4 sm:px-6 lg:px-8">
                    <div className="space-y-4">
                        <h2 className="m-0 text-xl font-black tracking-tight text-foreground sm:text-2xl">
                            5 mốc theo dõi đơn hàng trực quan
                        </h2>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                            {orderStages.map(stage => (
                                <div key={stage.step} className="flex flex-col items-center rounded-panel border border-border bg-slate-50/70 p-4 text-center">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-mono text-xs font-black text-white">
                                        {stage.step}
                                    </span>
                                    <span className="mt-2 text-xs font-bold text-foreground">{stage.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <CustomerCta/>
                </div>
            </section>
        </div>
    );
}
