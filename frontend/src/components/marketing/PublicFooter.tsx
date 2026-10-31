'use client';

import Link from 'next/link';
import {customerUrl} from "@/content/marketing/site-content";
import {useI18n} from '@/providers/I18nContext';
import type {SupportedLocale} from '@/i18n/config';

const LOCALES: { code: SupportedLocale; label: string }[] = [
    {code: 'vi', label: 'VI'},
    {code: 'en', label: 'EN'},
    {code: 'ja', label: 'JA'},
];

export function PublicFooter() {
    const {t, locale, setLocale} = useI18n();
    const year = new Date().getFullYear();

    return (
        <footer className="border-t border-border bg-slate-50/80 pt-14 pb-8 text-sm text-slate-600">
            <div className="mx-auto grid w-full max-w-[1380px] grid-cols-1 gap-8 px-5 sm:grid-cols-2 sm:px-8 lg:grid-cols-12 lg:px-12">
                {/* Col 1: Brand & VJU Campus Info (4 cols) */}
                <div className="space-y-3.5 lg:col-span-5">
                    <Link className="inline-flex items-center gap-2.5 text-base font-extrabold tracking-wider text-foreground" href="/">
                        <img
                            src="/vju-logo.svg"
                            alt="Biểu trưng Đại học Việt Nhật"
                            width={32}
                            height={32}
                            className="h-8 w-8 object-contain"
                        />
                        <div className="flex flex-col leading-tight">
                            <span>UAV PAS</span>
                            <span className="text-[11px] font-semibold tracking-normal text-primary">
                                {t('publicFooter.university')}
                            </span>
                        </div>
                    </Link>
                    <p className="max-w-sm text-xs leading-relaxed text-slate-600">
                        {t('publicFooter.description')}
                    </p>
                    <div className="space-y-1 text-xs text-slate-500">
                        <p>{t('publicFooter.campusHoaLac')}</p>
                        <p>{t('publicFooter.campusMyDinh')}</p>
                        <p className="font-semibold text-slate-700">Email: uav-pas@vju.ac.vn</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                        <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-bold text-slate-700">
                            RTK 1–3 cm
                        </span>
                        <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-bold text-slate-700">
                            Xilinx Kria KV260
                        </span>
                        <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-bold text-slate-700">
                            VietQR EMVCo
                        </span>
                    </div>
                </div>

                {/* Col 2: Products & Services (2 cols) */}
                <div className="flex flex-col gap-2 text-xs lg:col-span-2">
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                        {t('publicFooter.exploreHeading')}
                    </h2>
                    <Link className="hover:text-primary transition-colors" href="/services">
                        {t('publicFooter.services')}
                    </Link>
                    <Link className="hover:text-primary transition-colors" href="/solutions">
                        {t('publicFooter.solutions')}
                    </Link>
                    <Link className="hover:text-primary transition-colors" href="/pricing">
                        {t('publicFooter.pricing')}
                    </Link>
                    <Link className="hover:text-primary transition-colors" href="/how-it-works">
                        {t('publicFooter.howItWorks')}
                    </Link>
                </div>

                {/* Col 3: 3-Portal Ecosystem & Academy (3 cols) */}
                <div className="flex flex-col gap-2 text-xs lg:col-span-3">
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                        {t('publicFooter.portalsHeading')}
                    </h2>
                    <Link className="hover:text-primary transition-colors" href={`${customerUrl}/dashboard`}>
                        {t('publicFooter.customerPortal')}
                    </Link>
                    <Link className="hover:text-primary transition-colors" href={`${customerUrl}/training`}>
                        {t('publicFooter.trainingAcademy')}
                    </Link>
                </div>

                {/* Col 4: Support & Legal (2 cols) */}
                <div className="flex flex-col gap-2 text-xs lg:col-span-2">
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                        {t('publicFooter.supportHeading')}
                    </h2>
                    <Link className="hover:text-primary transition-colors" href="/about">
                        {t('publicFooter.about')}
                    </Link>
                    <Link className="hover:text-primary transition-colors" href="/faq">
                        {t('publicFooter.faq')}
                    </Link>
                    <Link className="hover:text-primary transition-colors" href="/contact">
                        {t('publicFooter.contact')}
                    </Link>
                    <Link className="hover:text-primary transition-colors" href="/privacy">
                        {t('publicFooter.privacy')}
                    </Link>
                    <Link className="hover:text-primary transition-colors" href="/terms">
                        {t('publicFooter.terms')}
                    </Link>
                </div>
            </div>

            <div className="mx-auto mt-10 flex w-full max-w-[1380px] flex-wrap items-center justify-between gap-4 border-t border-border px-5 pt-6 text-xs text-slate-500 sm:px-8 lg:px-12">
                <span>{t('publicFooter.copyright', {year})}</span>
                <div className="flex items-center gap-4">
                    <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5" role="group" aria-label="Language selector">
                        {LOCALES.map((item) => (
                            <button
                                key={item.code}
                                type="button"
                                onClick={() => setLocale(item.code)}
                                className={`rounded-md px-2 py-0.5 text-[11px] font-bold transition-colors ${
                                    locale === item.code
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-slate-600 hover:text-primary'
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                    <span>NguyenPhat2412</span>
                </div>
            </div>
        </footer>
    );
}
