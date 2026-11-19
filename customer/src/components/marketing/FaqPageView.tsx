'use client';

import {keepVietnamesePhrases} from '@/lib/typography';
import {CustomerCta, PublicPage} from '@/components/marketing/PublicPage';
import {useI18n} from '@/providers/I18nContext';

export function FaqPageView() {
    const {t} = useI18n();

    const faqs = [
        [t('publicSite.faqPage.q1'), t('publicSite.faqPage.a1')],
        [t('publicSite.faqPage.q2'), t('publicSite.faqPage.a2')],
        [t('publicSite.faqPage.q3'), t('publicSite.faqPage.a3')],
        [t('publicSite.faqPage.q4'), t('publicSite.faqPage.a4')],
        [t('publicSite.faqPage.q5'), t('publicSite.faqPage.a5')],
        [t('publicSite.faqPage.q6'), t('publicSite.faqPage.a6')],
        [t('publicSite.faqPage.q7'), t('publicSite.faqPage.a7')],
        [t('publicSite.faqPage.q8'), t('publicSite.faqPage.a8')],
    ] as const;

    return (
        <PublicPage
            eyebrow={t('publicSite.faqPage.eyebrow')}
            title={t('publicSite.faqPage.title')}
            intro={t('publicSite.faqPage.intro')}
        >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {faqs.map(([q, a]) => (
                    <article className="space-y-2 rounded-2xl border border-border bg-card p-5 shadow-2xs" key={q}>
                        <h2 className="m-0 text-base font-bold text-foreground">{keepVietnamesePhrases(q)}</h2>
                        <p className="m-0 text-sm leading-relaxed text-slate-600">{a}</p>
                    </article>
                ))}
            </div>
            <CustomerCta/>
        </PublicPage>
    );
}
