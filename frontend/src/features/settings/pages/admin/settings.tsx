'use client';

import React, {useEffect, useState} from 'react';
import {settingLabel} from "@/components/shared/presentation";
import {AdminPage} from '@/components/layout/AdminPage';
import {CheckCircle2, Cpu, MapPin, Save, Settings, ShieldCheck} from 'lucide-react';
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
        <div className="portal-management space-y-6 max-w-4xl pb-12">
            {/* Top action header */}
            <div
                className="portal-card bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <Settings className="text-primary"/> {t('admin.settings.heading')}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        {t('admin.settings.intro')}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleSaveAll}
                    disabled={isSaving || isLoading || configs.length === 0}
                    className="portal-button portal-button-primary flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-60 shrink-0"
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
                    className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm animate-fade-in">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0"/>
                    <span>{successMsg}</span>
                </div>
            )}

            {/* Group 1: Safety & Flight Limits */}
            <div className="portal-card bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
                    <ShieldCheck size={18} className="text-emerald-600"/> {t('admin.settings.safetyGroup')}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-primary"
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
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-primary"
                                />
                            )}
                            <p className="text-sm text-slate-500">{c.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Group 2: AI & KV260 Edge Processing */}
            <div className="portal-card bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Cpu size={18} className="text-indigo-600"/> {t('admin.settings.aiGroup')}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-primary"
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
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-primary"
                                />
                            )}
                            <p className="text-sm text-slate-500">{c.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Group 3: Operations & Dispatch */}
            <div className="portal-card bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
                    <MapPin size={18} className="text-amber-600"/> {t('admin.settings.opsGroup')}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-primary"
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
            meta="admin.pages.settings.meta"
            permission="PERMISSION_MANAGE"
            activeResource="settings"
        >
            <AdminSettingsContent/>
        </AdminPage>
    );
}
