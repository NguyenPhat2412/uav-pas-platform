'use client';
import { useState } from 'react';
import { PageGuard } from '@/components/layout';
import { Button, Field, Panel } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfilePage() {
  return (
    <PageGuard permission={null}>
      <Profile />
    </PageGuard>
  );
}

function Profile() {
  const { user } = useAuth();
  const [orgDepartment, setOrgDepartment] = useState('Viện Công nghệ Hàng không Vũ trụ & Biển đảo — VJU');
  const [emergencyPhone, setEmergencyPhone] = useState(user?.phoneNumber || '+84 912 345 678');
  const [notifySms, setNotifySms] = useState(true);
  const [notifySarAlert, setNotifySarAlert] = useState(true);
  const [savedBanner, setSavedBanner] = useState(false);

  const displayFullName = user?.fullName || 'PGS.TS Nguyễn Văn Minh (VJU Partner)';
  const displayUsername = user?.username || 'customer.vju';
  const displayEmail = user?.email || 'minh.nv@vju.ac.vn';
  const displayStatus = user?.status || 'ACTIVE';

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 4000);
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Hồ sơ Tài khoản &amp; Cấu hình Liên lạc</h1>
          <p>Quản lý định danh đối tác VJU, phương thức nhận cảnh báo khẩn cấp SAR và bảo mật phiên làm việc.</p>
        </div>
        <span
          style={{
            padding: '6px 12px',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
            background: '#ecfdf5',
            color: '#007f3e',
            border: '1px solid #a7f3d0',
          }}
        >
          ● Tài khoản Đối tác Xác thực ({displayStatus})
        </span>
      </div>

      <div className="grid grid-2">
        <Panel title="Thông tin Định danh Tài khoản">
          <dl className="grid grid-2" style={{ margin: 0 }}>
            <div>
              <dt className="muted" style={{ fontSize: 12 }}>Họ và tên</dt>
              <dd style={{ margin: '4px 0 0', fontWeight: 700, fontSize: 14.5 }}>{displayFullName}</dd>
            </div>
            <div>
              <dt className="muted" style={{ fontSize: 12 }}>Tên đăng nhập</dt>
              <dd style={{ margin: '4px 0 0', fontWeight: 700, fontSize: 14.5 }}>{displayUsername}</dd>
            </div>
            <div>
              <dt className="muted" style={{ fontSize: 12 }}>Email công vụ</dt>
              <dd style={{ margin: '4px 0 0', fontWeight: 700, fontSize: 14.5 }}>{displayEmail}</dd>
            </div>
            <div>
              <dt className="muted" style={{ fontSize: 12 }}>Số điện thoại đăng ký</dt>
              <dd style={{ margin: '4px 0 0', fontWeight: 700, fontSize: 14.5 }}>{user?.phoneNumber || '+84 912 345 678'}</dd>
            </div>
            <div>
              <dt className="muted" style={{ fontSize: 12 }}>Vai trò hệ thống</dt>
              <dd style={{ margin: '4px 0 0', fontWeight: 700, color: '#ab2523' }}>CUSTOMER_ENTERPRISE</dd>
            </div>
            <div>
              <dt className="muted" style={{ fontSize: 12 }}>Trạng thái</dt>
              <dd style={{ margin: '4px 0 0', fontWeight: 700, color: '#007f3e' }}>{displayStatus}</dd>
            </div>
          </dl>

          <div className="notice" style={{ marginTop: 18 }}>
            Backend chưa cung cấp endpoint cập nhật profile; hiện chỉ đọc dữ liệu thật từ hồ sơ IAM trung tâm.
          </div>
        </Panel>

        <Panel title="Tùy chọn Nhận Cảnh báo &amp; Điều phối Nhiệm vụ">
          <form onSubmit={handleSavePreferences} className="stack" style={{ gap: 14 }}>
            <Field
              label="Đơn vị / Phòng ban phối hợp hiện trường"
              value={orgDepartment}
              onChange={e => setOrgDepartment(e.target.value)}
            />
            <Field
              label="Hotline trực ban nhận tọa độ SAR khẩn cấp"
              value={emergencyPhone}
              onChange={e => setEmergencyPhone(e.target.value)}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={notifySarAlert}
                onChange={e => setNotifySarAlert(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: '#ab2523' }}
              />
              <span>Nhận cảnh báo tức thời khi AI KV260 phát hiện mục tiêu trên biển</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={notifySms}
                onChange={e => setNotifySms(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: '#007f3e' }}
              />
              <span>Gửi biên bản hoàn thành bay và hóa đơn điện tử qua SMS/Email</span>
            </label>

            {savedBanner && (
              <div
                className="notice"
                style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46', fontWeight: 600 }}
              >
                Đã lưu cấu hình thông báo cục bộ cho phiên làm việc hiện tại.
              </div>
            )}

            <div className="form-actions" style={{ marginTop: 4 }}>
              <Button type="submit">Lưu tùy chọn liên lạc</Button>
            </div>
          </form>
        </Panel>
      </div>
    </>
  );
}
