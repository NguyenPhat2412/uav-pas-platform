'use client';

import { UavIcon } from '@/components/shared/UavIcon';
import React, { useState } from 'react';
import { displayLabel, planName } from "@/components/shared/presentation";
import {
  CreditCard,
  CheckCircle,
  Clock,
  FileText,
  AlertCircle,

  Radar,
  X
} from 'lucide-react';
import { PageGuard } from "@/components/customer/layout";
import { useBilling } from "@/lib/query/customer";
import { ServicePlanCards } from '@/features/billing/components/ServicePlanCard';
import type { Invoice } from "@/types/customer";

// Endpoints: /api/v1/billing/my-quota, /api/v1/billing/my-invoices
// Provider integration is unavailable until explicitly configured.
const STATUS_LABEL: Record<Invoice['status'], string> = {
  PAID: 'Đã thanh toán',
  PENDING: 'Chờ thanh toán',
  FAILED: 'Thanh toán thất bại',
  CANCELLED: 'Đã hủy'
};

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleDateString('vi-VN') : '—';
}

export default function CustomerBillingPage() {
  const { quota: quotaQuery, invoices: invoicesQuery, plans: plansQuery } = useBilling();
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
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
              <CreditCard color="#ab2523" size={28} /> Gói cước và hóa đơn
            </h1>
            <p className="vju-billing-subtitle">
              Theo dõi hạn mức giờ dự kiến theo lịch và hóa đơn. Cổng thanh toán chưa được cấu hình.
            </p>
          </div>

        </div>

        {isLoading && (
          <div className="vju-loading-state">
            Đang tải dữ liệu thanh toán…
          </div>
        )}

        {queryError && !isLoading && (
          <div className="vju-error-state">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div>
              <p style={{ margin: 0, fontWeight: 700 }}>Không tải được dữ liệu thanh toán.</p>
              <p style={{ margin: '4px 0 0', fontSize: 12 }}>{queryError instanceof Error ? queryError.message : 'Lỗi không xác định'}</p>
            </div>
          </div>
        )}

        {/* Quota & Plan Overview Cards */}
        {quota && (
          <div className="vju-quota-grid">
            {/* Card 1: Current Plan */}
            <div className="vju-plan-card">
              <div className="vju-plan-bg-sparkle">
                <UavIcon size={140} color="#fff" aria-hidden="true" />
              </div>
              <div>
                <div className="vju-plan-header">
                  <span className="vju-plan-badge">Gói hiện tại</span>
                  <span className="vju-cycle-date">
                    Chu kỳ kết thúc: {formatDate(quota.cycleEnd)}
                  </span>
                </div>
                <h3 className="vju-plan-title">{planName(quota.planName)}</h3>
                <p className="vju-plan-desc">
                  Hạn mức sử dụng theo gói dịch vụ hiện tại. Giờ sử dụng được ghi nhận khi nhiệm vụ hoàn thành, dựa trên thời lượng dự kiến theo lịch.
                </p>
              </div>

              <div className="vju-plan-footer">
                <span>Nhiệm vụ đồng thời:</span>
                <strong className="vju-plan-val-mono">
                  {quota.concurrentUavsUsed} / {quota.concurrentUavsLimit} UAV
                </strong>
              </div>
            </div>

            {/* Card 2: Flight Hours Quota */}
            <div className="vju-stat-card">
              <div>
                <div className="vju-stat-header">
                  <span className="vju-stat-label">Giờ dự kiến đã sử dụng</span>
                  <span className="vju-stat-usage">
                    {usagePercent}% đã dùng
                  </span>
                </div>
                <div className="vju-stat-numbers">
                  <span className="vju-stat-val">{quota.flightHoursUsed}h</span>
                  <span className="vju-stat-total">/ {quota.flightHoursLimit} giờ</span>
                </div>

                {/* Progress bar */}
                <div className="vju-meter-bar">
                  <div
                    className={`vju-meter-fill ${usagePercent > 80 ? '' : 'vju-green'}`}
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
              </div>

              <p className="vju-stat-desc">
                Còn lại <strong className="vju-stat-desc-highlight">{quota.flightHoursRemaining} giờ dự kiến</strong> theo hạn mức hiện tại.
              </p>
            </div>

            {/* Card 3: AI & Features Access */}
            <div className="vju-stat-card vju-stat-card-green">
              <div>
                <span className="vju-stat-label" style={{ display: 'block', marginBottom: 12 }}>
                  Đặc quyền kỹ thuật
                </span>
                <ul className="vju-feature-list">
                  <li className="vju-feature-item">
                    <span className="vju-feature-label">
                      <Radar size={15} aria-hidden="true" /> Quyền dùng SAR/AI của gói
                    </span>
                    <span className="vju-badge-paid">{currentPlan ? (currentPlan.allowSarAi ? 'Có' : 'Không') : '—'}</span>
                  </li>
                  <li className="vju-feature-item">
                    <span className="vju-feature-label">
                      <UavIcon size={15} aria-hidden="true" /> Giới hạn UAV đồng thời
                    </span>
                    <strong className="vju-feature-val">{currentPlan?.maxConcurrentUavs ?? quota.concurrentUavsLimit} UAV</strong>
                  </li>
                  <li className="vju-feature-item">
                    <span className="vju-feature-label">
                      <Clock size={15} aria-hidden="true" /> Chu kỳ thanh toán
                    </span>
                    <strong className="vju-feature-val">{currentPlan ? displayLabel(currentPlan.billingCycle) : '—'}</strong>
                  </li>
                </ul>
              </div>

              <p className="vju-stat-desc">Nâng cấp gói và thanh toán trực tuyến chưa được cấu hình.</p>
            </div>
          </div>
        )}
        <section aria-labelledby="available-plans-title">
          <h2 id="available-plans-title" className="vju-table-box-title" style={{ marginBottom: 16 }}><UavIcon size={22} aria-hidden="true" />Các gói dịch vụ</h2>
          {plansQuery.isLoading ? <p role="status">Đang tải các gói dịch vụ…</p>
            : plansQuery.isError ? <p role="alert">Không tải được các gói dịch vụ. <button type="button" className="button-link" onClick={() => void plansQuery.refetch()}>Thử lại</button></p>
              : <ServicePlanCards plans={plansList} currentPlanCode={quota?.planCode} />}
          {plansQuery.isSuccess && plansList.length === 0 && <p className="muted">Chưa có gói dịch vụ.</p>}
        </section>
        {/* Invoices Table */}
        <div className="vju-table-box">
          <div className="vju-table-box-header">
            <h2 className="vju-table-box-title">
              <FileText size={20} color="#64748b" /> Lịch sử Hóa đơn & Thanh toán
            </h2>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>{invoices.length} bản ghi</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="vju-table vju-invoice-table">
              <thead>
                <tr className="vju-thead-tr">
                  <th className="vju-th">Số Hóa Đơn</th>
                  <th className="vju-th">Nội Dung</th>
                  <th className="vju-th">Ngày Lập</th>
                  <th className="vju-th">Hạn Thanh Toán</th>
                  <th className="vju-th">Số Tiền</th>
                  <th className="vju-th">Trạng Thái</th>
                  <th className="vju-th-right">Thao Tác</th>
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
                      {inv.amount.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="vju-td">
                      <span className={inv.status === 'PAID' ? 'vju-badge-paid' : 'vju-badge-pending'}>
                        {inv.status === 'PAID' ? <CheckCircle size={12} /> : <Clock size={12} />}
                        {STATUS_LABEL[inv.status]}
                      </span>
                    </td>
                    <td className="vju-td-right">
                      {inv.status === 'PENDING' ? (
                        <button
                          type="button"
                          onClick={() => setPayingInvoice(inv)}
                          className="vju-btn-paynow"
                        >
                          Xem thanh toán
                        </button>
                      ) : (
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>
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
            <p role="status" style={{ margin: 0, padding: '32px 20px', textAlign: 'center', color: '#64748b' }}>
              Chưa có hóa đơn nào.
            </p>
          )}
        </div>

        {payingInvoice && (
          <div className="vju-modal-overlay">
            <div className="vju-modal-content" role="dialog" aria-modal="true" aria-labelledby="payment-title">
              <div className="vju-modal-header">
                <h3 id="payment-title" className="vju-modal-title">Thông tin thanh toán</h3>
                <button type="button" aria-label="Đóng thông tin thanh toán" onClick={() => setPayingInvoice(null)} className="vju-modal-close"><X size={18} /></button>
              </div>
              <p>Hóa đơn {payingInvoice.code}: {payingInvoice.amount.toLocaleString('vi-VN')} đ.</p>
              <p role="status">Cổng thanh toán chưa được cấu hình. Chưa có mã QR hoặc tài khoản nhận tiền được xác nhận. Hóa đơn đang chờ thanh toán; hệ thống chỉ ghi nhận khi nhận được xác thực hợp lệ từ nhà cung cấp thanh toán.</p>
              <p>Thanh toán hóa đơn nhiệm vụ không cộng thêm giờ. Hóa đơn gói dịch vụ áp dụng hạn mức của gói và giữ nguyên số giờ đã sử dụng.</p>
            </div>
          </div>
        )}
      </div>
    </PageGuard>
  );
}
