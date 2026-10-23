import {keepVietnamesePhrases} from "@/lib/typography";
import {pageMetadata} from "@/features/marketing/content/metadata";
import Image from 'next/image';
import Link from 'next/link';
import {capabilities, customerUrl, readinessLabels, steps} from "@/features/marketing/content/site-content";
import {HeroDroneScene} from "@/features/marketing/components/home-hero-drone-scene";
import {HistoryTimeline} from "@/features/marketing/components/home-history-timeline";
import {DroneAnatomy} from "@/features/marketing/components/home-drone-anatomy";
import {MissionPlanner} from "@/features/marketing/components/home-mission-planner";
import {ProcessRoute} from "@/features/marketing/components/home-process-route";
import {fieldTeam, pilotFromAbove} from "@/features/marketing/content/home-content";

export const metadata = pageMetadata(
    "UAV PAS | Nền tảng điều phối nhiệm vụ",
    "Tìm hiểu quy trình nhiệm vụ UAV, các loại yêu cầu được hỗ trợ và tính năng dự kiến.",
    "/",
    true
);

const available = capabilities.filter((item) => item.status === 'AVAILABLE');
const upcoming = capabilities.filter((item) => item.status !== 'AVAILABLE');
const keepTogether = (text: string) => text.replaceAll(' ', ' ');

function SectionHead({eyebrow, jp, title, text, id}: { eyebrow: string; jp: string; title: string; text: string; id: string }) {
    return <div className="home-head">
        <div>
            <p className="home-eyebrow">{eyebrow}<span lang="ja">{jp}</span></p>
            <h2 id={id}>{keepVietnamesePhrases(title)}</h2>
        </div>
        <p>{text}</p>
    </div>;
}

export default function Page() {
    return <div className="home">
        <section className="home-hero" aria-labelledby="home-hero-title">
            <div className="shell home-hero-grid">
                <div className="home-hero-copy">
                    <div className="home-vju">
                        <Image src="/vju-logo.svg" alt="Biểu trưng Trường Đại học Việt Nhật" width={44} height={44} priority unoptimized/>
                        <div>
                            <strong>Trường Đại học Việt Nhật</strong>
                            <span>ĐHQGHN · <span lang="ja">日越大学</span></span>
                        </div>
                    </div>
                    <h1 id="home-hero-title">{keepVietnamesePhrases('Từ mục tiêu nhiệm vụ đến ')}<em>{keepTogether('kế hoạch bay')}</em>{keepVietnamesePhrases(' rõ ràng.')}</h1>
                    <p className="home-lede">Gửi yêu cầu khảo sát, quay chụp hay thu thập dữ liệu. Đội vận hành xem xét, điều phối UAV, người điều khiển và trạm cất hạ cánh cho từng nhiệm vụ.</p>
                    <div className="home-actions">
                        <a className="button" href={`${customerUrl}/register`}>Bắt đầu yêu cầu <span className="button-arrow" aria-hidden="true">→</span></a>
                        <Link className="button button-quiet" href="/how-it-works">Tìm hiểu quy trình</Link>
                    </div>
                </div>
                <HeroDroneScene/>
            </div>
        </section>

        <section className="home-why" aria-labelledby="home-why-title">
            <div className="shell">
                <h2 className="sr-only" id="home-why-title">Những gì UAV PAS đã hỗ trợ</h2>
                <div className="home-why-grid">
                    {available.map((item) => (
                        <article key={item.title}>
                            <span className="status">{readinessLabels[item.status]}</span>
                            <h3>{keepVietnamesePhrases(item.title)}</h3>
                            <p>{item.text}</p>
                        </article>
                    ))}
                </div>
                <p className="home-why-next"><span>{readinessLabels.PLANNED}</span>{upcoming.map((item) => item.title).join(' · ')}</p>
            </div>
        </section>

        <section className="home-section home-tint" aria-labelledby="home-missions-title">
            <div className="shell">
                <SectionHead id="home-missions-title" eyebrow="Dịch vụ" jp="任務"
                             title="Bắt đầu từ công việc bạn cần thực hiện."
                             text="Mỗi dịch vụ có một kiểu đường bay riêng. Chọn một dịch vụ để xem UAV sẽ bay như thế nào."/>
                <MissionPlanner/>
            </div>
        </section>

        <section className="home-section" aria-labelledby="home-process-title">
            <div className="shell">
                <SectionHead id="home-process-title" eyebrow="Quy trình thực hiện" jp="流れ"
                             title="Bốn bước để gửi một nhiệm vụ bay."
                             text="Mỗi nhiệm vụ bắt đầu từ một yêu cầu có thể được xem xét, bổ sung và chuyển tới đội vận hành."/>
                <ProcessRoute steps={steps.slice(0, 4)}/>
                <Link className="text-link" href="/how-it-works">Xem chi tiết quy trình →</Link>
            </div>
        </section>

        <section className="home-pilot" aria-labelledby="home-pilot-title">
            <Image src={pilotFromAbove.src} alt={pilotFromAbove.alt} fill sizes="100vw"/>
            <div className="shell home-pilot-copy">
                <p className="home-eyebrow">Góc nhìn từ UAV<span lang="ja">操縦者</span></p>
                <h2 id="home-pilot-title">{keepVietnamesePhrases('Mỗi chuyến bay đều có người điều khiển trên mặt đất.')}</h2>
                <p>Đội vận hành chỉ định người điều khiển cho từng nhiệm vụ, từ lúc kiểm tra trước bay đến khi hạ cánh.</p>
            </div>
            <a className="home-pilot-credit" href={pilotFromAbove.source} target="_blank" rel="noopener noreferrer">{pilotFromAbove.caption} · Ảnh: {pilotFromAbove.credit} ↗</a>
        </section>

        <section className="home-section home-tint" aria-labelledby="home-anatomy-title">
            <div className="shell">
                <SectionHead id="home-anatomy-title" eyebrow="Tìm hiểu UAV" jp="機体の構造"
                             title="Tám bộ phận giữ một chiếc UAV trên không."
                             text="Chọn một điểm trên sơ đồ để xem bộ phận đó làm gì và vì sao nó quan trọng khi lập kế hoạch bay."/>
                <DroneAnatomy/>
            </div>
        </section>

        <HistoryTimeline>
            <div className="shell">
                <SectionHead id="home-history-title" eyebrow="Hành trình UAV · 1888 → nay" jp="歴史"
                             title="Hơn một thế kỷ nhìn từ trên cao."
                             text="Từ chiếc máy ảnh treo trên diều đến drone khảo sát ngày nay. Vuốt ngang hoặc dùng nút mũi tên để xem các mốc."/>
            </div>
        </HistoryTimeline>

        <section className="home-section home-tint" aria-labelledby="home-field-title">
            <div className="shell">
                <SectionHead id="home-field-title" eyebrow="Ngoài thực địa" jp="現場"
                             title="Con người đứng sau mỗi chuyến bay."
                             text="Người điều khiển, quan sát viên và đội khảo sát cùng chuẩn bị, theo dõi và kiểm tra từng chuyến bay."/>
                <div className="home-field">
                    {fieldTeam.map((photo) => (
                        <figure className={`home-photo is-${photo.layout}`} key={photo.src}>
                            <Image src={photo.src} alt={photo.alt} fill sizes={photo.layout === 'wide' ? '(max-width: 900px) 100vw, 66vw' : '(max-width: 900px) 100vw, 33vw'}/>
                            <figcaption>{photo.caption}<a href={photo.source} target="_blank" rel="noopener noreferrer">Ảnh: {photo.credit} ↗</a></figcaption>
                        </figure>
                    ))}
                </div>
                <p className="home-note">Ảnh tư liệu thuộc phạm vi công cộng của Cục Khảo sát Địa chất Hoa Kỳ (USGS).</p>
            </div>
        </section>

        <section className="home-cta" aria-labelledby="home-cta-title">
            <div className="shell home-cta-inner">
                <div>
                    <h2 id="home-cta-title">{keepVietnamesePhrases('Mô tả nhiệm vụ. Đội vận hành lo phần bay.')}</h2>
                    <p>Tạo tài khoản, gửi yêu cầu đầu tiên và theo dõi trạng thái điều phối ngay trong cổng khách hàng.</p>
                </div>
                <div className="home-cta-actions">
                    <a className="button button-light" href={`${customerUrl}/register`}>Tạo tài khoản <span className="button-arrow" aria-hidden="true">↗</span></a>
                    <Link className="home-cta-link" href="/services">Xem tất cả dịch vụ</Link>
                </div>
                <Image className="home-cta-mark" src="/vju-logo.svg" alt="" width={360} height={360} aria-hidden="true" unoptimized/>
            </div>
        </section>
    </div>;
}
