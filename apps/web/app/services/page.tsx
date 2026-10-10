import { pageMetadata } from '../../src/content/metadata';
export const metadata = pageMetadata("UAV services", "Explore supported mission categories and confirm the active catalogue in the Customer Portal.", "/services", true);
import Link from 'next/link';
import { services } from '../../src/content/site-content';
import { PublicPage, CustomerCta } from '../../src/components/public-page';
export default function ServicesPage(){return <PublicPage eyebrow="Services" title="Choose a mission starting point." intro="These are supported request categories, not live availability listings. Sign in to see the active catalogue; operations confirms scope and feasibility."><div className="detail-grid">{services.map((item)=><Link className="detail-card" href={`/services/${item.slug}`} key={item.slug}><span className="status">Request workflow available</span><h2>{item.title}</h2><p>{item.text}</p><span className="text-link">View details ↗</span></Link>)}</div><CustomerCta/></PublicPage>}
