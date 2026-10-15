'use client';
import { displayLabel } from '@uav/ui/presentation';
import { PageGuard } from '@/components/layout';
import { Panel } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
export default function ProfilePage(){return <PageGuard permission={null}><Profile/></PageGuard>}
function Profile(){const {user}=useAuth();return <><div className="page-heading"><div><h1>Tài khoản</h1><p>Thông tin tài khoản của bạn.</p></div></div><Panel title="Hồ sơ"><dl className="grid grid-2"><div><dt className="muted">Họ và tên</dt><dd>{user?.fullName||'Chưa cập nhật'}</dd></div><div><dt className="muted">Tên đăng nhập</dt><dd>{user?.username}</dd></div><div><dt className="muted">Email</dt><dd>{user?.email}</dd></div><div><dt className="muted">Số điện thoại</dt><dd>{user?.phoneNumber||'Chưa cập nhật'}</dd></div><div><dt className="muted">Trạng thái</dt><dd>{displayLabel(user?.status)}</dd></div></dl><div className="notice" style={{marginTop:18}}>Bạn có thể xem hồ sơ tại đây. Chức năng chỉnh sửa hồ sơ chưa được hỗ trợ.</div></Panel></>}
