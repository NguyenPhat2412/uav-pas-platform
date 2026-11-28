import Image from 'next/image';
import type {UavScene} from '@/types/marketing.types';

export type {UavScene};

/**
 * Curated clean photos currently displayed on public pages (zero third-party shirt/vehicle logos).
 * Public-domain attributions are listed centrally at `/credits`.
 */
export const scenes = {
    field: {
        src: '/images/hero-slides/uav-hero-1.webp',
        alt: 'Thiết bị bay UAV bốn cánh quạt đang bay ổn định ngoài hiện trường.',
        caption: 'Thiết bị bay UAV đa cánh quạt ngoài hiện trường.',
        source: 'https://unsplash.com',
        credit: 'Unsplash',
    },
    opsCommand: {
        src: '/images/hero-slides/uav-hero-2.webp',
        alt: 'UAV gắn cụm camera quay chụp đang bay theo lộ trình.',
        caption: 'Giám sát lộ trình và thông số chuyến bay UAV.',
        source: 'https://unsplash.com',
        credit: 'Unsplash',
    },
    heroSlide3: {
        src: '/images/hero-slides/uav-hero-3.webp',
        alt: 'UAV mang camera bay khảo sát trên nền rừng xanh.',
        caption: 'UAV khảo sát khu vực địa hình rừng và hạ tầng.',
        source: 'https://unsplash.com',
        credit: 'Unsplash',
    },
    rentalFleet: {
        src: '/images/services/uav-rental-fleet.webp',
        alt: 'Kỹ thuật viên ghi chép bên cạnh một UAV đa cánh cỡ lớn trên đường băng.',
        caption: 'Chuẩn bị đội hình UAV trước đợt bay khảo sát tại EROS, South Dakota.',
        source: 'https://www.usgs.gov/media/images/national-uncrewed-systems-office-brings-drones-eros-exercise',
        credit: 'EROS Center / USGS',
    },
    inspectionGrid: {
        src: '/images/services/aerial-inspection-grid.webp',
        alt: 'UAV gắn camera trên gimbal bay sát thân cột đá của một công trình cao.',
        caption: 'Bay chụp sát công trình phục vụ kiểm tra bề mặt và dựng mô hình 3D.',
        source: 'https://www.usgs.gov/media/images/uas-sony-a7r-gremsy-gimbal-manually-flown-supplement-imagery-perry-victory-and',
        credit: 'Geosciences and Environmental Change Science Center / USGS',
    },
    recordingCinema: {
        src: '/images/services/aerial-recording-cinema.webp',
        alt: 'Bóng một UAV đang bay trên dãy đồi rừng lúc hoàng hôn.',
        caption: 'UAV bay ghi hình toàn cảnh khu vực đồi rừng lúc hoàng hôn.',
        source: 'https://www.usgs.gov/media/images/drone-sunset',
        credit: 'National Innovation Center / USGS',
    },
    dataCorridor: {
        src: '/images/solutions/infra-3d-survey.webp',
        alt: 'UAV lập bản đồ cất cánh thẳng đứng cho đợt bay thu thập dữ liệu địa hình.',
        caption: 'Bay thu thập dữ liệu địa hình và hành lang hạ tầng.',
        source: 'https://www.usgs.gov/media/images/assessing-road-damage-caused-hurricane-helene',
        credit: 'Geosciences and Environmental Change Science Center / USGS',
    },
    infraSurvey: {
        src: '/images/solutions/infra-3d-survey.webp',
        alt: 'UAV cánh cố định cất cánh thẳng đứng từ bãi đáp trên tuyến đường khảo sát.',
        caption: 'Khảo sát hiện trạng tuyến đường và địa hình bằng UAV lập bản đồ.',
        source: 'https://www.usgs.gov/media/images/assessing-road-damage-caused-hurricane-helene',
        credit: 'Geosciences and Environmental Change Science Center / USGS',
    },
    edgePayload: {
        src: '/images/solutions/edge-ai-kv260-tracking.webp',
        alt: 'UAV đa cánh nhìn từ dưới lên, mang cụm cảm biến gắn dưới thân.',
        caption: 'UAV mang cụm cảm biến đa phổ và LiDAR gắn dưới thân.',
        source: 'https://www.usgs.gov/media/images/drone-hyperspectral-imaging-payload-integrated-lidar-sensor',
        credit: 'Geosciences and Environmental Change Science Center / USGS',
    },
    sarResponse: {
        src: '/images/solutions/sar-emergency-response.webp',
        alt: 'Người điều khiển đội mũ bảo hộ chuẩn bị UAV khảo sát hiện trạng đường sau bão.',
        caption: 'Chuẩn bị UAV đánh giá hiện trường và hỗ trợ tìm kiếm cứu nạn.',
        source: 'https://www.usgs.gov/media/images/preparing-assess-road-damage-using-a-drone',
        credit: 'Geosciences and Environmental Change Science Center / USGS',
    },
    stepOrthomosaic: {
        src: '/images/process/step-05-data-handover.webp',
        alt: 'Hai dải ảnh bờ biển đặt cạnh nhau: ảnh trực giao màu thật và mô hình độ cao tô màu.',
        caption: 'Sản phẩm bàn giao mẫu: bình đồ trực giao và mô hình độ cao số.',
        source: 'https://www.usgs.gov/media/images/examples-orthomosaic-imagery-and-digital-surface-model',
        credit: 'Pacific Coastal and Marine Science Center / USGS',
    },
    fieldCommand: {
        src: '/images/contact/command-desk-field.webp',
        alt: 'Trạm làm việc ngoài hiện trường với thiết bị định vị và UAV đang bay.',
        caption: 'Trạm điều phối hiện trường theo dõi chuyến bay khảo sát.',
        source: 'https://www.usgs.gov/media/images/drone-gamma-ray-spectrometer',
        credit: 'Geosciences and Environmental Change Science Center / USGS',
    },
} as const satisfies Record<UavScene, {
    src: string;
    alt: string;
    caption: string;
    source: string;
    credit: string;
}>;

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
                width={1536}
                height={1024}
                className="aspect-[3/2] h-auto w-full object-cover"
                sizes={compact ? '(max-width: 700px) 100vw, (max-width: 900px) 50vw, 25vw' : '(max-width: 700px) 100vw, (max-width: 1200px) 60vw, 780px'}
                preload={preload}
            />
            {!compact && (
                <figcaption className="bg-card px-5 py-3.5 text-xs text-slate-700">
                    <span>{photo.caption}</span>
                </figcaption>
            )}
        </figure>
    );
}
