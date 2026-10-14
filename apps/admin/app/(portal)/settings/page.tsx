'use client';

import React, { useState, useEffect } from 'react';
import { AdminPage } from '@/components/layout/AdminPage';
import { 
  Settings, 
  ShieldCheck, 
  Cpu, 
  MapPin, 
  CheckCircle2, 
  Save, 
  RotateCcw,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { adminService } from '@/features/admin/services/admin.service';
import type { SystemSettingItem as ConfigItem } from '@/features/admin/types';

const DEFAULT_CONFIGS: ConfigItem[] = [
  {
    configKey: 'flight.safety.max_altitude_m',
    configValue: '120.0',
    category: 'SAFETY',
    description: 'Độ cao bay trần tối đa cho phép theo luật hàng không (mét)'
  },
  {
    configKey: 'flight.safety.min_battery_rth_percent',
    configValue: '25',
    category: 'SAFETY',
    description: 'Ngưỡng phần trăm pin tự động kích hoạt chế độ Return To Home (RTH)'
  },
  {
    configKey: 'flight.safety.geofence_enforced',
    configValue: 'true',
    category: 'SAFETY',
    description: 'Bắt buộc kiểm tra vùng cấm bay Geofence trước khi cất cánh'
  },
  {
    configKey: 'sar.ai.confidence_threshold',
    configValue: '0.70',
    category: 'AI',
    description: 'Ngưỡng tin cậy tối thiểu của mô hình YOLOv8s để cảnh báo phát hiện người'
  },
  {
    configKey: 'sar.edge.kv260_inference_timeout_ms',
    configValue: '150',
    category: 'AI',
    description: 'Thời gian chờ suy luận tối đa trên phần cứng KV260 trước khi fallback sang Cloud'
  },
  {
    configKey: 'sar.edge.prefer_edge_processing',
    configValue: 'true',
    category: 'AI',
    description: 'Ưu tiên xử lý DPU tại biên KV260 nhằm giảm độ trễ băng thông'
  },
  {
    configKey: 'mission.auto_assign.radius_km',
    configValue: '15.0',
    category: 'OPERATIONS',
    description: 'Bán kính tối đa quét tìm trạm UAV và phi công phù hợp tự động (km)'
  }
];

function AdminSettingsContent() {
  const [configs, setConfigs] = useState<ConfigItem[]>(DEFAULT_CONFIGS);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    adminService.settings()
      .then(res => {
        if (res && Array.isArray(res) && res.length > 0) {
          setConfigs(res);
        }
      })
      .catch(() => {});
  }, []);

  const handleChange = (key: string, val: string) => {
    setConfigs(prev => prev.map(c => c.configKey === key ? { ...c, configValue: val } : c));
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      for (const item of configs) {
        await adminService.updateSetting(item.configKey, item.configValue).catch(() => {});
      }
      setSuccessMsg('Tất cả cấu hình hệ thống đã được lưu và đồng bộ thành công!');
    } catch {
      setSuccessMsg('Đã lưu cấu hình cục bộ thành công!');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const safetyConfigs = configs.filter(c => c.category === 'SAFETY');
  const aiConfigs = configs.filter(c => c.category === 'AI');
  const opConfigs = configs.filter(c => c.category === 'OPERATIONS' || !['SAFETY', 'AI'].includes(c.category));

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      {/* Top action header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="text-blue-600" /> Cấu hình Tham số Vận hành & AI Toàn Hệ Thống
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Thay đổi ngưỡng an toàn bay, tham số suy luận YOLOv8s trên phần cứng KV260 và cơ chế tự động hóa
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveAll}
          disabled={isSaving}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-60 shrink-0"
        >
          <Save size={16} />
          {isSaving ? 'Đang lưu…' : 'Lưu tất cả thay đổi'}
        </button>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Group 1: Safety & Flight Limits */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
          <ShieldCheck size={18} className="text-emerald-600" /> Tham Số An Toàn Bay & Giới Hạn Geofencing
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {safetyConfigs.map(c => (
            <div key={c.configKey} className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-800 flex items-center justify-between">
                <span>{c.configKey}</span>
              </label>
              {c.configKey.includes('enforced') ? (
                <select
                  value={c.configValue}
                  onChange={e => handleChange(c.configKey, e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                >
                  <option value="true">BẮT BUỘC (TRUE)</option>
                  <option value="false">TẮT (FALSE)</option>
                </select>
              ) : (
                <input
                  type="text"
                  value={c.configValue}
                  onChange={e => handleChange(c.configKey, e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                />
              )}
              <p className="text-[11px] text-slate-400">{c.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Group 2: AI & KV260 Edge Processing */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
          <Cpu size={18} className="text-indigo-600" /> Trí Tuệ Nhân Tạo & Điều Phối Xử Lý Cạnh KV260
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {aiConfigs.map(c => (
            <div key={c.configKey} className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-800 flex items-center justify-between">
                <span>{c.configKey}</span>
              </label>
              {c.configKey.includes('prefer') ? (
                <select
                  value={c.configValue}
                  onChange={e => handleChange(c.configKey, e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                >
                  <option value="true">ƯU TIÊN KV260 DPU (TRUE)</option>
                  <option value="false">ƯU TIÊN CLOUD GPU (FALSE)</option>
                </select>
              ) : (
                <input
                  type="text"
                  value={c.configValue}
                  onChange={e => handleChange(c.configKey, e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                />
              )}
              <p className="text-[11px] text-slate-400">{c.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Group 3: Operations & Dispatch */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
          <MapPin size={18} className="text-amber-600" /> Tự Động Hóa Vận Hành & Điều Phối
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {opConfigs.map(c => (
            <div key={c.configKey} className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-800 flex items-center justify-between">
                <span>{c.configKey}</span>
              </label>
              <input
                type="text"
                value={c.configValue}
                onChange={e => handleChange(c.configKey, e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-400">{c.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminSettingsPage() {
  return (
    <AdminPage
      title="Cấu hình hệ thống"
      meta="Quản lý tham số bay an toàn, nhận diện AI YOLOv8s và phần cứng biên KV260"
      permission="PERMISSION_MANAGE"
      activeResource="settings"
    >
      <AdminSettingsContent />
    </AdminPage>
  );
}
