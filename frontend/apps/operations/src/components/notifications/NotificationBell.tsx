'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, AlertCircle, Info, ShieldAlert, CheckCircle2, ChevronRight } from 'lucide-react';
import { useNotifications } from '@uav/query/notifications';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, loading, busy, error, reload, markAllRead: markAllAsRead, markOneRead: markAsRead } = useNotifications();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
        aria-label="Thông báo" aria-expanded={isOpen}
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
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-32px)] sm:w-96 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-md shadow-2xl z-50 overflow-hidden text-slate-800">
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
                onClick={markAllAsRead} disabled={busy || loading}
                className="text-xs text-[#007f3e] hover:text-[#006632] flex items-center gap-1 font-bold cursor-pointer"
              >
                <CheckCheck size={14} /> Đọc tất cả
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {loading && <p role="status" className="p-3 text-sm">Đang tải thông báo…</p>}
            {error && <div role="alert" className="p-3 text-sm">{error} <button type="button" onClick={reload}>Thử lại</button></div>}
            {!loading && !error && notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Không có thông báo nào
              </div>
            ) : (
              notifications.map(item => (
                <div
                  key={item.id}
                  role="button" tabIndex={busy ? -1 : 0} aria-disabled={busy || item.isRead}
                  onKeyDown={event => { if ((event.key === 'Enter' || event.key === ' ') && !busy && !item.isRead) { event.preventDefault(); markAsRead(item.id); } }}
                  onClick={() => !busy && !item.isRead && markAsRead(item.id)}
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
