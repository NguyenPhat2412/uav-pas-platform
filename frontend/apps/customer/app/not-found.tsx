import Link from 'next/link';
import { Panel } from '@/components/ui';

export default function CustomerNotFoundPage() {
  return (
    <main style={{ maxWidth: 580, margin: '64px auto', padding: '0 20px' }}>
      <Panel title="404 · Không tìm thấy trang yêu cầu">
        <p className="muted" style={{ marginTop: 0, lineHeight: 1.6 }}>
          Trang hoặc hồ sơ dịch vụ bạn đang tìm kiếm không tồn tại hoặc đã thay đổi đường dẫn.
        </p>
        <div className="form-actions" style={{ marginTop: 16 }}>
          <Link href="/dashboard" className="button-link">
            ← Quay về Tổng quan Cổng Khách Hàng
          </Link>
        </div>
      </Panel>
    </main>
  );
}
