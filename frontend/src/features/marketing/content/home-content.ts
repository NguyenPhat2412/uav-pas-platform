// Static content for the home page story sections, UAV platform features, 3-portal architecture, and official pricing plans.
import type {
    DronePart,
    Era,
    EraIcon,
    FieldPhoto,
    MissionKind,
    PlatformPortalOverview,
    PricingComparisonRow,
    PublicPricingPlan,
    UavPlatformFeature,
} from '@/features/marketing/types/marketing.types';

export type {
    DronePart,
    Era,
    EraIcon,
    FieldPhoto,
    MissionKind,
    PlatformPortalOverview,
    PricingComparisonRow,
    PublicPricingPlan,
    UavPlatformFeature,
};

export const projectHighlights = [
    {label: 'Kiến trúc điều hành', value: '3 Phân hệ', detail: 'Khách hàng · Điều phối Vận hành · Quản trị Hệ thống'},
    {label: 'Độ chính xác định vị', value: '1–3 cm RTK', detail: 'Đa hệ vệ tinh GNSS + trạm tham chiếu mặt đất'},
    {label: 'Xử lý AI tại biên', value: 'Kria KV260', detail: 'Mô hình YOLOv8s tăng tốc phần cứng FPGA DPU'},
    {label: 'Vòng đời nhiệm vụ', value: '7 Trạng thái', detail: 'Kiểm soát chặt từ bản nháp đến bàn giao dữ liệu'},
] as const;

export const uavPlatformFeatures: UavPlatformFeature[] = [
    {
        id: 'gis-flight-planner',
        badge: 'GIS & Quang học',
        title: 'Lập đường bay GIS & cảm biến',
        subtitle: 'Khoanh vùng đa giác khảo sát và cấu hình thông số bay trực tiếp trên bản đồ.',
        description:
            'Vẽ vùng bay đa giác hoặc bán kính hoạt động trên bản đồ số, cấu hình nhanh độ cao AGL, GSD và cảm biến.',
        specs: [
            'AGL 30–120m · GSD 1,5–5,0 cm/px',
            'Overlap dọc 60–90% · ngang 50–85%',
            'Cảm biến RGB 4K, Nhiệt, LiDAR, Đa phổ',
        ],
        portal: 'Khách hàng & Điều phối',
        scene: 'mapping',
    },
    {
        id: 'realtime-telemetry-rtk',
        badge: 'Telemetry & RTK',
        title: 'Giám sát Telemetry & RTK thời gian thực',
        subtitle: 'Theo dõi trực tiếp tọa độ, dung lượng pin và ranh giới an toàn không phận.',
        description:
            'Truyền liên tục tọa độ GPS/RTK, độ cao, tốc độ, hướng bay và điện áp pin về trung tâm chỉ huy kèm cảnh báo tự động.',
        specs: [
            'Định vị RTK chuẩn 1–3 cm (FIXED / FLOAT)',
            'Kiểm tra vùng cấm bay Geofence tức thời',
            'Tự động tính ngưỡng pin an toàn quay về (RTH)',
        ],
        portal: 'Điều phối & Quản trị',
        scene: 'pilots',
    },
    {
        id: 'sar-ai-kv260',
        badge: 'Edge AI & SAR',
        title: 'Buồng lái SAR & Edge AI Kria KV260',
        subtitle: 'Nhận diện mục tiêu tại biên và sinh lộ trình tìm kiếm chuẩn quốc tế IAMSAR.',
        description:
            'Xử lý thị giác máy tính trực tiếp trên bo mạch FPGA Kria KV260 gắn trên UAV, hỗ trợ xác minh mục tiêu cứu nạn khẩn cấp.',
        specs: [
            'Giám sát tải DPU (%), tốc độ FPS & nhiệt độ SoC',
            'Lộ trình tìm kiếm tự động IAMSAR Expanding Square',
            'Cảnh báo khẩn cấp SAR & điều hướng trạm mặt đất',
        ],
        portal: 'Cổng Điều hành (SAR Cockpit)',
        scene: 'tracking',
    },
    {
        id: 'mission-dispatch-lifecycle',
        badge: 'Điều phối 7 Bước',
        title: 'Điều phối nguồn lực & vòng đời nhiệm vụ',
        subtitle: 'Phân bổ đồng bộ UAV, trạm mặt đất, phi công và thiết bị đi kèm.',
        description:
            'Quy trình 7 bước khép kín từ khi gửi yêu cầu, thẩm định, giữ chỗ thiết bị, phi công nhận lệnh đến bàn giao kết quả.',
        specs: [
            'Kiểm soát 7 trạng thái nhiệm vụ minh bạch',
            'Kiểm tra lịch trống phi công & độ sẵn sàng UAV',
            'Hỗ trợ điều phối lại (Redispatch) ngoài thực địa',
        ],
        portal: 'Xuyên suốt 3 Cổng',
        scene: 'landing',
    },
    {
        id: 'maintenance-safety-academy',
        badge: 'Bảo trì & Đào tạo',
        title: 'Bảo trì kỹ thuật, Kho thiết bị & Học viện SOP',
        subtitle: 'Đảm bảo độ tin cậy kỹ thuật đội bay và chuẩn an toàn của phi công.',
        description:
            'Theo dõi lịch bảo dưỡng định kỳ, phiếu sửa chữa, tồn kho pin/cảm biến và giáo trình đào tạo chuẩn SOP 3 phân hệ.',
        specs: [
            'Cảnh báo lịch bảo trì đến hạn & phiếu sửa chữa',
            'Quản lý luân chuyển Pin, Camera, LiDAR, KV260',
            'Học viện đào tạo SOP & kiểm tra tiền bay',
        ],
        portal: 'Khách hàng · Điều hành · Quản trị',
        scene: 'response',
    },
    {
        id: 'media-billing-webhooks',
        badge: 'Dữ liệu & Tích hợp',
        title: 'Bàn giao Signed-URL, VietQR & Webhooks',
        subtitle: 'Lưu trữ kết quả nhiệm vụ an toàn, tự động hoá gói cước và kết nối API.',
        description:
            'Tải ảnh Geotagged, video 4K và báo cáo qua liên kết bảo mật, tích hợp thanh toán VietQR EMVCo và cổng Webhook.',
        specs: [
            'Tải dữ liệu khảo sát bảo mật qua Signed URL',
            'Thanh toán VietQR EMVCo tự động đối soát',
            'Phân quyền RBAC động & Webhook ký số HMAC',
        ],
        portal: 'Khách hàng & Quản trị',
        scene: 'survey',
    },
];

export const portalEcosystem: PlatformPortalOverview[] = [
    {
        id: 'customer',
        badge: 'Dành cho khách hàng',
        title: 'Cổng Khách hàng',
        role: 'Gửi yêu cầu, theo dõi nhiệm vụ và nhận kết quả',
        description:
            'Khoanh vùng cần bay trên bản đồ, gửi yêu cầu và theo dõi tiến độ cho tới khi nhận dữ liệu bàn giao.',
        capabilities: [
            'Khoanh vùng bay trên bản đồ và chọn loại dữ liệu cần thu',
            'Theo dõi trạng thái nhiệm vụ và tải kết quả',
            'Quản lý gói dịch vụ, giờ bay và thanh toán',
        ],
        href: '/customer/dashboard',
        cta: 'Mở Cổng Khách hàng',
        scene: 'survey',
        imageSrc: '/images/uav-people/uav-survey-team.webp',
        imageAlt: 'Đội khảo sát và khách hàng kiểm tra dữ liệu bản đồ bay ngoài thực địa',
    },
    {
        id: 'operations',
        badge: 'Phía sau mỗi nhiệm vụ',
        title: 'Đội vận hành UAV PAS',
        role: 'Xem xét yêu cầu và điều phối chuyến bay cho bạn',
        description:
            'Đội vận hành kiểm tra yêu cầu, chọn UAV, người điều khiển và trạm phù hợp, rồi theo dõi chuyến bay tới khi hoàn tất.',
        capabilities: [
            'Thẩm định vùng bay, thời tiết và nguồn lực',
            'Giám sát chuyến bay trong suốt nhiệm vụ',
            'Bảo trì UAV và kiểm tra an toàn trước mỗi chuyến',
        ],
        href: '/how-it-works',
        cta: 'Xem quy trình điều phối',
        scene: 'field',
        imageSrc: '/images/uav-people/uav-field-team.webp',
        imageAlt: 'Đội ngũ phi công và điều phối viên vận hành UAV tại hiện trường',
    },
    {
        id: 'admin',
        badge: 'An toàn dữ liệu',
        title: 'Bảo mật & phân quyền',
        role: 'Dữ liệu nhiệm vụ chỉ đến đúng người cần xem',
        description:
            'Mỗi khách hàng chỉ thấy nhiệm vụ của mình. Tài khoản nội bộ do quản trị viên cấp và mọi thao tác quan trọng đều được ghi nhật ký.',
        capabilities: [
            'Tài khoản vận hành chỉ được cấp qua liên hệ',
            'Liên kết tải dữ liệu bàn giao có thời hạn',
            'Ghi nhật ký các thao tác trên dữ liệu',
        ],
        href: '/contact',
        cta: 'Liên hệ về bảo mật dữ liệu',
        scene: 'team',
        imageSrc: '/images/uav-people/uav-workshop-team.webp',
        imageAlt: 'Đội ngũ kỹ sư và quản trị viên kiểm tra hệ thống phần cứng UAV trong xưởng kỹ thuật',
    },
];

export const publicPricingPlans: PublicPricingPlan[] = [
    {
        code: 'BASIC',
        name: 'Gói Tiêu Chuẩn (Basic)',
        subtitle: 'Khảo sát định kỳ & quay chụp tiêu chuẩn',
        monthlyVnd: '5.000.000 ₫',
        billingCycle: '/ tháng (hỗ trợ hóa đơn VAT)',
        flightHoursQuota: '20 giờ bay / tháng',
        concurrentUavs: '01 UAV đồng thời',
        sarAiIncluded: false,
        badge: 'Khởi đầu tối ưu',
        targetAudience: 'Phù hợp cho nhóm kỹ thuật công trường và doanh nghiệp nhỏ khảo sát định kỳ.',
        highlights: [
            '20 giờ bay/tháng trên 4 nhóm dịch vụ UAV cơ bản',
            'Công cụ vẽ vùng bay GIS, tuỳ chỉnh AGL & GSD',
            'Tải ảnh Geotagged, video 4K qua Signed URL',
            'Thanh toán nhanh qua mã VietQR EMVCo tự động',
        ],
    },
    {
        code: 'PRO',
        name: 'Gói Chuyên Nghiệp (Pro)',
        subtitle: 'Tăng tốc AI KV260 & điều phối đa UAV',
        monthlyVnd: '15.000.000 ₫',
        billingCycle: '/ tháng (hỗ trợ hóa đơn VAT)',
        flightHoursQuota: '80 giờ bay / tháng',
        concurrentUavs: '03 UAV đồng thời',
        sarAiIncluded: true,
        featured: true,
        badge: 'Phổ biến nhất',
        targetAudience: 'Dành cho doanh nghiệp khảo sát hạ tầng, điện lực, nông nghiệp và khu công nghiệp.',
        highlights: [
            '80 giờ bay/tháng & ưu tiên xếp lịch điều phối',
            'Mở khoá xử lý AI YOLOv8s trên phần cứng Kria KV260',
            'Đầy đủ 4 cảm biến: RGB 4K, Nhiệt, LiDAR, Đa phổ',
            'Báo cáo phân tích hiệu suất nhiệm vụ thời gian thực',
        ],
    },
    {
        code: 'ENTERPRISE',
        name: 'Gói Tác Chiến (Enterprise / SAR)',
        subtitle: 'Đội bay quy mô lớn & cứu nạn khẩn cấp',
        monthlyVnd: '45.000.000 ₫',
        billingCycle: '/ tháng (hợp đồng SLA riêng)',
        flightHoursQuota: '300 giờ bay / tháng',
        concurrentUavs: '10 UAV đồng thời',
        sarAiIncluded: true,
        badge: 'Tác chiến & SAR',
        targetAudience: 'Thiết kế cho đơn vị quản lý hạ tầng trọng điểm, phòng chống thiên tai và cứu nạn SAR.',
        highlights: [
            '300 giờ bay/tháng, điều phối đồng thời tới 10 UAV',
            'Toàn quyền Buồng lái SAR AI & đường bay IAMSAR 24/7',
            'Tích hợp Webhook sự kiện thời gian thực (SAR, RTH)',
            'Cam kết SLA ưu tiên & đội ngũ phi công chuyên trách',
        ],
    },
];

export const pricingComparisonRows: PricingComparisonRow[] = [
    {feature: 'Mức cước niêm yết hàng tháng', basic: '5.000.000 ₫ / tháng', pro: '15.000.000 ₫ / tháng', enterprise: '45.000.000 ₫ / tháng'},
    {feature: 'Hạn mức giờ bay định kỳ', basic: '20 giờ / tháng', pro: '80 giờ / tháng', enterprise: '300 giờ / tháng'},
    {feature: 'Số lượng UAV hoạt động đồng thời tối đa', basic: '01 UAV', pro: '03 UAV', enterprise: '10 UAV'},
    {feature: 'Công cụ lập vùng bay GIS & cấu hình AGL / GSD / Overlap', basic: 'Có đầy đủ', pro: 'Có đầy đủ', enterprise: 'Có đầy đủ'},
    {feature: 'Tải trọng cảm biến hỗ trợ', basic: 'RGB 4K tiêu chuẩn', pro: 'RGB 4K · Nhiệt · LiDAR · Đa phổ', enterprise: 'Toàn bộ cảm biến + cấu hình đặc thù'},
    {feature: 'Xử lý AI YOLOv8s trên phần cứng biên Kria KV260', basic: 'Không bao gồm', pro: 'Đã bao gồm', enterprise: 'Đã bao gồm (Ưu tiên DPU)'},
    {feature: 'Buồng lái Tìm kiếm Cứu nạn (SAR) & đường bay IAMSAR', basic: 'Không bao gồm', pro: 'Hỗ trợ theo yêu cầu', enterprise: 'Toàn quyền kích hoạt 24/7'},
    {feature: 'Tích hợp Webhook sự kiện thời gian thực & API', basic: 'Thông báo trên cổng', pro: 'Thông báo + Báo cáo nâng cao', enterprise: 'Webhook HMAC đầy đủ + SLA riêng'},
    {feature: 'Phương thức thanh toán & kích hoạt hạn mức', basic: 'Chuyển khoản VietQR', pro: 'Chuyển khoản VietQR / Hợp đồng', enterprise: 'VietQR / Đối soát doanh nghiệp'},
];

export const eras: Era[] = [
    {year: '1888', icon: 'kite', title: 'Máy ảnh treo trên diều', tag: 'Ảnh chụp từ trên cao',
        text: 'Arthur Batut ở Pháp gắn máy ảnh hẹn giờ lên diều để chụp ảnh từ trên không, không cần người bay cùng.'},
    {year: '1906', icon: 'kites', title: 'Khảo sát sau động đất San Francisco', tag: 'Ứng phó thiên tai',
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
