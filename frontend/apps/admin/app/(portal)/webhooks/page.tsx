'use client';

import React, { useState, useEffect } from 'react';
import { AdminPage } from '@/components/layout/AdminPage';
import { adminService } from '@/features/admin/services/admin.service';
import type { WebhookEndpointItem, WebhookDeliveryLogItem } from '@/features/admin/types';
import { Radio, RotateCw, Send } from 'lucide-react';

const statusLabel = (status: string) => ({
  QUEUED: 'Đã xếp hàng', DELIVERED: 'Đã nhận HTTP 2xx', FAILED: 'Gửi thất bại',
  RETRYING: 'Đang chờ gửi lại', CANCELLED: 'Đã hủy — đích nhận đã xóa', UNCONFIGURED: 'Chưa cấu hình', LEGACY_UNVERIFIED: 'Lịch sử chưa xác minh',
}[status] ?? 'Chưa xác định');

function WebhooksContent() {
  const [webhooks, setWebhooks] = useState<WebhookEndpointItem[]>([]);
  const [logs, setLogs] = useState<WebhookDeliveryLogItem[]>([]);
  const [status, setStatus] = useState('UNKNOWN');
  const [loading, setLoading] = useState(true);
  const [isDispatching, setIsDispatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh(signal?: AbortSignal) {
    try {
      const [subscriptions, deliveries, runtime] = await Promise.all([
        adminService.webhooks(signal), adminService.webhookLogs(signal), adminService.webhookStatus(signal),
      ]);
      if (signal?.aborted) return;
      setWebhooks(subscriptions); setLogs(deliveries); setStatus(runtime.status);
    } catch {
      if (!signal?.aborted) { setError('Không tải được dữ liệu webhook. Kiểm tra quyền truy cập và thử lại.'); setWebhooks([]); setLogs([]); setStatus('UNKNOWN'); }
    } finally { if (!signal?.aborted) setLoading(false); }
  }
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([adminService.webhooks(controller.signal), adminService.webhookLogs(controller.signal), adminService.webhookStatus(controller.signal)])
      .then(([subscriptions, deliveries, runtime]) => {
        if (controller.signal.aborted) return;
        setWebhooks(subscriptions); setLogs(deliveries); setStatus(runtime.status); setLoading(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setError('Không tải được dữ liệu webhook. Kiểm tra quyền truy cập và thử lại.'); setLoading(false);
      });
    return () => controller.abort();
  }, []);

  async function handleTestDispatch() {
    setIsDispatching(true); setError(null); setMessage(null);
    try {
      const result = await adminService.triggerWebhookTest();
      setMessage(`${statusLabel(result.status)}. ${result.message}`);
      await refresh();
    } catch { setError('Không ghi nhận được yêu cầu thử webhook. Chưa có xác nhận gửi.'); }
    finally { setIsDispatching(false); }
  }

  return <div className="portal-management space-y-6">
    <div className="portal-card p-5 flex flex-wrap items-center justify-between gap-4">
      <div><h2 className="text-lg font-bold flex items-center gap-2"><Radio size={20} /> Webhook & tích hợp</h2>
        <p className="text-sm text-slate-500 mt-2">Kết quả HTTP xác nhận bên nhận tiếp nhận yêu cầu; chưa xác nhận xử lý cứu hộ hay điều khiển UAV.</p></div>
      <div className="flex flex-wrap gap-2">
        <button className="portal-button portal-button-outline inline-flex items-center justify-center gap-2 px-4" onClick={() => { setLoading(true); setError(null); void refresh(); }} disabled={loading}><RotateCw size={16} /> Làm mới</button>
        <button className="portal-button portal-button-primary inline-flex items-center justify-center gap-2 px-4" onClick={() => void handleTestDispatch()} disabled={loading || isDispatching || status !== 'QUEUED'}><Send size={16} /> {isDispatching ? 'Đang ghi nhận…' : 'Thử sự kiện WEBHOOK_TEST'}</button>
      </div>
    </div>
    <div className="portal-card p-4" role="status">
      {status === 'UNCONFIGURED' ? 'Chưa cấu hình gửi webhook ra ngoài. Cần cấu hình và duyệt riêng địa chỉ nhận; kích hoạt đăng ký chưa đủ để cho phép gửi.' : status === 'QUEUED' ? 'Luồng gửi đã được cấu hình. Chỉ địa chỉ được duyệt riêng mới được gửi.' : 'Chưa xác định được cấu hình gửi.'}
    </div>
    {error && <div role="alert" className="portal-card p-4 text-red-700">{error}</div>}
    {message && <div role="status" className="portal-card p-4">{message}</div>}
    {loading ? <p role="status">Đang tải dữ liệu…</p> : <>
      <section><h3 className="font-semibold mb-3">Đăng ký nhận sự kiện</h3>
        {webhooks.length === 0 ? <p>Chưa có đăng ký webhook.</p> : <div className="grid md:grid-cols-3 gap-4">{webhooks.map(item => <div key={item.id} className="portal-card p-5">
          <p className="text-xs text-slate-500">{item.isActive ? 'Đăng ký đang bật' : 'Đăng ký đang tắt'}</p><h4 className="font-semibold mt-2">{item.name}</h4>
          <p className="text-xs break-all mt-2">{item.targetUrl}</p><p className="text-xs mt-3">Sự kiện: {item.eventsSubscribed}</p>
        </div>)}</div>}
      </section>
      <section className="portal-card overflow-hidden"><h3 className="font-semibold p-5">Nhật ký phân phối · {logs.length} bản ghi gần nhất</h3>
        {logs.length === 0 ? <p className="p-5">Chưa có nhật ký phân phối.</p> : <div className="table-scroll" tabIndex={0} aria-label="Nhật ký webhook"><table className="console-table w-full text-left">
          <thead><tr><th>Đích nhận</th><th>Sự kiện</th><th>Trạng thái</th><th>HTTP</th><th>Số lần thử</th><th>Thời gian</th></tr></thead>
          <tbody>{logs.map(log => <tr key={log.id}><td>{log.subscriptionName}</td><td>{log.eventType}<div className="text-xs text-slate-500">{log.eventId ?? 'Lịch sử cũ'}</div></td><td>{statusLabel(log.deliveryStatus)}</td><td>{log.responseStatusCode ?? 'Chưa có'}</td><td>{log.retryCount}</td><td>{new Date(log.attemptedAt).toLocaleString('vi-VN')}</td></tr>)}</tbody>
        </table></div>}
      </section>
    </>}
  </div>;
}

export default function WebhooksPage() {
  return <AdminPage title="Quản lý Webhooks & Tích hợp" meta="Đăng ký nhận sự kiện và theo dõi kết quả phân phối thực tế" permission="USER_MANAGE" activeResource="webhooks"><WebhooksContent /></AdminPage>;
}
