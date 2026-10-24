# Ảnh chụp thật dùng cho frontend

Đã thay ba ảnh AI bằng ảnh tư liệu chụp thật. Nguồn, tác giả, link tải, kích thước và SHA-256 được ghi
trong [sources.json](sources.json). Ảnh thể hiện hoạt động của đơn vị gốc, không phải đội ngũ hay cơ sở của UAV PAS.

| Ảnh                                       | Sử dụng                                 | Nguồn                                                                                                           | Quyền sử dụng    |
|-------------------------------------------|-----------------------------------------|-----------------------------------------------------------------------------------------------------------------|------------------|
| Chuẩn bị UAV tại Yosemite                 | Trang chủ, dịch vụ ghi hình, Liên hệ    | [U.S. Geological Survey](https://www.usgs.gov/media/images/readying-uas-flight-yosemite-national-park)          | Public Domain    |
| Bay thu thập dữ liệu tại Golden, Colorado | Trang chủ, dịch vụ thu thập dữ liệu     | [U.S. Geological Survey](https://www.usgs.gov/media/images/collecting-data-using-uncrewed-aircraft-systems-uas) | Public Domain    |
| Nhóm vận hành tại Plum Island             | Giới thiệu và khung đăng nhập           | [Sandy Brosnahan / USGS](https://www.usgs.gov/media/images/uas-imagery-collected-plum-island)                   | Public Domain    |
| Kiểm tra UAV trên bãi cất cánh            | Ảnh bổ sung để dùng tiếp                | [Sandy Brosnahan / USGS](https://www.usgs.gov/media/images/uas-imagery-taken-plum-island)                       | Public Domain    |
| Phối hợp chuẩn bị chuyến bay              | Ảnh dọc bổ sung để dùng tiếp            | [Sandy Brosnahan / USGS](https://www.usgs.gov/media/images/uas-imagery-collected-plum-island-1)                 | Public Domain    |
| Cận cảnh bộ điều khiển UAV                | Ảnh bổ sung để dùng tiếp                | [Aan Nizal / Unsplash](https://unsplash.com/photos/person-holding-black-drone-controller-1uqe5wMIzqA)           | Unsplash License |
| Ảnh chụp từ diều, Labruguière 1889        | Trang chủ, mốc 1888 dòng thời gian      | [Arthur Batut / Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Labrugui%C3%A8re_photographed_by_Arthur_Batut%27s_kite_in_1889.jpg) | Public Domain    |
| San Francisco sau động đất 1906           | Trang chủ, mốc 1906 dòng thời gian      | [George R. Lawrence / Library of Congress](https://commons.wikimedia.org/wiki/File:San_Francisco_in_ruin_edit2.jpg) | Public Domain    |
| Đội điều khiển UAV tại Cape Cod           | Trang chủ, Quy trình thực hiện          | [Woods Hole CMSC / USGS](https://www.usgs.gov/media/images/uas-pilots-field)                                    | Public Domain    |
| Bay lập bản đồ di tích Abó                | Trang chủ, dịch vụ/giải pháp khảo sát   | [GECSC / USGS](https://www.usgs.gov/media/images/uncrewed-aircraft-system-uas-remote-pilot-victoria-scholl)     | Public Domain    |
| Drone chụp người điều khiển gần Moab      | Trang chủ, dải "Góc nhìn từ UAV"        | [Matt Burgess / USGS](https://www.usgs.gov/media/images/drones-eye-view-a-usgs-remote-pilot-during-a-biocrust-mission-near-moab-ut) | Public Domain    |
| Hạ cánh UAV trên đảo Dauphin              | Dịch vụ và giải pháp thuê UAV           | [Woods Hole CMSC / USGS](https://www.usgs.gov/media/images/usgs-pilot-landing-unmanned-aerial-system-dauphin-island-al) | Public Domain    |
| Thử nghiệm thiết bị định vị, Everglades   | Trang Giải pháp, giải pháp AI dự kiến   | [USGS](https://www.usgs.gov/media/images/usgs-researchers-test-new-uas-technology-locating-invasive-pythons-everglades) | Public Domain    |
| Kiểm tra UAV trước bay tại Kīlauea        | Giải pháp tìm kiếm cứu nạn              | [Hawaiian Volcano Observatory / USGS](https://www.usgs.gov/media/images/routine-inspection-a-uas-system-prior-a-flight) | Public Domain    |

Bổ sung ngày 2026-10-23: hai ảnh tư liệu trong `frontend/public/images/history/` (bản 960 px của Wikimedia Commons) và
sáu ảnh USGS trong `frontend/public/images/people/` (JPEG tối đa 1600 px, không còn dữ liệu GPS). Ảnh Everglades được cắt bỏ
phần có băng rôn logo USGS để không hàm ý USGS bảo trợ UAV PAS. Chi tiết, SHA-256 của bản gốc và kích thước nằm trong
[sources.json](sources.json).

Ba ảnh đầu đang dùng trên website, được lưu trong `frontend/public/images/uav-photos/` ở định dạng WebP 1536×1024. Ảnh
đăng nhập có bản 640/960 px dùng chung cho ba khu vực `/customer`, `/operations` và `/admin` trong một ứng dụng
frontend. Các thành phần hiển thị nằm tại `frontend/src/features/marketing/components/uav-photo.tsx` và
`frontend/src/components/shared/PortalAuthLayout.tsx`. Chỉ xoay theo EXIF, cắt khung và tối ưu dung lượng; không tạo
thêm chi tiết bằng AI. Các ảnh AI cũ không còn được frontend tham chiếu.

Ảnh gốc và gallery để làm việc tiếp: `/Volumes/D/Codex/outputs/uav-real-photos-20261018/`. Nguồn USGS đánh dấu Public
Domain; [chính sách USGS](https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits) lưu ý quyền
hình ảnh cá nhân khi dùng thương mại. Ảnh bổ sung của Aan Nizal dùng [Unsplash License](https://unsplash.com/license).
Không dùng ảnh để hàm ý đơn vị/tác giả bảo trợ UAV PAS.

Các URL `/images/uav-people/...` cũ vẫn trả về bản ảnh chụp thật tương ứng để giữ tương thích với các đường dẫn đã được
sử dụng trước khi hợp nhất frontend. Mã nguồn mới dùng `/images/uav-photos/...` nhằm tránh cache ảnh AI cũ.
