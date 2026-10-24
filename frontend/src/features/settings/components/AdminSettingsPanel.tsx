'use client';

import React, {useEffect, useState} from 'react';
import {settingLabel} from "@/components/shared/presentation";
import {AdminPage} from '@/components/layout/AdminPage';
import {CheckCircle2, Cpu, MapPin, Save, ShieldCheck} from 'lucide-react';
import {adminService} from "@/lib/api/admin";
import type {SystemSettingItem as ConfigItem} from "@/types/admin";
import {useI18n} from '@/contexts/I18nContext';

function AdminSettingsContent() {
    const [configs, setConfigs] = useState<ConfigItem[]>([]);
    const [original, setOriginal] = useState<ConfigItem[]>([]);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const {t} = useI18n();

    useEffect(() => {
        adminService.settings()
            .then(res => {
                setConfigs(res);
                setOriginal(res);
            })
            // Stored as a catalog key so the effect stays locale-independent; rendered through t().
            .catch(() => setErrorMsg('admin.settings.loadError'))
            .finally(() => setIsLoading(false));
    }, []);

    const handleChange = (key: string, val: string) => {
        setConfigs(prev => prev.map(c => c.configKey === key ? {...c, configValue: val} : c));
    };

    const handleSaveAll = async () => {
        setIsSaving(true);
        setErrorMsg(null);
        setSuccessMsg(null);
        try {
            const changed = configs.filter(item => original.find(c => c.configKey === item.configKey)?.configValue !== item.configValue);
            // Disable first, persist an explicit price next, and enable only after the price is saved.
            const order = (item: ConfigItem) => item.configKey === 'billing.auto_generate_invoice' ? (item.configValue === 'false' ? 0 : 3) : item.configKey === 'billing.hourly_rate_vnd' ? 1 : 2;
            for (const item of changed.sort((a, b) => order(a) - order(b))) {
                await adminService.updateSetting(item.configKey, item.configValue);
            }
            setOriginal(configs);
            setSuccessMsg(changed.length ? t('admin.settings.saved') : t('admin.settings.noChanges'));
        } catch (error) {
            setErrorMsg(t('admin.settings.partialSave', {detail: error instanceof Error ? error.message : t('admin.settings.checkAndRetry')}));
        } finally {
            setIsSaving(false);
        }
    };

    const safetyConfigs = configs.filter(c => c.category === 'SAFETY');
    const aiConfigs = configs.filter(c => (c.category === 'AI' || c.category === 'AI_EDGE'));
    const opConfigs = configs.filter(c => c.category === 'OPERATIONS' || !['SAFETY', 'AI', 'AI_EDGE'].includes(c.category));

    return (
        <div className="space-y-6 pb-12">
            {/* Top action header */}
            <div
                className="flex flex-col gap-4 rounded-panel border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-end">

                <button
                    type="button"
                    onClick={handleSaveAll}
                    disabled={isSaving || isLoading || configs.length === 0}
                    className="flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-control bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <Save size={16}/>
                    {isSaving ? t('admin.settings.saving') : t('admin.settings.saveAll')}
                </button>
            </div>

            {isLoading && <p role="status">{t('admin.settings.loading')}</p>}
            {errorMsg && <p role="alert" className="text-sm text-red-700">{t(errorMsg)}</p>}
            <p className="text-sm text-slate-500">{t('admin.settings.invoiceNote')}</p>
            {/* Success Notification */}
            {successMsg && (
                <div
                    className="flex items-center gap-2 rounded-panel border border-blue-200 bg-uav-blue-light px-4 py-3 text-xs font-semibold text-uav-blue">
                    <CheckCircle2 size={16} className="shrink-0 text-uav-blue"/>
                    <span>{successMsg}</span>
                </div>
            )}

            {/* Group 1: Safety & Flight Limits */}
            <div className="space-y-4 rounded-panel border border-border bg-card p-6">
                <h3 className="flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-900">
                    <ShieldCheck size={18} className="text-primary"/> {t('admin.settings.safetyGroup')}
                </h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {safetyConfigs.map(c => (
                        <div key={c.configKey} className="space-y-1.5">
                            <label htmlFor={`setting-${c.configKey}`} className="text-sm font-semibold text-slate-800">
                                <span>{settingLabel(c.configKey, c.description)}</span>
                            </label>
                            {c.configKey.includes('enforced') ? (
                                <select
                                    id={`setting-${c.configKey}`}
                                    disabled={isSaving}
                                    value={c.configValue}
                                    onChange={e => handleChange(c.configKey, e.target.value)}
                                    className="min-h-[44px] w-full rounded-control border border-border-input bg-slate-50 p-2.5 text-xs font-semibold text-slate-900 focus:border-primary focus:outline-none"
                                >
                                    <option value="true">{t('admin.settings.enforced')}</option>
                                    <option value="false">{t('admin.settings.off')}</option>
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    id={`setting-${c.configKey}`}
                                    disabled={isSaving}
                                    value={c.configValue}
                                    onChange={e => handleChange(c.configKey, e.target.value)}
                                    className="min-h-[44px] w-full rounded-control border border-border-input bg-slate-50 p-2.5 tabular-nums text-xs font-bold text-slate-900 focus:border-primary focus:outline-none"
                                />
                            )}
                            <p className="text-sm text-slate-500">{c.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Group 2: AI & KV260 Edge Processing */}
            <div className="space-y-4 rounded-panel border border-border bg-card p-6">
                <h3 className="flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-900">
                    <Cpu size={18} className="text-indigo-600"/> {t('admin.settings.aiGroup')}
                </h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {aiConfigs.map(c => (
                        <div key={c.configKey} className="space-y-1.5">
                            <label htmlFor={`setting-${c.configKey}`} className="text-sm font-semibold text-slate-800">
                                <span>{settingLabel(c.configKey, c.description)}</span>
                            </label>
                            {c.configKey.includes('prefer') ? (
                                <select
                                    id={`setting-${c.configKey}`}
                                    disabled={isSaving}
                                    value={c.configValue}
                                    onChange={e => handleChange(c.configKey, e.target.value)}
                                    className="min-h-[44px] w-full rounded-control border border-border-input bg-slate-50 p-2.5 text-xs font-semibold text-slate-900 focus:border-primary focus:outline-none"
                                >
                                    <option value="true">{t('admin.settings.preferEdge')}</option>
                                    <option value="false">{t('admin.settings.preferServer')}</option>
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    id={`setting-${c.configKey}`}
                                    disabled={isSaving}
                                    value={c.configValue}
                                    onChange={e => handleChange(c.configKey, e.target.value)}
                                    className="min-h-[44px] w-full rounded-control border border-border-input bg-slate-50 p-2.5 tabular-nums text-xs font-bold text-slate-900 focus:border-primary focus:outline-none"
                                />
                            )}
                            <p className="text-sm text-slate-500">{c.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Group 3: Operations & Dispatch */}
            <div className="space-y-4 rounded-panel border border-border bg-card p-6">
                <h3 className="flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-900">
                    <MapPin size={18} className="text-amber-600"/> {t('admin.settings.opsGroup')}
                </h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {opConfigs.map(c => (
                        <div key={c.configKey} className="space-y-1.5">
                            <label htmlFor={`setting-${c.configKey}`} className="text-sm font-semibold text-slate-800">
                                <span>{settingLabel(c.configKey, c.description)}</span>
                            </label>
                            <input
                                type="text"
                                id={`setting-${c.configKey}`}
                                disabled={isSaving}
                                value={c.configValue}
                                onChange={e => handleChange(c.configKey, e.target.value)}
                                className="min-h-[44px] w-full rounded-control border border-border-input bg-slate-50 p-2.5 tabular-nums text-xs font-bold text-slate-900 focus:border-primary focus:outline-none"
                            />
                            <p className="text-sm text-slate-500">{c.description}</p>
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
            title="admin.pages.settings.title"
            permission="PERMISSION_MANAGE"
            activeResource="settings"
        >
            <AdminSettingsContent/>
        </AdminPage>
    );
}
