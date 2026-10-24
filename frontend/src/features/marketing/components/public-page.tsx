import {keepVietnamesePhrases} from "@/lib/typography";
import {customerUrl} from "@/features/marketing/content/site-content";
import {type UavScene, UavPhoto} from "@/features/marketing/components/uav-photo";

export function PublicPage({eyebrow, title, intro, scene, children}: {
    eyebrow: string;
    title: string;
    intro: string;
    scene?: UavScene;
    children: React.ReactNode
}) {
    return <>
        <section className={scene ? 'subhero has-photo' : 'subhero'}>
            <div className="shell">
                <div><p className="eyebrow">{eyebrow}</p><h1>{keepVietnamesePhrases(title)}</h1><p>{intro}</p></div>
                {scene && <UavPhoto scene={scene} preload className="subhero-photo"/>}
            </div>
        </section>
        <section className="section">
            <div className="shell">{children}</div>
        </section>
    </>;
}

export function CustomerCta() {
    return <div className="inline-cta"><p>Bạn đã sẵn sàng mô tả nhu cầu thực hiện nhiệm vụ?</p><a className="button"
                                                                                                  href={`${customerUrl}/services`}>Xem
        dịch vụ</a></div>;
}
