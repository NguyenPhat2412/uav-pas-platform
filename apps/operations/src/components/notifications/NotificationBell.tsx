'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, AlertCircle, Info, ShieldAlert, CheckCircle2, ChevronRight } from 'lucide-react';
import { apiClient } from '@uav/api-client';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS';
  isRead: boolean;
  createdAt: string;
}

const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n-01',
    title: 'Phát hiện mục tiêu người khả nghi',
    message: 'Hệ thống YOLOv8s trên UAV Matrice 350 RTK vừa nhận diện nạn nhân tại Vịnh Lan Hạ (94.2% tin cậy).',
    type: 'ALERT',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 3).toISOString()
  },
  {
    id: 'n-02',
    title: 'Cảnh báo pin trạm ST-01',
    message: 'Pin dự phòng TB65 (SN: BAT-TB65-021) tại Trạm Cát Bà đạt 200 chu kỳ sạc, khuyến nghị bảo dưỡng.',
    type: 'WARNING',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString()
  },
  {
    id: 'n-03',
    title: 'Phân công nhiệm vụ mới',
    message: 'Bạn được phân công làm phi công chỉ huy cho chiến dịch SAR-2026-004.',
    type: 'INFO',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
  }
];

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(MOCK_NOTIFICATIONS);
  const [unreadCount, setUnreadCount] = useState<number>(2);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Attempt fetch from backend API with fallback to mock
    apiClient.get<{ unreadCount: number }>('/api/v1/notifications/unread-count')
      .then(res => {
        if (res && typeof res.unreadCount === 'number') {
          setUnreadCount(res.unreadCount);
        }
      })
      .catch(() => {
        // Fallback to local count
        setUnreadCount(notifications.filter(n => !n.isRead).length);
      });

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notifications]);

  const markAllAsRead = async () => {
    try {
      await apiClient.post('/api/v1/notifications/read-all');
    } catch {
      // Local fallback
    }
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const markAsRead = async (id: string) => {
    try {
      await apiClient.patch(`/api/v1/notifications/${id}/read`);
    } catch {
      // Local fallback
    }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
        aria-label="Thông báo"
        title="Trung tâm thông báo"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ab2523] px-1 text-[10px] font-bold text-white shadow-xs ring-2 ring-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-md shadow-2xl z-50 overflow-hidden text-slate-800">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50/80">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900">Thông báo</span>
              {unreadCount > 0 && (
                <span className="bg-[#fef2f2] text-[#ab2523] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#fecdd3]">
                  {unreadCount} mới
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-xs text-[#007f3e] hover:text-[#006632] flex items-center gap-1 font-bold cursor-pointer"
              >
                <CheckCheck size={14} /> Đọc tất cả
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Không có thông báo nào
              </div>
            ) : (
              notifications.map(item => (
                <div
                  key={item.id}
                  onClick={() => !item.isRead && markAsRead(item.id)}
                  className={`p-3.5 hover:bg-slate-50 transition cursor-pointer flex gap-3 ${
                    !item.isRead ? 'bg-[#fef2f2]/30' : ''
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {item.type === 'ALERT' && <ShieldAlert size={16} className="text-[#ab2523]" />}
                    {item.type === 'WARNING' && <AlertCircle size={16} className="text-amber-500" />}
                    {item.type === 'SUCCESS' && <CheckCircle2 size={16} className="text-[#007f3e]" />}
                    {item.type === 'INFO' && <Info size={16} className="text-sky-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-xs font-bold truncate ${!item.isRead ? 'text-slate-900' : 'text-slate-600'}`}>
                        {item.title}
                      </p>
                      {!item.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#ab2523] shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-slate-100 p-2.5 bg-slate-50 text-center">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs text-slate-600 hover:text-[#ab2523] font-bold inline-flex items-center gap-1 py-1 transition"
            >
              Xem tất cả thông báo <ChevronRight size={13} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
