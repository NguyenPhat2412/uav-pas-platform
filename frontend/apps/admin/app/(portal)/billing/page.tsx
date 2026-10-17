'use client';

import React, { useState } from 'react';
import { displayLabel } from '@uav/ui/presentation';
import { AdminPage } from '@/components/layout/AdminPage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Zap,
  CheckCircle2,
  Edit3,
  Search,
  AlertCircle
} from 'lucide-react';
import { adminService } from '@/features/admin/services/admin.service';
import { Drawer } from '@/components/data/Drawer';
import type { UserQuota } from '@/features/admin/types';

// API route: /api/v1/billing
function AdminBillingContent() {
  const queryClient = useQueryClient();
  const plansQuery = useQuery({ queryKey: ['admin', 'billing', 'plans'], queryFn: ({ signal }) => adminService.billingPlans(signal) });
  const quotasQuery = useQuery({ queryKey: ['admin', 'billing', 'quotas'], queryFn: ({ signal }) => adminService.billingQuotas(0, signal) });
  const updateQuota = useMutation({
    mutationFn: ({ userId, planCode, flightHoursLimit }: { userId: number; planCode: string; flightHoursLimit: number }) =>
      adminService.updateQuota(userId, { planCode, flightHoursLimit }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'billing', 'quotas'] }),
  });

  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<UserQuota | null>(null);
  const [newLimit, setNewLimit] = useState<number>(50);
  const [newPlan, setNewPlan] = useState<string>('PRO');

  const plans = plansQuery.data ?? [];
  const quotas = quotasQuery.data?.content ?? [];
  const isLoading = plansQuery.isLoading || quotasQuery.isLoading;
  const queryError = plansQuery.error ?? quotasQuery.error;

  const handleOpenEdit = (q: UserQuota) => {
    updateQuota.reset();
    setEditingUser(q);
    setNewLimit(q.flightHoursLimit);
    setNewPlan(q.planCode);
  };

  const handleSaveQuota = () => {
    if (!editingUser) return;
    updateQuota.mutate(
      { userId: editingUser.userId, planCode: newPlan, flightHoursLimit: newLimit },
      { onSuccess: () => setEditingUser(null) }
    );
  };

  const filteredQuotas = quotas.filter(q =>
    (q.fullName ?? '').toLowerCase().includes(search.toLowerCase()) ||
    q.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="portal-management space-y-6">
      {isLoading && (
        <div className="portal-card bg-white border border-slate-200 rounded-xl p-6 text-center text-xs text-slate-500">
          Đang tải dữ liệu gói cước…
        </div>
      )}

      {queryError && !isLoading && (
        <div className="bg-rose-50 border border-rose-300 text-rose-700 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle size={16} className="text-rose-500 shrink-0" />
          <span>Không tải được dữ liệu: {queryError instanceof Error ? queryError.message : 'Lỗi không xác định'}</span>
        </div>
      )}

      {updateQuota.isSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm">
          <CheckCircle2 size={16} className="text-[#007f3e]" />
          <span>Đã cập nhật hạn mức thành công.</span>
        </div>
      )}

      {/* Service Plans Cards */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
          <Zap size={16} className="text-amber-500" /> Các gói dịch vụ
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map(p => (
            <div key={p.id} className="portal-card bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-[#ab2523] transition flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="tabular-nums text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {p.code}
                  </span>
                  <span className="text-xs text-[#007f3e] font-semibold flex items-center gap-1">
                    <CheckCircle2 size={12} /> Khả dụng
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">{p.name}</h3>
                <p className="text-2xl font-black text-[#ab2523] tabular-nums mt-2">
                  {p.price.toLocaleString('vi-VN')} đ <span className="text-xs font-normal text-slate-500">/ {displayLabel(p.billingCycle)}</span>
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Hạn mức giờ bay:</span>
                    <strong className="tabular-nums text-slate-900">{p.maxMonthlyFlightHours} giờ</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Nhiệm vụ đồng thời:</span>
                    <strong className="tabular-nums text-slate-900">{p.maxConcurrentUavs} UAV</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>AI YOLOv8s Video:</span>
                    <strong className={p.allowSarAi ? 'text-[#007f3e]' : 'text-slate-400'}>
                      {p.allowSarAi ? 'Có' : 'Không'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User Quotas Management Table */}
      <div className="portal-card bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Users size={16} className="text-[#ab2523]" /> Hạn mức khách hàng
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Kiểm soát phân bổ giờ bay, giới hạn nhiệm vụ đồng thời và điều chỉnh gói dịch vụ
            </p>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              aria-label="Tìm khách hàng"
              placeholder="Tìm khách hàng..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#ab2523] transition w-60"
            />
          </div>
        </div>

        <div className="table-scroll" tabIndex={0} aria-label="Bảng dữ liệu">
          <table className="console-table w-full text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Khách Hàng</th>
                <th className="px-5 py-3">Gói Dịch Vụ</th>
                <th className="px-5 py-3">Hạn Mức Tháng</th>
                <th className="px-5 py-3">Đã Bay</th>
                <th className="px-5 py-3">Tỷ Lệ Dùng</th>
                <th className="px-5 py-3">Nhiệm Vụ Đồng Thời</th>
                <th className="px-5 py-3 text-right">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQuotas.length === 0 && !isLoading && !queryError && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    Chưa có hạn mức nào được cấp.
                  </td>
                </tr>
              )}
              {filteredQuotas.map(q => {
                const ratio = Math.round((q.flightHoursUsed / Math.max(q.flightHoursLimit, 0.01)) * 100);
                return (
                  <tr key={q.userId} className="hover:bg-slate-50/70 transition">
                    <td className="px-5 py-3.5">
                      <strong className="text-slate-900 block font-semibold">{q.fullName ?? q.username}</strong>
                      <span className="text-slate-400 tabular-nums text-[11px]">@{q.username}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="tabular-nums font-bold px-2 py-0.5 rounded text-[11px] bg-blue-50 text-blue-700 border border-border">
                        {q.planCode}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 tabular-nums font-bold text-slate-800">{q.flightHoursLimit}h</td>
                    <td className="px-5 py-3.5 tabular-nums text-slate-700">{q.flightHoursUsed}h</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full ${ratio > 85 ? 'bg-rose-500' : 'bg-blue-600'}`}
                            style={{ width: `${Math.min(100, ratio)}%` }}
                          />
                        </div>
                        <span className="tabular-nums text-slate-600 font-semibold">{ratio}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 tabular-nums text-slate-700">
                      {q.concurrentUavsUsed} / {q.concurrentUavsLimit}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(q)}
                        className="portal-button portal-button-primary px-2.5 py-1 text-primary hover:bg-primary/5 rounded border border-border transition font-medium inline-flex items-center gap-1"
                      >
                        <Edit3 size={12} /> Chỉnh sửa
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Quota Modal */}
      {editingUser && (
        <Drawer title="Điều chỉnh hạn mức khách hàng" onClose={() => setEditingUser(null)}>
          <div className="space-y-4">
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 block mb-1">Khách hàng:</span>
                <strong className="text-slate-800 text-sm">{editingUser.fullName || editingUser.username}</strong>
              </div>

              <div>
                <label htmlFor="quota-plan" className="text-slate-700 font-semibold block mb-1">Gói dịch vụ:</label>
                <select
                  id="quota-plan"
                  value={newPlan}
                  onChange={e => setNewPlan(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-primary"
                >
                  {plans.map(p => (
                    <option key={p.code} value={p.code}>{p.name} ({p.code} - {p.maxMonthlyFlightHours} giờ)</option>
                  ))}
                </select>
              </div>

              {updateQuota.error && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5 flex items-start gap-2 text-rose-700">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>Lưu thất bại: {updateQuota.error instanceof Error ? updateQuota.error.message : 'Lỗi không xác định'}</span>
                </div>
              )}

              <div>
                <label htmlFor="quota-limit" className="text-slate-700 font-semibold block mb-1">Hạn mức giờ bay cấp riêng (Giờ):</label>
                <input
                  id="quota-limit"
                  type="number"
                  min="5"
                  max="1000"
                  value={newLimit}
                  onChange={e => setNewLimit(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs tabular-nums font-bold text-slate-800 focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="portal-button portal-button-outline px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={updateQuota.isPending}
                onClick={handleSaveQuota}
                className="portal-button portal-button-primary px-3.5 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-lg transition shadow-sm disabled:opacity-50"
              >
                {updateQuota.isPending ? 'Đang lưu…' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  );
}

export default function AdminBillingPage() {
  return (
    <AdminPage
      title="Gói cước & Hạn mức sử dụng"
      meta="Quản lý chính sách định giá, quota giờ bay và đặc quyền AI cho khách hàng"
      permission="PERMISSION_MANAGE"
      activeResource="billing"
    >
      <AdminBillingContent />
    </AdminPage>
  );
}
