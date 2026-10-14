'use client';

import Link from 'next/link';
import { Button, Panel } from '@/components/ui';

export default function CustomerErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string; code?: string; status?: number };
  reset: () => void;
}) {
  return (
    <main style={{ maxWidth: 620, margin: '64px auto', padding: '0 20px' }}>
      <Panel
        title="Không thể hiển thị trang"
        action={
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: 999,
              background: '#fef2f2',
              color: '#ab2523',
              border: '1px solid #fecaca',
            }}
          >
            {error?.code || (error?.status ? `HTTP_${error.status}` : 'CLIENT_EXCEPTION')}
          </span>
        }
      >
        <p className="muted" style={{ marginTop: 0, lineHeight: 1.6 }}>
          {error?.message || 'Đã xảy ra ngoại lệ trong quá trình tải dữ liệu từ hệ thống. Vui lòng thử lại hoặc quay về trang tổng quan.'}
        </p>
        <div className="form-actions" style={{ marginTop: 18 }}>
          <Button type="button" onClick={reset}>
            Thử lại
          </Button>
          <Link href="/dashboard" className="button-link" style={{ alignSelf: 'center', marginLeft: 8 }}>
            Về Tổng quan →
          </Link>
        </div>
      </Panel>
    </main>
  );
}
