'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  CheckCheck, 
  AlertCircle, 
  Info, 
  ShieldAlert, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';
import { PageGuard } from '@/components/layout';
import { apiClient } from '@uav/api-client';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS';
  isRead: boolean;
  createdAt: string;
}

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'cn-1',
    title: 'Hóa đơn dịch vụ tháng 10/2026 đã phát hành',
    message: 'Hóa đơn INV-2026-004 đã được tạo cho các giờ bay bổ sung trong nhiệm vụ cứu hộ Lan Hạ.',
    type: 'INFO',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString()
  },
  {
    id: 'cn-2',
    title: 'Nhiệm vụ giám sát môi trường hoàn thành',
    message: 'Dữ liệu ảnh và video độ phân giải 4K đã sẵn sàng tải về trong thư mục Media.',
    type: 'SUCCESS',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString()
  },
  {
    id: 'cn-3',
    title: 'Chào mừng quý khách đến với UAV PAS',
    message: 'Tài khoản của bạn đã được cấu hình thành công với gói dịch vụ Chuyên nghiệp (Pro).',
    type: 'INFO',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString()
  }
];

export default function CustomerNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(DEFAULT_NOTIFICATIONS);

  useEffect(() => {
    apiClient.get<any>('/api/v1/notifications?size=20')
      .then(res => {
        if (res?.content && Array.isArray(res.content)) {
          setNotifications(res.content);
        }
      })
      .catch(() => {});
  }, []);

  const markAllRead = async () => {
    try {
      await apiClient.post('/api/v1/notifications/read-all');
    } catch {}
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const markOneRead = async (id: string) => {
    try {
      await apiClient.patch(`/api/v1/notifications/${id}/read`);
    } catch {}
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <PageGuard permission={null}>
      <div className="space-y-6 max-w-4xl mx-auto pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Bell className="text-blue-600" /> Thông báo & Tin nhắn hệ thống
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Nhận thông tin cập nhật về tiến độ bay, hóa đơn phát hành và trạng thái đặt dịch vụ UAV
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition border border-blue-200"
            >
              <CheckCheck size={14} /> Đọc tất cả ({unreadCount})
            </button>
          )}
        </div>

        <div className="space-y-3">
          {notifications.map(item => (
            <div
              key={item.id}
              onClick={() => !item.isRead && markOneRead(item.id)}
              className={`p-4 rounded-xl border transition cursor-pointer flex gap-4 ${
                !item.isRead
                  ? 'bg-blue-50/40 border-blue-300 shadow-sm'
                  : 'bg-white border-slate-200 hover:bg-slate-50/70'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {item.type === 'ALERT' && <ShieldAlert size={20} className="text-rose-500" />}
                {item.type === 'WARNING' && <AlertCircle size={20} className="text-amber-500" />}
                {item.type === 'SUCCESS' && <CheckCircle2 size={20} className="text-emerald-500" />}
                {item.type === 'INFO' && <Info size={20} className="text-blue-500" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className={`text-sm font-semibold ${!item.isRead ? 'text-slate-900' : 'text-slate-700'}`}>
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock size={12} />
                    <span>{new Date(item.createdAt).toLocaleString('vi-VN')}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {item.message}
                </p>
              </div>

              {!item.isRead && (
                <div className="self-center shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 block ring-4 ring-blue-100" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </PageGuard>
  );
}
