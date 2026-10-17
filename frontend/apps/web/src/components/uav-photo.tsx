import Image from 'next/image';

const scenes = {
  field: { file: 'uav-field-team', alt: 'Ảnh minh họa hai kỹ sư chuẩn bị UAV và kiểm tra bộ điều khiển tại hiện trường.', caption: 'Phối hợp từ những bước chuẩn bị đầu tiên.' },
  survey: { file: 'uav-survey-team', alt: 'Ảnh minh họa đội khảo sát phối hợp điều khiển UAV và xem dữ liệu trên máy tính bảng.', caption: 'Kết nối góc nhìn từ trên cao với công việc thực địa.' },
  workshop: { file: 'uav-workshop-team', alt: 'Ảnh minh họa kỹ thuật viên cùng kiểm tra UAV trong xưởng trước nhiệm vụ.', caption: 'Con người và thiết bị cùng sẵn sàng cho nhiệm vụ.' },
} as const;

export type UavScene = keyof typeof scenes;

export const serviceScenes: Record<string, UavScene> = {
  'uav-rental': 'workshop',
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
    <Image src={`/images/uav-people/${photo.file}.webp`} alt={photo.alt} width={1536} height={1024}
      sizes={compact ? '(max-width: 700px) 100vw, (max-width: 900px) 50vw, 25vw' : '(max-width: 700px) 100vw, (max-width: 1200px) 60vw, 780px'}
      preload={preload} />
    {!compact && <figcaption><span>{photo.caption}</span><span className="uav-photo-note">Ảnh minh họa</span></figcaption>}
  </figure>;
}
