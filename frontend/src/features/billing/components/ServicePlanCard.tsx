import {UavIcon} from '@/components/shared/UavIcon';
import {BadgeCheck, Clock3, Radar, Sparkles} from 'lucide-react';
import {displayLabel, planName} from '@/components/shared/presentation';
import type {ServicePlan} from '@/types/customer';
import styles from './ServicePlanCard.module.css';
import {useI18n} from '@/contexts/I18nContext';

export function ServicePlanCards({plans, currentPlanCode}: {
    plans: ServicePlan[];
    currentPlanCode?: string;
}) {
    const {t, formatCurrency} = useI18n();
    return <div className={styles.grid}>
        {plans.map(plan => {
            // A visual editorial highlight, independent of the customer's subscribed plan.
            const featured = plan.active && plan.code === 'PRO';
            const current = plan.code === currentPlanCode;
            return <article key={plan.id} className={`${styles.card} ${featured ? styles.featured : ''}`}>
                <div className={styles.top}>
                    <span className={styles.icon}><UavIcon size={26} aria-hidden="true"/></span>
                    <div className={styles.badges}>
                        {featured && <span className={styles.featuredBadge}><Sparkles size={13} aria-hidden="true"/>{t('planCard.featured')}</span>}
                        {current &&
                            <span className={styles.currentBadge}><BadgeCheck size={13} aria-hidden="true"/>{t('planCard.current')}</span>}
                        {!plan.active && <span className={styles.inactiveBadge}>{t('planCard.inactive')}</span>}
                    </div>
                </div>
                <div><span className={styles.code}>{plan.code}</span><h3
                    className={styles.name}>{planName(plan.name)}</h3></div>
                <div className={styles.price}><strong>{formatCurrency(plan.price)}</strong><span>/ {displayLabel(plan.billingCycle)}</span></div>
                <dl className={styles.features}>
                    <div>
                        <dt><Clock3 size={16} aria-hidden="true"/>{t('planCard.monthlyHours')}</dt>
                        <dd>{t('planCard.hours', {hours: plan.maxMonthlyFlightHours})}</dd>
                    </div>
                    <div>
                        <dt><UavIcon size={16} aria-hidden="true"/>{t('planCard.concurrentUavs')}</dt>
                        <dd>{plan.maxConcurrentUavs} UAV</dd>
                    </div>
                    <div>
                        <dt><Radar size={16} aria-hidden="true"/>SAR / AI</dt>
                        <dd>{t(plan.allowSarAi ? 'planCard.yes' : 'planCard.no')}</dd>
                    </div>
                </dl>
            </article>;
        })}
    </div>;
}
