import Image from 'next/image';

const scenes = {
  field: { file: 'usgs-yosemite-preflight', alt: 'Phi công USGS kiểm tra UAV trên bãi cất cánh tại Yosemite.', caption: 'Chuẩn bị UAV trước chuyến bay tại Yosemite.', source: 'https://www.usgs.gov/media/images/readying-uas-flight-yosemite-national-park', credit: 'USGS' },
  survey: { file: 'usgs-golden-survey', alt: 'UAV và đội khảo sát USGS thu thập dữ liệu trên cánh đồng tại Golden, Colorado.', caption: 'Bay khảo sát, thu thập dữ liệu tại Golden, Colorado.', source: 'https://www.usgs.gov/media/images/collecting-data-using-uncrewed-aircraft-systems-uas', credit: 'USGS' },
  team: { file: 'usgs-plum-island-team', alt: 'Nhóm khảo sát vận hành bộ điều khiển UAV và theo dõi chuyến bay tại Plum Island.', caption: 'Nhóm vận hành trong chuyến khảo sát tại Plum Island.', source: 'https://www.usgs.gov/media/images/uas-imagery-collected-plum-island', credit: 'Sandy Brosnahan / USGS' },
} as const;

export type UavScene = keyof typeof scenes;

export const serviceScenes: Record<string, UavScene> = {
  'uav-rental': 'field',
  'aerial-inspection': 'survey',
  'aerial-recording': 'field',
  'data-collection': 'survey',
};

export function UavPhoto({ scene, className = '', preload = false, compact = false }: {
  scene: UavScene;
  className?: string;
  preload?: boolean;
  compact?: boolean;
}) {
  const photo = scenes[scene];
  return <figure className={`uav-photo ${compact ? 'uav-photo-compact' : ''} ${className}`}>
    <Image src={`/images/uav-photos/${photo.file}.webp`} alt={photo.alt} title={`Ảnh tư liệu: ${photo.credit}`} width={1536} height={1024}
      sizes={compact ? '(max-width: 700px) 100vw, (max-width: 900px) 50vw, 25vw' : '(max-width: 700px) 100vw, (max-width: 1200px) 60vw, 780px'}
      preload={preload} />
    {!compact && <figcaption><a className="uav-photo-note" href={photo.source} target="_blank" rel="noopener noreferrer">Ảnh tư liệu: {photo.credit} ↗</a></figcaption>}
  </figure>;
}
