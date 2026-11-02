import {pageMetadata} from "@/content/marketing/metadata";
import {PublicPage} from "@/components/marketing/PublicPage";
import {scenes} from "@/components/marketing/UavPhoto";

export const metadata = pageMetadata(
    "Nguồn ảnh minh hoạ",
    "Danh sách ảnh minh hoạ dùng trên UAV PAS kèm tác giả, nguồn và giấy phép. Ảnh không phải của dự án.",
    "/credits",
    true
);

// One row per file: several scenes reuse the same photo.
const photos = [...new Map(Object.values(scenes).map(scene => [scene.src, scene])).values()];

function licenseOf(credit: string) {
    return /unsplash/i.test(credit) ? 'Unsplash License' : 'Public Domain';
}

export default function CreditsPage() {
    return (
        <PublicPage
            eyebrow="Nguồn ảnh"
            title="Ảnh minh hoạ và giấy phép."
            intro="UAV PAS là đồ án cá nhân. Mọi ảnh chụp trên trang là ảnh minh hoạ lấy từ nguồn công khai, không phải ảnh của dự án, của trường học hay tổ chức nào."
        >
            <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                        <tr>
                            <th className="px-4 py-3">Ảnh</th>
                            <th className="px-4 py-3">Tác giả</th>
                            <th className="px-4 py-3">Giấy phép</th>
                            <th className="px-4 py-3">Nguồn</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-slate-600">
                        {photos.map(photo => (
                            <tr key={photo.src}>
                                <td className="px-4 py-3">{photo.caption}</td>
                                <td className="px-4 py-3">{photo.credit}</td>
                                <td className="px-4 py-3 whitespace-nowrap">{licenseOf(photo.credit)}</td>
                                <td className="px-4 py-3">
                                    <a className="font-semibold text-primary hover:underline" href={photo.source} target="_blank" rel="noopener noreferrer">
                                        Xem gốc
                                    </a>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </PublicPage>
    );
}
