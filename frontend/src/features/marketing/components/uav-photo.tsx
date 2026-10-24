import Image from 'next/image';

const scenes = {
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
} as const;

export type UavScene = keyof typeof scenes;

export const serviceScenes: Record<string, UavScene> = {
    'uav-rental': 'landing',
    'aerial-inspection': 'mapping',
    'aerial-recording': 'field',
    'data-collection': 'survey',
};

export const solutionScenes: Record<string, UavScene> = {
    'uav-rental': 'landing',
    'aerial-inspection': 'mapping',
    'ai-detection': 'tracking',
    'search-and-rescue': 'response',
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
