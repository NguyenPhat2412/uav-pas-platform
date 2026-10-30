import Link from 'next/link';
import {Check, Star} from 'lucide-react';
import {publicPricingPlans} from "@/features/marketing/content/home-content";
import {FlatTag} from "@/features/marketing/components/flat-tag";

/**
 * The three subscription plans, shared by the home page and /pricing. The featured plan is lifted, ringed in red
 * and gets a ribbon, a red price and the only solid button, so it is the first thing the eye lands on.
 * `detailed` adds the audience line, the Edge AI row and every highlight for the full pricing page.
 */
export function PlanCards({detailed = false}: { detailed?: boolean }) {
    return (
        <div className="grid grid-cols-1 items-stretch gap-6 pt-4 lg:grid-cols-3 lg:gap-5">
            {publicPricingPlans.map((plan) => {
                const featured = !!plan.featured;
                return (
                    <article
                        key={plan.code}
                        className={`relative flex flex-col rounded-panel bg-card text-foreground transition-transform ${
                            featured
                                ? 'z-10 border-2 border-primary shadow-2xl shadow-primary/25 lg:-translate-y-4 lg:scale-[1.03]'
                                : 'border border-border shadow-lg'
                        }`}
                    >
                        {featured && (
                            <p className="absolute -top-3.5 left-1/2 m-0 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap bg-primary px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-primary-foreground shadow-md">
                                <Star size={12} className="fill-current" aria-hidden="true"/>{plan.badge}
                            </p>
                        )}
                        <div className={`flex flex-1 flex-col gap-4 p-6 ${featured ? 'pt-8' : ''}`}>
                            <div className="flex items-center justify-between gap-2">
                                {featured ? <span/> : <FlatTag>{plan.badge}</FlatTag>}
                                <span className="font-mono text-xs font-bold text-slate-400">{plan.code}</span>
                            </div>
                            <div>
                                <h3 className="m-0 text-xl font-extrabold text-foreground">{plan.name}</h3>
                                <p className="m-0 mt-1 text-xs font-semibold text-slate-500">{plan.subtitle}</p>
                            </div>
                            <div className={`border-y py-4 ${featured ? 'border-primary/20' : 'border-slate-100'}`}>
                                <p className={`m-0 text-4xl font-black tracking-tight tabular-nums ${featured ? 'text-primary' : 'text-foreground'}`}>
                                    {plan.monthlyVnd}
                                </p>
                                <p className="m-0 mt-1 text-xs text-slate-500">{plan.billingCycle}</p>
                                <dl className="m-0 mt-3 grid grid-cols-2 gap-2 text-xs">
                                    <div className="bg-slate-50 px-3 py-2">
                                        <dt className="text-[11px] font-semibold text-slate-500">Giờ bay</dt>
                                        <dd className="m-0 font-extrabold text-foreground">{plan.flightHoursQuota}</dd>
                                    </div>
                                    <div className="bg-slate-50 px-3 py-2">
                                        <dt className="text-[11px] font-semibold text-slate-500">Đội bay</dt>
                                        <dd className="m-0 font-extrabold text-uav-blue">{plan.concurrentUavs}</dd>
                                    </div>
                                    {detailed && (
                                        <div className="col-span-2 bg-slate-50 px-3 py-2">
                                            <dt className="text-[11px] font-semibold text-slate-500">Edge AI & SAR</dt>
                                            <dd className={`m-0 font-extrabold ${plan.sarAiIncluded ? 'text-success' : 'text-slate-500'}`}>
                                                {plan.sarAiIncluded ? 'Đã bao gồm (Kria KV260)' : 'Không bao gồm'}
                                            </dd>
                                        </div>
                                    )}
                                </dl>
                            </div>
                            {detailed && <p className="m-0 text-xs leading-relaxed text-slate-600">{plan.targetAudience}</p>}
                            <ul className="m-0 flex-1 list-none space-y-2 p-0 text-sm text-slate-700">
                                {(detailed ? plan.highlights : plan.highlights.slice(0, 3)).map((item) => (
                                    <li key={item} className="flex items-start gap-2">
                                        <Check size={16} className={`mt-0.5 shrink-0 ${featured ? 'text-primary' : 'text-slate-400'}`} aria-hidden="true"/>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                            <Link
                                href="/?auth=register"
                                className={`inline-flex min-h-11 w-full items-center justify-center rounded-control px-4 py-2.5 text-sm font-bold transition-colors ${
                                    featured
                                        ? 'bg-primary text-primary-foreground shadow-md hover:bg-primary-hover'
                                        : 'border border-primary text-primary hover:bg-uav-red-light'
                                }`}
                            >
                                Chọn {plan.name.replace(/\s*\(.*\)$/, '')}
                            </Link>
                        </div>
                    </article>
                );
            })}
        </div>
    );
}
