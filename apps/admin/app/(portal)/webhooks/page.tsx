'use client';

import React, { useState } from 'react';
import { AdminPage } from '@/components/layout/AdminPage';
import { 
  Radio, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ShieldCheck, 
  ExternalLink,
  Zap,
  KeyRound,
  RotateCw
} from 'lucide-react';

interface WebhookItem {
  id: number;
  name: string;
  targetUrl: string;
  secretKey: string;
  eventsSubscribed: string;
  isActive: boolean;
}

const DEFAULT_WEBHOOKS: WebhookItem[] = [
  {
    id: 1,
    name: 'Trung tâm Phối hợp Tìm kiếm Cứu nạn Hàng hải Việt Nam (VMRCC 114)',
    targetUrl: 'https://api.vmrcc.gov.vn/webhook/v1/sar-alerts',
    secretKey: 'vju_sec_vmrcc_7f3e8f1c_9948',
    eventsSubscribed: 'SAR_EMERGENCY_TRIGGERED,BATTERY_CRITICAL_RTH',
    isActive: true,
  },
  {
    id: 2,
    name: 'Trạm Thông tin Duyên hải Hải Phòng (Hai Phong Coastal Radio)',
    targetUrl: 'https://coastal.haiphong.gov.vn/api/uav-geofence-breach',
    secretKey: 'vju_sec_coastal_ab2523_007f',
    eventsSubscribed: 'GEOFENCE_BREACH,SAR_EMERGENCY_TRIGGERED',
    isActive: true,
  },
  {
    id: 3,
    name: 'Cổng Thanh toán VietQR NAPAS 247 Listener',
    targetUrl: 'https://pay.uavpas.vju.edu.vn/api/v1/billing/webhook/payment-ipn',
    secretKey: 'vju_sec_napas_ipn_pay_2026',
    eventsSubscribed: 'PAYMENT_COMPLETED',
    isActive: true,
  },
];

interface DeliveryLogItem {
  id: string;
  targetName: string;
  eventType: string;
  statusCode: number;
  durationMs: number;
  timestamp: string;
  signature: string;
}

const INITIAL_LOGS: DeliveryLogItem[] = [
  {
    id: 'LOG-8819',
    targetName: 'Trung tâm VMRCC 114',
    eventType: 'SAR_EMERGENCY_TRIGGERED',
    statusCode: 200,
    durationMs: 84,
    timestamp: '14:30:12',
    signature: 'sha256=9f82d9a102b4e8c...',
  },
  {
    id: 'LOG-8820',
    targetName: 'Đài Duyên hải Hải Phòng',
    eventType: 'GEOFENCE_BREACH',
    statusCode: 200,
    durationMs: 112,
    timestamp: '14:30:14',
    signature: 'sha256=14a87c9f8021da3...',
  },
];

function WebhooksContent() {
  const [webhooks, setWebhooks] = useState<WebhookItem[]>(DEFAULT_WEBHOOKS);
  const [logs, setLogs] = useState<DeliveryLogItem[]>(INITIAL_LOGS);
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchSuccessMsg, setDispatchSuccessMsg] = useState<string | null>(null);

  const handleTestDispatch = () => {
    setIsDispatching(true);
    setTimeout(() => {
      const newLog: DeliveryLogItem = {
        id: 'LOG-' + Math.floor(1000 + Math.random() * 9000),
        targetName: 'Trung tâm VMRCC 114',
        eventType: 'SAR_EMERGENCY_TRIGGERED',
        statusCode: 200,
        durationMs: Math.floor(65 + Math.random() * 50),
        timestamp: new Date().toLocaleTimeString('vi-VN'),
        signature: 'sha256=ab2523007f3e8f1c...',
      };
      setLogs(prev => [newLog, ...prev]);
      setIsDispatching(false);
      setDispatchSuccessMsg('Đã phát sự kiện cứu nạn khẩn cấp có chữ ký HMAC-SHA256 tới 3 hệ thống liên kết!');
      setTimeout(() => setDispatchSuccessMsg(null), 3000);
    }, 700);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Test Trigger Button */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Radio className="text-[#ab2523]" /> Quản Lý Webhook & Tích Hợp Hệ Thống Bên Thứ Ba
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cơ chế thông báo sự kiện tác chiến thời gian thực, ký số xác thực HMAC-SHA256 và giám sát phân phối
          </p>
        </div>

        <button
          type="button"
          disabled={isDispatching}
          onClick={handleTestDispatch}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#ab2523] hover:bg-[#8f1c1a] text-white rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-60 shrink-0"
        >
          <Zap size={16} />
          {isDispatching ? 'Đang phát Webhook…' : 'Phát Báo Động SAR Thử Nghiệm'}
        </button>
      </div>

      {dispatchSuccessMsg && (
        <div className="bg-[#ecfdf5] border border-[#a7f3d0] rounded-xl p-4 flex items-center gap-2.5 text-xs text-[#007f3e] font-semibold animate-pulse shadow-sm">
          <CheckCircle2 size={18} className="shrink-0" />
          <span>{dispatchSuccessMsg}</span>
        </div>
      )}

      {/* Webhook Subscriptions Grid */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
          <KeyRound size={16} className="text-slate-500" /> Các Kênh Đăng Ký Nhận Sự Kiện Khẩn Cấp (Active Subscriptions)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {webhooks.map(wh => (
            <div key={wh.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between hover:border-[#ab2523] transition">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#ecfdf5] text-[#007f3e] border border-[#a7f3d0]">
                    KÍCH HOẠT
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">ID: #{wh.id}</span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm">{wh.name}</h4>
                <p className="font-mono text-[11px] text-slate-500 mt-2 truncate" title={wh.targetUrl}>
                  {wh.targetUrl}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Mã ký HMAC:</span>
                    <strong className="font-mono text-slate-700">{wh.secretKey.slice(0, 12)}***</strong>
                  </div>
                  <div className="flex flex-col gap-1 mt-2">
                    <span className="text-slate-500 text-[11px]">Sự kiện đăng ký:</span>
                    <div className="flex flex-wrap gap-1">
                      {wh.eventsSubscribed.split(',').map(ev => (
                        <span key={ev} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono">
                          {ev}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Webhook Delivery Logs Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Clock size={16} className="text-slate-500" /> Nhật Ký Phân Phối Sự Kiện (Webhook Delivery Logs)
          </h3>
          <span className="text-xs text-slate-500 font-medium">{logs.length} bản ghi</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Mã Nhật Ký</th>
                <th className="px-5 py-3">Hệ Thống Đích</th>
                <th className="px-5 py-3">Sự Kiện</th>
                <th className="px-5 py-3">Chữ Ký Mật Mã (HMAC-SHA256)</th>
                <th className="px-5 py-3">Mã HTTP</th>
                <th className="px-5 py-3">Độ Trễ</th>
                <th className="px-5 py-3">Thời Gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition">
                  <td className="px-5 py-3.5 font-mono font-bold text-slate-900">{log.id}</td>
                  <td className="px-5 py-3.5 font-medium text-slate-800">{log.targetName}</td>
                  <td className="px-5 py-3.5">
                    <span className="px-2 py-0.5 rounded bg-[#fdf2f2] text-[#ab2523] font-mono font-bold text-[10px] border border-[#fecaca]">
                      {log.eventType}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-slate-500 text-[11px]">{log.signature}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-[#ecfdf5] text-[#007f3e]">
                      <CheckCircle2 size={12} /> {log.statusCode} OK
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-slate-700">{log.durationMs} ms</td>
                  <td className="px-5 py-3.5 text-slate-500">{log.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function WebhooksPage() {
  return (
    <AdminPage
      title="Quản lý Webhooks & Tích Hợp"
      meta="Quản lý đăng ký callback bên thứ ba, ký số HMAC-SHA256 và nhật ký truyền tin"
      permission="PERMISSION_MANAGE"
      activeResource="webhooks"
    >
      <WebhooksContent />
    </AdminPage>
  );
}
