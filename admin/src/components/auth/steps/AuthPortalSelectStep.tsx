'use client';

import React from 'react';
import {ArrowRight, Briefcase, Radar, ShieldCheck} from 'lucide-react';
import {Button} from '@/components/ui';
import type {Portal} from '@/types/auth/auth.types';

export interface AuthPortalSelectStepProps {
    portals: Portal[];
    onSelectPortal: (destination: string) => void;
}

export function AuthPortalSelectStep({portals, onSelectPortal}: AuthPortalSelectStepProps) {
    return (
        <div className="space-y-4">
            <div className="text-center">
                <h2 id="auth-modal-title" className="text-lg font-extrabold tracking-tight text-slate-900">
                    Chọn cổng truy cập
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                    Tài khoản của bạn có quyền truy cập nhiều phân hệ. Chọn cổng làm việc để bắt đầu:
                </p>
            </div>

            <div className="space-y-2.5">
                {portals.includes('admin') && (
                    <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        onClick={() => onSelectPortal('/admin/dashboard')}
                        className="group h-auto w-full justify-between gap-3 border-slate-200 bg-slate-50/70 p-3.5 text-left font-normal hover:border-primary hover:bg-uav-red-light/40"
                    >
                        <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-primary text-white">
                                <ShieldCheck size={18}/>
                            </span>
                            <div>
                                <div className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                                    Cổng Quản trị (Admin)
                                </div>
                                <div className="mt-0.5 text-[11px] text-slate-500">
                                    Người dùng, phân quyền RBAC, tài chính &amp; cấu hình hệ thống
                                </div>
                            </div>
                        </div>
                        <ArrowRight size={16} className="shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"/>
                    </Button>
                )}

                {portals.includes('operations') && (
                    <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        onClick={() => onSelectPortal('/operations/overview')}
                        className="group h-auto w-full justify-between gap-3 border-slate-200 bg-slate-50/70 p-3.5 text-left font-normal hover:border-uav-blue hover:bg-uav-blue-light/40"
                    >
                        <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-uav-blue text-white">
                                <Radar size={18}/>
                            </span>
                            <div>
                                <div className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                                    Cổng Điều hành (Operations)
                                </div>
                                <div className="mt-0.5 text-[11px] text-slate-500">
                                    Điều phối nhiệm vụ bay, đội tàu UAV, trạm &amp; SAR
                                </div>
                            </div>
                        </div>
                        <ArrowRight size={16} className="shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-uav-blue"/>
                    </Button>
                )}

                {portals.includes('customer') && (
                    <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        onClick={() => onSelectPortal('/customer/dashboard')}
                        className="group h-auto w-full justify-between gap-3 border-slate-200 bg-slate-50/70 p-3.5 text-left font-normal hover:border-primary hover:bg-uav-red-light/40"
                    >
                        <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-slate-300 bg-white text-primary">
                                <Briefcase size={18}/>
                            </span>
                            <div>
                                <div className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                                    Cổng Khách hàng (Customer)
                                </div>
                                <div className="mt-0.5 text-[11px] text-slate-500">
                                    Gửi yêu cầu bay và theo dõi tiến độ nhiệm vụ
                                </div>
                            </div>
                        </div>
                        <ArrowRight size={16} className="shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"/>
                    </Button>
                )}
            </div>
        </div>
    );
}
