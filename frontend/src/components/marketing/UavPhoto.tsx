import Image from 'next/image';
import type {UavScene} from '@/types/marketing/marketing.types';

export type {UavScene};

export const scenes = {
    field: {
        src: '/images/uav-photos/usgs-yosemite-preflight.webp',
        alt: 'Phi công USGS kiểm tra UAV trên bãi cất cánh tại Yosemite.',
        caption: 'Chuẩn bị UAV trước chuyến bay tại Yosemite.',
        source: 'https://www.usgs.gov/media/images/readying-uas-flight-yosemite-national-park',
        credit: 'USGS'
    },
    survey: {
        src: '/images/uav-photos/usgs-golden-survey.webp',
        alt: 'UAV và đội khảo sát USGS thu thập dữ liệu trên cánh đồng tại Golden, Colorado.',
        caption: 'Bay khảo sát, thu thập dữ liệu tại Golden, Colorado.',
        source: 'https://www.usgs.gov/media/images/collecting-data-using-uncrewed-aircraft-systems-uas',
        credit: 'USGS'
    },
    team: {
        src: '/images/uav-photos/usgs-plum-island-team.webp',
        alt: 'Nhóm khảo sát vận hành bộ điều khiển UAV và theo dõi chuyến bay tại Plum Island.',
        caption: 'Nhóm vận hành trong chuyến khảo sát tại Plum Island.',
        source: 'https://www.usgs.gov/media/images/uas-imagery-collected-plum-island',
        credit: 'Sandy Brosnahan / USGS'
    },
    pilots: {
        src: '/images/people/usgs-woods-hole-pilots.jpg',
        alt: 'Hai người điều khiển UAV đứng trên đồi cát theo dõi chuyến bay, drone đặt trên bãi cất cánh màu cam.',
        caption: 'Đội điều khiển theo dõi chuyến bay khảo sát bãi biển tại Cape Cod.',
        source: 'https://www.usgs.gov/media/images/uas-pilots-field',
        credit: 'Woods Hole Coastal and Marine Science Center / USGS'
    },
    landing: {
        src: '/images/people/usgs-dauphin-island-landing.jpg',
        alt: 'Người điều khiển cầm bộ điều khiển hạ cánh UAV xuống bãi đáp trên bãi cát đảo Dauphin, Alabama.',
        caption: 'Hạ cánh sau chuyến bay chụp ảnh bờ biển trên đảo Dauphin.',
        source: 'https://www.usgs.gov/media/images/usgs-pilot-landing-unmanned-aerial-system-dauphin-island-al',
        credit: 'Woods Hole Coastal and Marine Science Center / USGS'
    },
    mapping: {
        src: '/images/people/usgs-victoria-scholl-mapping.jpg',
        alt: 'Người điều khiển đội mũ và mặc áo phản quang cầm bộ điều khiển UAV ngoài thực địa.',
        caption: 'Bay chụp ảnh lập bản đồ di tích Abó, New Mexico.',
        source: 'https://www.usgs.gov/media/images/uncrewed-aircraft-system-uas-remote-pilot-victoria-scholl',
        credit: 'Geosciences and Environmental Change Science Center / USGS'
    },
    tracking: {
        src: '/images/people/usgs-everglades-tracking-test.jpg',
        alt: 'Hai người mặc áo phản quang quan sát một UAV đang bay thử nghiệm thiết bị định vị.',
        caption: 'Thử nghiệm thiết bị định vị gắn trên UAV tại Everglades, Florida.',
        source: 'https://www.usgs.gov/media/images/usgs-researchers-test-new-uas-technology-locating-invasive-pythons-everglades',
        credit: 'USGS'
    },
    response: {
        src: '/images/people/usgs-kilauea-preflight-check.jpg',
        alt: 'Hai người điều khiển kiểm tra UAV trên bãi đáp trước chuyến bay cạnh dòng dung nham núi lửa Kīlauea.',
        caption: 'Kiểm tra UAV trước chuyến bay trong đợt ứng phó núi lửa Kīlauea năm 2018.',
        source: 'https://www.usgs.gov/media/images/routine-inspection-a-uas-system-prior-a-flight',
        credit: 'Hawaiian Volcano Observatory / USGS'
    },
    rentalFleet: {
        src: '/images/services/uav-rental-fleet.webp',
        alt: 'Kỹ thuật viên ghi chép bên cạnh một UAV đa cánh cỡ lớn, phía sau là nhiều UAV khác đặt trên đường băng.',
        caption: 'Chuẩn bị nhiều UAV cho một đợt bay thực tập tại EROS, South Dakota.',
        source: 'https://www.usgs.gov/media/images/national-uncrewed-systems-office-brings-drones-eros-exercise',
        credit: 'EROS Center / USGS'
    },
    inspectionGrid: {
        src: '/images/services/aerial-inspection-grid.webp',
        alt: 'UAV gắn camera trên gimbal bay sát thân cột đá của một công trình cao.',
        caption: 'Bay chụp sát công trình để dựng mô hình 3D đài tưởng niệm Perry, Ohio.',
        source: 'https://www.usgs.gov/media/images/uas-sony-a7r-gremsy-gimbal-manually-flown-supplement-imagery-perry-victory-and',
        credit: 'Geosciences and Environmental Change Science Center / USGS'
    },
    recordingCinema: {
        src: '/images/services/aerial-recording-cinema.webp',
        alt: 'Bóng một UAV đang bay trên dãy đồi rừng lúc hoàng hôn.',
        caption: 'UAV bay chụp ảnh khu rừng sau cháy lúc hoàng hôn, Tahoe, California.',
        source: 'https://www.usgs.gov/media/images/drone-sunset',
        credit: 'National Innovation Center / USGS'
    },
    dataCorridor: {
        src: '/images/services/data-collection-corridor.webp',
        alt: 'Hai người điều khiển đứng dưới mái che bên bờ sông, một người cầm bộ điều khiển hướng ra mặt nước.',
        caption: 'Bay thu thập dữ liệu đa phổ dọc sông Missouri.',
        source: 'https://www.usgs.gov/media/images/remote-pilots-conducting-a-hyperspectral-uas-flight-over-missouri-river',
        credit: 'Geosciences and Environmental Change Science Center / USGS'
    },
    opsCommand: {
        src: '/images/solutions/managed-ops-command.webp',
        alt: 'Nhóm sáu người quanh bàn trạm điều khiển mặt đất có laptop và thiết bị thu phát dưới mái che.',
        caption: 'Tổ bay thống nhất thông số chuyến bay trong ngày tại trạm điều khiển mặt đất.',
        source: 'https://www.usgs.gov/media/images/usgs-personnel-uas-ground-control-station-discussing-flight-parameters-days-drone',
        credit: 'Geosciences and Environmental Change Science Center / USGS'
    },
    infraSurvey: {
        src: '/images/solutions/infra-3d-survey.webp',
        alt: 'UAV cánh cố định cất cánh thẳng đứng từ bãi đáp trên một con đường bị sạt lở, người điều khiển đứng phía sau.',
        caption: 'Khảo sát đoạn đường sạt lở bằng UAV lập bản đồ, Blue Ridge Parkway.',
        source: 'https://www.usgs.gov/media/images/assessing-road-damage-caused-hurricane-helene',
        credit: 'Geosciences and Environmental Change Science Center / USGS'
    },
    edgePayload: {
        src: '/images/solutions/edge-ai-kv260-tracking.webp',
        alt: 'UAV đa cánh nhìn từ dưới lên, mang cụm cảm biến gắn dưới thân.',
        caption: 'UAV mang cụm cảm biến đa phổ và lidar gắn dưới thân.',
        source: 'https://www.usgs.gov/media/images/drone-hyperspectral-imaging-payload-integrated-lidar-sensor',
        credit: 'Geosciences and Environmental Change Science Center / USGS'
    },
    sarResponse: {
        src: '/images/solutions/sar-emergency-response.webp',
        alt: 'Người điều khiển đội mũ bảo hộ chuẩn bị UAV nhỏ trên con đường đầy lá đổ và cây gãy sau bão.',
        caption: 'Chuẩn bị UAV đánh giá thiệt hại đường sau bão Helene.',
        source: 'https://www.usgs.gov/media/images/preparing-assess-road-damage-using-a-drone',
        credit: 'Geosciences and Environmental Change Science Center / USGS'
    },
    stepBriefing: {
        src: '/images/process/step-01-select-service.webp',
        alt: 'Hai người điều khiển đội mũ bảo hộ đứng trước UAV cánh cố định tại một điểm ngắm cảnh trên núi.',
        caption: 'Tổ bay chuẩn bị trước chuyến khảo sát tại Tanbark Ridge.',
        source: 'https://www.usgs.gov/media/images/uncrewed-aircraft-pilots-tanbark-ridge-overlook',
        credit: 'Geosciences and Environmental Change Science Center / USGS'
    },
    stepPlanning: {
        src: '/images/process/step-02-gis-planning.webp',
        alt: 'UAV đang bay trên đường băng cỏ, một người điều khiển và một người theo dõi màn hình trạm mặt đất.',
        caption: 'Theo dõi đường bay trên màn hình trạm mặt đất trong buổi huấn luyện.',
        source: 'https://www.usgs.gov/media/images/uas-training-fort-collins',
        credit: 'Amy A. Yackel Adams / USGS'
    },
    stepPrep: {
        src: '/images/process/step-03-dispatch-prep.webp',
        alt: 'Kỹ thuật viên mặc áo phản quang cúi kiểm tra UAV đa cánh trên bãi đáp, phía sau là sườn đồi rừng.',
        caption: 'Kiểm tra UAV trước chuyến bay chụp ảnh lập bản đồ, Tahoe.',
        source: 'https://www.usgs.gov/media/images/preflight-checks-mosquito',
        credit: 'Isaac Anderson / USGS'
    },
    stepRtk: {
        src: '/images/process/step-04-inflight-rtk.webp',
        alt: 'Người điều khiển đội mũ bảo hộ đứng trên sườn đồi, UAV đang bay gần giá đặt thiết bị GPS, bên cạnh là bàn làm việc có laptop.',
        caption: 'Bay khảo sát vùng sạt lở Mud Creek với thiết bị GPS mặt đất.',
        source: 'https://www.usgs.gov/media/images/drone-operations-big-sur-landslide-october-12-2017',
        credit: 'Pacific Coastal and Marine Science Center / USGS'
    },
    stepOrthomosaic: {
        src: '/images/process/step-05-data-handover.webp',
        alt: 'Hai dải ảnh bờ biển đặt cạnh nhau: ảnh trực giao màu thật và mô hình độ cao tô màu.',
        caption: 'Ảnh trực giao và mô hình độ cao bờ biển Post Point, Washington.',
        source: 'https://www.usgs.gov/media/images/examples-orthomosaic-imagery-and-digital-surface-model',
        credit: 'Pacific Coastal and Marine Science Center / USGS'
    },
    researchTeam: {
        src: '/images/about/vju-research-banner.webp',
        alt: 'Ảnh chụp từ UAV: ba nhà nghiên cứu đứng ở điểm quan sát trên một mỏ đá giữa vùng đồi.',
        caption: 'Nhóm nghiên cứu tại mỏ đá Marsh-Felch, ảnh do UAV chụp.',
        source: 'https://www.usgs.gov/media/images/group-photo-captured-using-a-drone-standing-overlook-marsh-felch-quarry',
        credit: 'Geosciences and Environmental Change Science Center / USGS'
    },
    fieldCommand: {
        src: '/images/contact/command-desk-field.webp',
        alt: 'Trạm làm việc dưới lều ngoài hiện trường, có xe, giá thiết bị và UAV đang bay, hai người điều khiển đứng gần.',
        caption: 'Trạm điều hành dã chiến của tổ bay, New Mexico.',
        source: 'https://www.usgs.gov/media/images/drone-gamma-ray-spectrometer',
        credit: 'Geosciences and Environmental Change Science Center / USGS'
    },
    aboutPreflight: {
        src: '/images/about/sop-preflight.webp',
        alt: 'Kỹ thuật viên dùng laptop chuẩn bị một UAV đa cánh cỡ lớn trước chuyến bay bên bờ sông.',
        caption: 'Chuẩn bị UAV trước chuyến bay bên sông Clackamas, Oregon.',
        source: 'https://www.usgs.gov/media/images/hydrologist-preps-drone-flight',
        credit: 'Oregon Water Science Center / USGS'
    },
    aboutGnssBase: {
        src: '/images/about/rtk-base-station.webp',
        alt: 'Hai người dựng trạm gốc GNSS trên nền sỏi cạnh đầm lầy.',
        caption: 'Dựng trạm gốc GNSS để hiệu chỉnh quỹ đạo bay, Great Sippewissett Marsh.',
        source: 'https://www.usgs.gov/media/images/suas-lidar-training-14',
        credit: 'USGS'
    },
    aboutSensorPayload: {
        src: '/images/about/sensor-payload.webp',
        alt: 'UAV đa cánh mang thiết bị radar màu trắng bay sát mặt sông.',
        caption: 'UAV mang radar xuyên đất bay khảo sát lòng sông Androscoggin.',
        source: 'https://www.usgs.gov/media/images/usgs-tests-drone-based-ground-penetrating-radar-bathymetry',
        credit: 'Pennsylvania Water Science Center / USGS'
    },
    aboutPilotTeam: {
        src: '/images/about/pilot-team.webp',
        alt: 'Nhóm tám người điều khiển UAV chụp ảnh chung trên nền dung nham, phía sau là ánh lửa núi lửa.',
        caption: 'Nhóm người điều khiển UAV tại Kīlauea, Hawaii.',
        source: 'https://www.usgs.gov/media/images/uas-pilots-kilauea',
        credit: 'Woods Hole Coastal and Marine Science Center / USGS'
    },
    aboutPortalCustomer: {
        src: '/images/about/portal-customer.webp',
        alt: 'Hai nhà khoa học cầm bộ điều khiển đứng cạnh UAV đặt trên bãi đáp ở bãi đỗ xe ven biển.',
        caption: 'Bay theo dõi biến đổi bờ biển tại bãi Nauset, Massachusetts.',
        source: 'https://www.usgs.gov/media/images/hurricane-lee-drone-imagery',
        credit: 'Mira Anderberg / USGS'
    },
    aboutPortalOperations: {
        src: '/images/about/portal-operations.webp',
        alt: 'Bốn kỹ thuật viên mặc áo phản quang ngước nhìn theo UAV đang bay, một người cầm bộ điều khiển.',
        caption: 'Tổ kỹ thuật theo dõi UAV trong buổi huấn luyện, Maryland.',
        source: 'https://www.usgs.gov/media/images/ngwos-small-drone-training-maryland',
        credit: 'Maryland-Delaware-D.C. Water Science Center / USGS'
    },
    aboutPortalAdmin: {
        src: '/images/about/portal-admin.webp',
        alt: 'Người điều khiển nằm trên đường băng gắn cảm biến vào bụng một UAV.',
        caption: 'Gắn cảm biến vào UAV tại sân bay Grand Junction, Colorado.',
        source: 'https://www.usgs.gov/media/images/securing-sensors-uas',
        credit: 'USGS'
    },
} as const;

export const serviceScenes: Record<string, UavScene> = {
    'uav-rental': 'rentalFleet',
    'aerial-inspection': 'inspectionGrid',
    'aerial-recording': 'recordingCinema',
    'data-collection': 'dataCorridor',
};

export const solutionScenes: Record<string, UavScene> = {
    'managed-uav-operations': 'opsCommand',
    'infrastructure-inspection': 'infraSurvey',
    'ai-detection': 'edgePayload',
    'search-and-rescue': 'sarResponse',
};

export function UavPhoto({scene, className = '', preload = false, compact = false}: {
    scene: UavScene;
    className?: string;
    preload?: boolean;
    compact?: boolean;
}) {
    const photo = scenes[scene];
    return (
        <figure
            className={`overflow-hidden rounded-2xl border border-border bg-slate-50 ${
                compact ? 'mb-4 rounded-b-none border-0' : 'mb-8'
            } ${className}`}
        >
            <Image
                src={photo.src}
                alt={photo.alt}
                title={`Ảnh tư liệu: ${photo.credit}`}
                width={1536}
                height={1024}
                className="aspect-[3/2] h-auto w-full object-cover"
                sizes={compact ? '(max-width: 700px) 100vw, (max-width: 900px) 50vw, 25vw' : '(max-width: 700px) 100vw, (max-width: 1200px) 60vw, 780px'}
                preload={preload}
            />
            {!compact && (
                <figcaption className="flex flex-wrap items-center justify-between gap-2 bg-card px-5 py-3.5 text-xs text-slate-700">
                    <span>{photo.caption}</span>
                    <a
                        className="text-[11px] font-medium text-slate-500 hover:text-primary"
                        href={photo.source}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Ảnh tư liệu: {photo.credit}
                    </a>
                </figcaption>
            )}
        </figure>
    );
}
