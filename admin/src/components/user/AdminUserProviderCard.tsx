'use client';

import Link from 'next/link';
import {ArrowRight, BadgeCheck, FileCheck2, Landmark, Store} from 'lucide-react';
import {useAdminProviders} from '@/hooks/marketplace/useAdminMarketplace';
import {Badge, Card, CardContent, CardHeader, CardTitle, StatusBadge} from '@/components/ui';

export function AdminUserProviderCard({userId, username}: { userId: number; username: string }) {
    const query = useAdminProviders('', username, 0);
    const provider = (query.data?.content ?? []).find(
        item => item.userId === userId || item.username === username
    );

    return (
        <Card className="border-border" aria-labelledby="admin-user-provider-title">
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0 border-b border-border bg-slate-50/70 px-5 py-3.5">
                <CardTitle id="admin-user-provider-title" className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Store size={16} className="text-primary" aria-hidden="true"/>
                    Hồ sơ Đối tác Nhà cung cấp Sàn UAV (3P Seller KYC)
                </CardTitle>
                <div className="flex items-center gap-2">
                    {provider ? (
                        <StatusBadge status={provider.verificationStatus}/>
                    ) : !query.isPending ? (
                        <Badge variant="outline">Chưa đăng ký đối tác bán hàng</Badge>
                    ) : null}
                    <Link
                        href="/admin/marketplace/providers"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                        Thẩm định KYC Đối tác
                        <ArrowRight size={13} aria-hidden="true"/>
                    </Link>
                </div>
            </CardHeader>
            <CardContent className="p-5">
                {query.isPending ? (
                    <p className="m-0 text-sm text-slate-500">Đang kiểm tra hồ sơ đối tác trên sàn...</p>
                ) : !provider ? (
                    <p className="m-0 text-sm text-slate-600">
                        Tài khoản <strong className="text-slate-900">@{username}</strong> hiện đang hoạt động với vai trò Khách hàng / Người vận hành và chưa mở gian hàng Nhà cung cấp trên Sàn giao dịch.
                    </p>
                ) : (
                    <div className="space-y-4">
                        <dl className="m-0 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <div>
                                <dt className="text-xs font-medium text-slate-500">Tên gian hàng &amp; Loại hình</dt>
                                <dd className="m-0 mt-1 flex items-center gap-1.5 font-semibold text-slate-900">
                                    {provider.verificationStatus === 'VERIFIED' && (
                                        <BadgeCheck size={15} className="text-primary" aria-hidden="true"/>
                                    )}
                                    {provider.displayName} ({provider.providerType})
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-slate-500">MST / CCCD &amp; Giấy phép bay</dt>
                                <dd className="m-0 mt-1 font-semibold text-slate-900">
                                    {provider.taxOrIdNumber || '—'} · {provider.flightLicenseNumber || '—'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-slate-500">Khu vực hoạt động</dt>
                                <dd className="m-0 mt-1 font-semibold text-slate-900">
                                    {provider.province} ({provider.serviceRadiusKm} km)
                                </dd>
                            </div>
                            <div>
                                <dt className="flex items-center gap-1 text-xs font-medium text-slate-500">
                                    <Landmark size={12} aria-hidden="true"/>
                                    Tài khoản nhận Payout
                                </dt>
                                <dd className="m-0 mt-1 font-semibold text-slate-900">
                                    {provider.bankName
                                        ? `${provider.bankName} · ${provider.bankAccountNumber || ''} (${provider.bankAccountHolder || ''})`
                                        : 'Chưa cập nhật ngân hàng'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-slate-500">Phụ lục Biểu phí đối soát</dt>
                                <dd className="m-0 mt-1 font-semibold text-slate-900">
                                    {provider.commissionRateOverride != null
                                        ? `${Math.round(provider.commissionRateOverride * 100)}% (Phụ lục riêng)`
                                        : 'Theo Phụ lục khung hệ thống'}
                                </dd>
                            </div>
                            <div>
                                <dt className="flex items-center gap-1 text-xs font-medium text-slate-500">
                                    <FileCheck2 size={12} aria-hidden="true"/>
                                    Chứng từ KYC &amp; Đơn hoàn tất
                                </dt>
                                <dd className="m-0 mt-1 font-semibold text-slate-900">
                                    {provider.documents.length} tài liệu · {provider.completedMissionsCount} nhiệm vụ (★ {provider.ratingAvg.toFixed(1)})
                                </dd>
                            </div>
                        </dl>
                        {provider.reviewNote && (
                            <p className="m-0 rounded-control border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700">
                                <strong>Ghi chú xét duyệt KYC:</strong> {provider.reviewNote}
                            </p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
