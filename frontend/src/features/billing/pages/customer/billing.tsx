'use client';

import {UavIcon} from '@/components/shared/UavIcon';
import React, {useState} from 'react';
import {displayLabel, planName} from "@/components/shared/presentation";
import {AlertCircle, CheckCircle, Clock, CreditCard, FileText, Radar, X} from 'lucide-react';
import {PageGuard} from "@/components/customer/layout";
import {useBilling} from "@/lib/query/customer";
import {ServicePlanCards} from '@/features/billing/components/ServicePlanCard';
import type {Invoice} from "@/types/customer";
import {useI18n} from '@/contexts/I18nContext';

// Endpoints: /api/v1/billing/my-quota, /api/v1/billing/my-invoices
// Provider integration is unavailable until explicitly configured.

export default function CustomerBillingPage() {
    const {quota: quotaQuery, invoices: invoicesQuery, plans: plansQuery} = useBilling();
    const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
    const {t, formatDate: formatLocalDate, formatCurrency} = useI18n();
    const formatDate = (value?: string) => value ? formatLocalDate(value, {dateStyle: 'short'}) : '—';
    const quota = quotaQuery.data;
    const invoices = invoicesQuery.data?.content ?? [];
    const plansList = Array.isArray(plansQuery.data) ? plansQuery.data : [];
    const currentPlan = plansList.find(p => p.code === quota?.planCode);
    const queryError = quotaQuery.error ?? invoicesQuery.error;
    const isLoading = quotaQuery.isLoading || invoicesQuery.isLoading;

    const usagePercent = quota
        ? Math.min(100, Math.round((quota.flightHoursUsed / Math.max(quota.flightHoursLimit, 0.01)) * 100))
        : 0;

    return (
        <PageGuard permission={null}>
            <div className="vju-billing-wrap">
                {/* Header */}
                <div className="vju-billing-header">
                    <div>
                        <h1 className="vju-billing-title">
                            <CreditCard color="#ab2523" size={28}/> {t('billingPage.title')}
                        </h1>
                        <p className="vju-billing-subtitle">
                            {t('billingPage.subtitle')}
                        </p>
                    </div>

                </div>

                {isLoading && (
                    <div className="vju-loading-state">
                        {t('billingPage.loading')}
                    </div>
                )}

                {queryError && !isLoading && (
                    <div className="vju-error-state">
                        <AlertCircle size={20} className="shrink-0 mt-0.5"/>
                        <div>
                            <p style={{margin: 0, fontWeight: 700}}>{t('billingPage.loadError')}</p>
                            <p style={{
                                margin: '4px 0 0',
                                fontSize: 12
                            }}>{queryError instanceof Error ? queryError.message : t('billingPage.unknownError')}</p>
                        </div>
                    </div>
                )}

                {/* Quota & Plan Overview Cards */}
                {quota && (
                    <div className="vju-quota-grid">
                        {/* Card 1: Current Plan */}
                        <div className="vju-plan-card">
                            <div className="vju-plan-bg-sparkle">
                                <UavIcon size={140} color="#fff" aria-hidden="true"/>
                            </div>
                            <div>
                                <div className="vju-plan-header">
                                    <span className="vju-plan-badge">{t('billingPage.currentPlan')}</span>
                                    <span className="vju-cycle-date">
                    {t('billingPage.cycleEnds', {date: formatDate(quota.cycleEnd)})}
                  </span>
                                </div>
                                <h3 className="vju-plan-title">{planName(quota.planName)}</h3>
                                <p className="vju-plan-desc">
                                    {t('billingPage.planDescription')}
                                </p>
                            </div>

                            <div className="vju-plan-footer">
                                <span>{t('billingPage.concurrentMissions')}</span>
                                <strong className="vju-plan-val-mono">
                                    {quota.concurrentUavsUsed} / {quota.concurrentUavsLimit} UAV
                                </strong>
                            </div>
                        </div>

                        {/* Card 2: Flight Hours Quota */}
                        <div className="vju-stat-card">
                            <div>
                                <div className="vju-stat-header">
                                    <span className="vju-stat-label">{t('billingPage.hoursUsed')}</span>
                                    <span className="vju-stat-usage">
                    {t('billingPage.percentUsed', {percent: usagePercent})}
                  </span>
                                </div>
                                <div className="vju-stat-numbers">
                                    <span className="vju-stat-val">{quota.flightHoursUsed}h</span>
                                    <span className="vju-stat-total">{t('billingPage.hoursTotal', {limit: quota.flightHoursLimit})}</span>
                                </div>

                                {/* Progress bar */}
                                <div className="vju-meter-bar">
                                    <div
                                        className={`vju-meter-fill ${usagePercent > 80 ? '' : 'vju-green'}`}
                                        style={{width: `${usagePercent}%`}}
                                    />
                                </div>
                            </div>

                            <p className="vju-stat-desc">
                                {t('billingPage.remaining', {hours: quota.flightHoursRemaining})}
                            </p>
                        </div>

                        {/* Card 3: AI & Features Access */}
                        <div className="vju-stat-card vju-stat-card-green">
                            <div>
                <span className="vju-stat-label" style={{display: 'block', marginBottom: 12}}>
                  {t('billingPage.features')}
                </span>
                                <ul className="vju-feature-list">
                                    <li className="vju-feature-item">
                    <span className="vju-feature-label">
                      <Radar size={15} aria-hidden="true"/> {t('billingPage.sarAi')}
                    </span>
                                        <span
                                            className="vju-badge-paid">{currentPlan ? t(currentPlan.allowSarAi ? 'billingPage.yes' : 'billingPage.no') : '—'}</span>
                                    </li>
                                    <li className="vju-feature-item">
                    <span className="vju-feature-label">
                      <UavIcon size={15} aria-hidden="true"/> {t('billingPage.concurrentLimit')}
                    </span>
                                        <strong
                                            className="vju-feature-val">{currentPlan?.maxConcurrentUavs ?? quota.concurrentUavsLimit} UAV</strong>
                                    </li>
                                    <li className="vju-feature-item">
                    <span className="vju-feature-label">
                      <Clock size={15} aria-hidden="true"/> {t('billingPage.billingCycle')}
                    </span>
                                        <strong
                                            className="vju-feature-val">{currentPlan ? displayLabel(currentPlan.billingCycle) : '—'}</strong>
                                    </li>
                                </ul>
                            </div>

                            <p className="vju-stat-desc">{t('billingPage.upgradeUnavailable')}</p>
                        </div>
                    </div>
                )}
                <section aria-labelledby="available-plans-title">
                    <h2 id="available-plans-title" className="vju-table-box-title" style={{marginBottom: 16}}><UavIcon
                        size={22} aria-hidden="true"/>{t('billingPage.plans')}</h2>
                    {plansQuery.isLoading ? <p role="status">{t('billingPage.loadingPlans')}</p>
                        : plansQuery.isError ? <p role="alert">{t('billingPage.plansError')} <button type="button"
                                                                                                       className="button-link"
                                                                                                       onClick={() => void plansQuery.refetch()}>{t('common.retry')}</button></p>
                            : <ServicePlanCards plans={plansList} currentPlanCode={quota?.planCode}/>}
                    {plansQuery.isSuccess && plansList.length === 0 && <p className="muted">{t('billingPage.noPlans')}</p>}
                </section>
                {/* Invoices Table */}
                <div className="vju-table-box">
                    <div className="vju-table-box-header">
                        <h2 className="vju-table-box-title">
                            <FileText size={20} color="#64748b"/> {t('billingPage.invoiceHistory')}
                        </h2>
                        <span style={{
                            fontSize: 12,
                            color: '#64748b',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                        }}>{t('billingPage.recordCount', {count: invoices.length})}</span>
                    </div>

                    <div style={{overflowX: 'auto'}}>
                        <table className="vju-table vju-invoice-table">
                            <thead>
                            <tr className="vju-thead-tr">
                                <th className="vju-th">{t('billingPage.invoiceNo')}</th>
                                <th className="vju-th">{t('billingPage.description')}</th>
                                <th className="vju-th">{t('billingPage.issuedOn')}</th>
                                <th className="vju-th">{t('billingPage.dueDate')}</th>
                                <th className="vju-th">{t('billingPage.amount')}</th>
                                <th className="vju-th">{t('common.status')}</th>
                                <th className="vju-th-right">{t('billingPage.actions')}</th>
                            </tr>
                            </thead>
                            <tbody>
                            {invoices.map(inv => (
                                <tr key={inv.id} className="vju-tbody-tr">
                                    <td className="vju-td-mono">{inv.code}</td>
                                    <td className="vju-td">{inv.missionTitle ?? (inv.planName ? planName(inv.planName) : inv.notes ?? '—')}</td>
                                    <td className="vju-td-muted">{formatDate(inv.createdAt)}</td>
                                    <td className="vju-td-muted">{formatDate(inv.dueDate)}</td>
                                    <td className="vju-td-mono">
                                        {formatCurrency(inv.amount)}
                                    </td>
                                    <td className="vju-td">
                      <span className={inv.status === 'PAID' ? 'vju-badge-paid' : 'vju-badge-pending'}>
                        {inv.status === 'PAID' ? <CheckCircle size={12}/> : <Clock size={12}/>}
                          {t(`billingPage.status.${inv.status}`)}
                      </span>
                                    </td>
                                    <td className="vju-td-right">
                                        {inv.status === 'PENDING' ? (
                                            <button
                                                type="button"
                                                onClick={() => setPayingInvoice(inv)}
                                                className="vju-btn-paynow"
                                            >
                                                {t('billingPage.viewPayment')}
                                            </button>
                                        ) : (
                                            <span style={{fontSize: 12, color: '#94a3b8'}}>
                          {formatDate(inv.paidAt)}
                        </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                    {invoices.length === 0 && !isLoading && !queryError && (
                        <p role="status"
                           style={{margin: 0, padding: '32px 20px', textAlign: 'center', color: '#64748b'}}>
                            {t('billingPage.noInvoices')}
                        </p>
                    )}
                </div>

                {payingInvoice && (
                    <div className="vju-modal-overlay">
                        <div className="vju-modal-content" role="dialog" aria-modal="true"
                             aria-labelledby="payment-title">
                            <div className="vju-modal-header">
                                <h3 id="payment-title" className="vju-modal-title">{t('billingPage.paymentInfo')}</h3>
                                <button type="button" aria-label={t('billingPage.closePayment')}
                                        onClick={() => setPayingInvoice(null)} className="vju-modal-close"><X
                                    size={18}/></button>
                            </div>
                            <p>{t('billingPage.invoiceAmount', {code: payingInvoice.code, amount: formatCurrency(payingInvoice.amount)})}</p>
                            <p role="status">{t('billingPage.gatewayNotice')}</p>
                            <p>{t('billingPage.hoursNotice')}</p>
                        </div>
                    </div>
                )}
            </div>
        </PageGuard>
    );
}
