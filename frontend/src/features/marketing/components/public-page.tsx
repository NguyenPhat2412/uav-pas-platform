import { keepVietnamesePhrases } from "@/lib/typography";
import { customerUrl } from "@/features/marketing/content/site-content";

export function PublicPage({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: React.ReactNode }) {
  return <><section className="subhero"><div className="shell"><p className="eyebrow">{eyebrow}</p><h1>{keepVietnamesePhrases(title)}</h1><p>{intro}</p></div></section><section className="section"><div className="shell">{children}</div></section></>;
}

export function CustomerCta() { return <div className="inline-cta"><p>Bạn đã sẵn sàng mô tả nhu cầu thực hiện nhiệm vụ?</p><a className="button" href={`${customerUrl}/services`}>Xem dịch vụ ↗</a></div>; }
