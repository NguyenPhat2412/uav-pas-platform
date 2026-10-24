import {pageMetadata} from "@/features/marketing/content/metadata";
import {steps} from "@/features/marketing/content/site-content";
import {CustomerCta, PublicPage} from "@/features/marketing/components/public-page";

export const metadata = pageMetadata("Quy trình thực hiện", "Theo dõi hành trình yêu cầu UAV từ tìm hiểu dịch vụ, xem xét bởi đội vận hành đến cập nhật tiến độ.", "/how-it-works", true);

export default function HowItWorksPage() {
    return (
        <PublicPage
            eyebrow="Quy trình thực hiện"
            title="Yêu cầu được xem xét trước khi triển khai nhiệm vụ."
            intro="Tìm hiểu dịch vụ, cung cấp yêu cầu và để đội vận hành điều phối bước tiếp theo."
            scene="pilots"
        >
            <ol className="divide-y divide-border rounded-2xl border border-border bg-card shadow-xs">
                {steps.map((step) => (
                    <li key={step.number} className="flex flex-col gap-3 p-6 sm:flex-row sm:items-start sm:gap-6">
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-uav-red-light tabular-nums text-xs font-extrabold text-primary">
                            {step.number}
                        </span>
                        <div className="space-y-1">
                            <h3 className="text-base font-bold text-foreground">{step.title}</h3>
                            <p className="text-sm leading-relaxed text-slate-600">{step.text}</p>
                        </div>
                    </li>
                ))}
            </ol>
            <CustomerCta/>
        </PublicPage>
    );
}
