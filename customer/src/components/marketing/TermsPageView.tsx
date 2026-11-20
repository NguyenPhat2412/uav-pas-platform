'use client';

import Link from 'next/link';
import {CheckCircle2, FileCheck2, Landmark, ShieldCheck} from 'lucide-react';
import {PublicPage} from '@/components/marketing/PublicPage';
import {customerUrl} from '@/content/marketing/origins';
import {useI18n} from '@/providers/I18nContext';

export function TermsPageView() {
    const {t} = useI18n();

    const requiredDocs = [
        t('publicSite.termsPage.doc1'),
        t('publicSite.termsPage.doc2'),
        t('publicSite.termsPage.doc3'),
        t('publicSite.termsPage.doc4'),
        t('publicSite.termsPage.doc5'),
    ];

    return (
        <PublicPage
            eyebrow={t('publicSite.termsPage.eyebrow')}
            title={t('publicSite.termsPage.title')}
            intro={t('publicSite.termsPage.intro')}
            scene="opsCommand"
        >
            <div className="space-y-8">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <article className="space-y-3 rounded-2xl border border-border bg-card p-6 shadow-xs">
                        <div className="flex items-center gap-2 text-primary">
                            <ShieldCheck size={18} aria-hidden="true" />
                            <h2 className="m-0 text-lg font-extrabold text-foreground">
                                {t('publicSite.termsPage.sec1Title')}
                            </h2>
                        </div>
                        <p className="m-0 text-sm leading-relaxed text-slate-600">
                            {t('publicSite.termsPage.sec1Body')}
                        </p>
                    </article>

                    <article className="space-y-3 rounded-2xl border border-border bg-card p-6 shadow-xs">
                        <div className="flex items-center gap-2 text-primary">
                            <Landmark size={18} aria-hidden="true" />
                            <h2 className="m-0 text-lg font-extrabold text-foreground">
                                {t('publicSite.termsPage.sec3Title')}
                            </h2>
                        </div>
                        <p className="m-0 text-sm leading-relaxed text-slate-600">
                            {t('publicSite.termsPage.sec3Body')}
                        </p>
                    </article>
                </div>

                <section className="space-y-4 rounded-2xl border border-border bg-slate-50/70 p-6 sm:p-8">
                    <div className="flex items-center gap-2 text-primary">
                        <FileCheck2 size={18} aria-hidden="true" />
                        <h2 className="m-0 text-lg font-extrabold text-foreground">
                            {t('publicSite.termsPage.sec2Title')}
                        </h2>
                    </div>
                    <p className="m-0 text-sm leading-relaxed text-slate-600">
                        {t('publicSite.termsPage.sec2Body')}
                    </p>
                    <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-2">
                        {requiredDocs.map((doc) => (
                            <li
                                key={doc}
                                className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-3.5 text-xs font-medium leading-relaxed text-slate-800"
                            >
                                <CheckCircle2
                                    size={15}
                                    className="mt-0.5 shrink-0 text-primary"
                                    aria-hidden="true"
                                />
                                <span>{doc}</span>
                            </li>
                        ))}
                    </ul>
                    <div className="pt-2">
                        <Link
                            href={`${customerUrl}/provider/onboarding`}
                            className="inline-flex min-h-10 items-center justify-center rounded-control bg-primary px-5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
                        >
                            {t('publicSite.catalog.becomeSellerButton')}
                        </Link>
                    </div>
                </section>
            </div>
        </PublicPage>
    );
}
