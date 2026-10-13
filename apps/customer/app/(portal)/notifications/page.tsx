'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCheck,
  AlertCircle,
  Info,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Filter,
} from 'lucide-react';
import { PageGuard } from '@/components/layout';
import { Button, Panel } from '@/components/ui';
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
    title: 'UAV-VJU-01 đã cất cánh cho nhiệm vụ MS-2026-001',
    message: 'Tổ hợp DJI Matrice 300 RTK tích hợp AI AMD KV260 đã bắt đầu quét vùng biển Vịnh Lan Hạ theo quỹ đạo IAMSAR.',
    type: 'ALERT',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  },
  {
    id: 'cn-2',
    title: 'Hóa đơn dịch vụ tháng 10/2026 đã phát hành',
    message: 'Hóa đơn INV-2026-004 đã được tạo cho các giờ bay bổ sung trong nhiệm vụ cứu hộ Lan Hạ. Vui lòng kiểm tra mục Thanh toán & Hạn mức.',
    type: 'WARNING',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
  },
  {
    id: 'cn-3',
    title: 'Nhiệm vụ khảo sát Vườn Quốc Gia Cát Bà hoàn thành',
    message: 'Dữ liệu ảnh Orthophoto 3D RTK và tệp GeoJSON lộ trình đã sẵn sàng tải về qua liên kết bảo mật trong chi tiết nhiệm vụ MS-2026-002.',
    type: 'SUCCESS',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
  },
  {
    id: 'cn-4',
    title: 'Chào mừng quý đối tác đến với Hệ sinh thái VJU UAV PAS',
    message: 'Tài khoản của bạn đã được cấu hình thành công với gói dịch vụ Doanh Nghiệp (Enterprise) cùng hạn mức 25 giờ bay/tháng.',
    type: 'INFO',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
  },
];

export default function CustomerNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(DEFAULT_NOTIFICATIONS);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');

  useEffect(() => {
    apiClient
      .get<any>('/api/v1/notifications?size=20')
      .then(res => {
        if (res?.content && Array.isArray(res.content) && res.content.length > 0) {
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
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const visibleItems = filter === 'UNREAD' ? notifications.filter(n => !n.isRead) : notifications;

  const getBadgeStyle = (type: NotificationItem['type']) => {
    switch (type) {
      case 'ALERT':
        return { bg: '#fef2f2', border: '#fecaca', color: '#ab2523', label: 'Khẩn cấp' };
      case 'WARNING':
        return { bg: '#fffbeb', border: '#fde68a', color: '#b45309', label: 'Cảnh báo' };
      case 'SUCCESS':
        return { bg: '#ecfdf5', border: '#a7f3d0', color: '#007f3e', label: 'Hoàn tất' };
      default:
        return { bg: '#f1f5f9', border: '#cbd5e1', color: '#334155', label: 'Hệ thống' };
    }
  };

  return (
    <PageGuard permission={null}>
      <div className="page-heading">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bell size={24} color="#ab2523" /> Thông báo &amp; Tin nhắn hệ thống
          </h1>
          <p>Nhận thông tin cập nhật tức thời về tiến độ bay, cảnh báo SAR, hóa đơn phát hành và trạng thái đặt dịch vụ UAV.</p>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: 4, borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <button
              type="button"
              onClick={() => setFilter('ALL')}
              style={{
                border: 0,
                background: filter === 'ALL' ? '#ffffff' : 'transparent',
                color: filter === 'ALL' ? '#0f172a' : '#64748b',
                fontWeight: 700,
                fontSize: 12.5,
                padding: '6px 12px',
                borderRadius: 7,
                cursor: 'pointer',
                boxShadow: filter === 'ALL' ? '0 1px 2px rgba(15,23,42,0.08)' : 'none',
              }}
            >
              Tất cả ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('UNREAD')}
              style={{
                border: 0,
                background: filter === 'UNREAD' ? '#ffffff' : 'transparent',
                color: filter === 'UNREAD' ? '#ab2523' : '#64748b',
                fontWeight: 700,
                fontSize: 12.5,
                padding: '6px 12px',
                borderRadius: 7,
                cursor: 'pointer',
                boxShadow: filter === 'UNREAD' ? '0 1px 2px rgba(15,23,42,0.08)' : 'none',
              }}
            >
              Chưa đọc ({unreadCount})
            </button>
          </div>
          {unreadCount > 0 && (
            <Button type="button" variant="secondary" onClick={markAllRead}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <CheckCheck size={15} /> Đánh dấu đã đọc ({unreadCount})
              </span>
            </Button>
          )}
        </div>
      </div>

      <Panel
        title="Danh sách thông báo gần đây"
        action={
          <span className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <Filter size={13} /> Nhấn vào từng thông báo để xác nhận đã đọc
          </span>
        }
      >
        {visibleItems.length === 0 ? (
          <div className="empty">Bạn đã đọc toàn bộ thông báo mới nhất.</div>
        ) : (
          <div className="stack" style={{ gap: 12 }}>
            {visibleItems.map(item => {
              const badge = getBadgeStyle(item.type);
              return (
                <div
                  key={item.id}
                  onClick={() => !item.isRead && markOneRead(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 14,
                    padding: '16px 18px',
                    borderRadius: 12,
                    border: !item.isRead ? '1px solid rgba(171, 37, 35, 0.28)' : '1px solid #e2e8f0',
                    background: !item.isRead ? 'linear-gradient(90deg, rgba(171, 37, 35, 0.04) 0%, #ffffff 100%)' : '#ffffff',
                    cursor: !item.isRead ? 'pointer' : 'default',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      background: badge.bg,
                      border: `1px solid ${badge.border}`,
                      color: badge.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    {item.type === 'ALERT' && <ShieldAlert size={19} />}
                    {item.type === 'WARNING' && <AlertCircle size={19} />}
                    {item.type === 'SUCCESS' && <CheckCircle2 size={19} />}
                    {item.type === 'INFO' && <Info size={19} />}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 999,
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                          }}
                        >
                          {badge.label}
                        </span>
                        <strong style={{ fontSize: 14.5, color: !item.isRead ? '#0f172a' : '#334155' }}>
                          {item.title}
                        </strong>
                      </div>
                      <span className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                        <Clock size={12} />
                        {new Date(item.createdAt).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <p className="muted" style={{ margin: '8px 0 0', fontSize: 13.5, lineHeight: 1.55 }}>
                      {item.message}
                    </p>
                  </div>

                  {!item.isRead && (
                    <div style={{ alignSelf: 'center', flexShrink: 0 }} title="Chưa đọc">
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 999,
                          background: '#ab2523',
                          display: 'block',
                          boxShadow: '0 0 0 4px rgba(171, 37, 35, 0.14)',
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </PageGuard>
  );
}
