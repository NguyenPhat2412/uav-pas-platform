// Static content for the home page story sections (history, anatomy, mission patterns).

export type EraPhoto = { src: string; alt: string; credit: string; source: string };
export type Era = { year: string; title: string; text: string; tag: string; icon: EraIcon; photo?: EraPhoto; current?: boolean };
export type EraIcon = 'kite' | 'kites' | 'agheli' | 'quad' | 'rules' | 'hex' | 'route';

export const eras: Era[] = [
    {year: '1888', icon: 'kite', title: 'Máy ảnh treo trên diều', tag: 'Ảnh chụp từ trên cao',
        photo: {src: '/images/history/batut-labruguiere-1889.jpg', alt: 'Ảnh đen trắng thị trấn Labruguière và dòng sông nhìn từ trên cao, chụp bằng máy ảnh treo trên diều',
            credit: 'Ảnh: Arthur Batut, 1889', source: 'https://commons.wikimedia.org/wiki/File:Labrugui%C3%A8re_photographed_by_Arthur_Batut%27s_kite_in_1889.jpg'},
        text: 'Arthur Batut ở Pháp gắn máy ảnh hẹn giờ lên diều để chụp ảnh từ trên không, không cần người bay cùng.'},
    {year: '1906', icon: 'kites', title: 'Khảo sát sau động đất San Francisco', tag: 'Ứng phó thiên tai',
        photo: {src: '/images/history/lawrence-san-francisco-1906.jpg', alt: 'Ảnh toàn cảnh đen trắng San Francisco và bến cảng sau động đất năm 1906',
            credit: 'Ảnh: George R. Lawrence, 1906', source: 'https://commons.wikimedia.org/wiki/File:San_Francisco_in_ruin_edit2.jpg'},
        text: 'George Lawrence dùng một chuỗi diều nâng máy ảnh cỡ lớn, ghi lại toàn cảnh thành phố bị tàn phá chỉ vài tuần sau thảm hoạ.'},
    {year: '1987', icon: 'agheli', title: 'Yamaha R-50 tại Nhật Bản', tag: 'Nông nghiệp',
        text: 'Trực thăng không người lái được dùng để phun thuốc trên ruộng lúa, mở đầu cho UAV nông nghiệp thương mại.'},
    {year: '2013', icon: 'quad', title: 'DJI Phantom', tag: 'Phổ cập dân sự',
        text: 'Drone bốn cánh quạt có GPS, bay được ngay khi mở hộp. UAV lần đầu tới tay nhiếp ảnh gia, kỹ sư và người làm nông.'},
    {year: '2016', icon: 'rules', title: 'Luật bay thương mại', tag: 'Chuẩn hoá vận hành',
        text: 'Các nhà quản lý hàng không ban hành quy định riêng cho UAV cỡ nhỏ, như Part 107 của FAA. Bay thương mại có khung pháp lý rõ ràng.'},
    {year: '2020s', icon: 'hex', title: 'UAV thành công cụ làm việc', tag: 'Ứng dụng chuyên ngành',
        text: 'Drone phun thuốc, khảo sát địa hình, kiểm tra đường điện và hỗ trợ tìm kiếm cứu nạn trở thành công việc hằng ngày.'},
    {year: 'Hôm nay', icon: 'route', title: 'UAV PAS', tag: 'Bạn đang ở đây', current: true,
        text: 'Gửi yêu cầu, điều phối UAV, phi công và trạm cất hạ cánh cho từng nhiệm vụ trên cùng một nền tảng.'},
];

export type DronePart = { id: string; x: number; y: number; name: string; kicker: string; text: string; spec: string };

// x/y are percentages over the 400x400 top-view plan in DroneAnatomy.
export const droneParts: DronePart[] = [
    {id: 'fc', x: 50, y: 44, name: 'Bộ điều khiển bay', kicker: 'Bộ não',
        text: 'Đọc cảm biến quán tính (con quay hồi chuyển, gia tốc kế), khí áp kế và la bàn, rồi điều chỉnh tốc độ từng motor liên tục để giữ UAV thăng bằng và bám đúng đường bay.',
        spec: 'Vòng điều khiển: hàng trăm đến hàng nghìn lần mỗi giây'},
    {id: 'gps', x: 50, y: 37, name: 'GNSS và la bàn', kicker: 'Định vị',
        text: 'Xác định vị trí bằng nhiều hệ vệ tinh như GPS, GLONASS, Galileo, BeiDou. Bản RTK cho sai số cỡ centimet, cần cho khảo sát và lập bản đồ.',
        spec: 'Sai số: ~1–3 m thường, ~1–3 cm với RTK'},
    {id: 'bat', x: 50, y: 54, name: 'Pin LiPo / Li-ion', kicker: 'Năng lượng',
        text: 'Quyết định thời gian bay. Hệ thống theo dõi điện áp từng cell và tự đưa UAV quay về khi pin xuống ngưỡng an toàn.',
        spec: 'Đa cánh quạt: ~20–45 phút mỗi lần sạc'},
    {id: 'motor', x: 76, y: 24, name: 'Motor không chổi than', kicker: 'Lực đẩy',
        text: 'Mỗi motor có một bộ điều tốc (ESC) riêng. UAV đổi hướng bằng cách cho các motor quay nhanh chậm khác nhau, không cần cánh lái.',
        spec: 'Mỗi tay đòn: 1 motor và 1 ESC'},
    {id: 'prop', x: 88, y: 13, name: 'Cánh quạt', kicker: 'Lực nâng',
        text: 'Hai cánh quạt chéo nhau quay thuận chiều kim đồng hồ, hai cánh còn lại quay ngược chiều để triệt tiêu mô-men xoắn.',
        spec: 'Vật liệu: nhựa gia cường hoặc sợi carbon'},
    {id: 'frame', x: 33, y: 33, name: 'Khung và tay đòn', kicker: 'Kết cấu',
        text: 'Giữ mọi bộ phận cố định, đủ cứng để không rung ảnh hưởng cảm biến và đủ nhẹ để tiết kiệm pin. Nhiều mẫu gập được để vận chuyển.',
        spec: 'Vật liệu: sợi carbon, nhôm, nhựa kỹ thuật'},
    {id: 'gimbal', x: 50, y: 68, name: 'Gimbal và cảm biến', kicker: 'Tải trọng',
        text: 'Gimbal ba trục giữ cảm biến ổn định khi UAV nghiêng. Tải trọng có thể là camera RGB, camera nhiệt, LiDAR hoặc cảm biến đa phổ.',
        spec: 'Ổn định 3 trục: pitch, roll, yaw'},
    {id: 'link', x: 37, y: 67, name: 'Liên kết dữ liệu', kicker: 'Truyền thông',
        text: 'Kênh vô tuyến hai chiều: nhận lệnh từ trạm điều khiển, gửi lại telemetry và hình ảnh trực tiếp cho phi công.',
        spec: 'Băng tần phổ biến: 2,4 GHz và 5,8 GHz'},
];

export type MissionKind = 'survey' | 'orbit' | 'corridor' | 'rental';

export const missionPatterns: { kind: MissionKind; slug: string; title: string; text: string; pattern: string; fit: string; provide: string }[] = [
    {kind: 'survey', slug: 'aerial-inspection', title: 'Khảo sát khu vực', text: 'Quét song song để phủ kín một khu vực cần kiểm tra.',
        pattern: 'Quét song song', fit: 'Kiểm tra hiện trạng khu vực', provide: 'Ranh giới, thời gian, đầu ra mong muốn'},
    {kind: 'orbit', slug: 'aerial-recording', title: 'Quay chụp trên không', text: 'Bay vòng quanh công trình hoặc sự kiện để ghi hình.',
        pattern: 'Bay vòng quanh một điểm', fit: 'Ghi hình công trình, sự kiện', provide: 'Vị trí, khung giờ, mục đích sử dụng'},
    {kind: 'corridor', slug: 'data-collection', title: 'Thu thập dữ liệu', text: 'Bay theo tuyến điểm mốc dọc đường điện, đê hay kênh.',
        pattern: 'Bay theo tuyến điểm mốc', fit: 'Tuyến dài như đường điện, đê, kênh', provide: 'Tuyến cần bay, đầu ra, ràng buộc'},
    {kind: 'rental', slug: 'uav-rental', title: 'Thuê UAV', text: 'UAV và người điều khiển xuất phát từ trạm, làm việc tại hiện trường của bạn.',
        pattern: 'Trạm → hiện trường → trạm', fit: 'Nhiệm vụ cần UAV kèm người điều khiển', provide: 'Địa điểm, lịch, yêu cầu thiết bị'},
];

export type FieldPhoto = { src: string; alt: string; caption: string; credit: string; source: string; width: number; height: number };

// Public-domain USGS photos of people working with UAVs.
export const fieldTeam: (FieldPhoto & { layout: 'tall' | 'wide' | 'normal' })[] = [
    {layout: 'tall', src: '/images/people/usgs-woods-hole-pilots.jpg', width: 1357, height: 1600,
        alt: 'Hai người điều khiển UAV đứng trên đồi cát theo dõi chuyến bay, drone đặt trên bãi cất cánh màu cam',
        caption: 'Đội điều khiển theo dõi chuyến bay khảo sát bãi biển', credit: 'Woods Hole Coastal and Marine Science Center / USGS',
        source: 'https://www.usgs.gov/media/images/uas-pilots-field'},
    {layout: 'wide', src: '/images/uav-photos/usgs-yosemite-preflight.webp', width: 1536, height: 1024,
        alt: 'Người điều khiển kiểm tra UAV trên bãi cất cánh trước chuyến bay',
        caption: 'Kiểm tra thiết bị trước khi cất cánh', credit: 'USGS',
        source: 'https://www.usgs.gov/media/images/readying-uas-flight-yosemite-national-park'},
    {layout: 'normal', src: '/images/uav-photos/usgs-golden-survey.webp', width: 1536, height: 1024,
        alt: 'UAV và đội khảo sát thu thập dữ liệu trên cánh đồng',
        caption: 'Đội khảo sát thu thập dữ liệu', credit: 'USGS',
        source: 'https://www.usgs.gov/media/images/collecting-data-using-uncrewed-aircraft-systems-uas'},
    {layout: 'normal', src: '/images/uav-photos/usgs-plum-island-team.webp', width: 1536, height: 1024,
        alt: 'Nhóm vận hành cầm bộ điều khiển và theo dõi chuyến bay tại hiện trường ven biển',
        caption: 'Phối hợp giữa người điều khiển và quan sát viên', credit: 'Sandy Brosnahan / USGS',
        source: 'https://www.usgs.gov/media/images/uas-imagery-collected-plum-island'},
];

export const pilotFromAbove: FieldPhoto = {
    src: '/images/people/usgs-matt-burgess-drone-view.jpg', width: 1600, height: 900,
    alt: 'Ảnh chụp từ drone nhìn thẳng xuống bãi hạ cánh màu đỏ và người điều khiển mặc áo phản quang bên cạnh',
    caption: 'Drone chụp người điều khiển khi hạ cánh sau chuyến bay gần Moab, Utah', credit: 'Matt Burgess / USGS',
    source: 'https://www.usgs.gov/media/images/drones-eye-view-a-usgs-remote-pilot-during-a-biocrust-mission-near-moab-ut',
};

export const surveyPilot: FieldPhoto = {
    src: '/images/people/usgs-victoria-scholl-mapping.jpg', width: 1600, height: 1066,
    alt: 'Người điều khiển đội mũ và mặc áo phản quang cầm bộ điều khiển UAV ngoài thực địa',
    caption: 'Bay chụp ảnh lập bản đồ di tích Abó, New Mexico', credit: 'Geosciences and Environmental Change Science Center / USGS',
    source: 'https://www.usgs.gov/media/images/uncrewed-aircraft-system-uas-remote-pilot-victoria-scholl',
};
