import { pageMetadata } from '../../src/content/metadata';
export const metadata = pageMetadata("UAV solutions", "Explore rental and inspection workflows, plus planned AI and search and rescue applications.", "/solutions", true);
import Link from 'next/link';
import { solutions } from '../../src/content/site-content';
import { PublicPage } from '../../src/components/public-page';
export default function SolutionsPage(){return <PublicPage eyebrow="Solutions" title="A capability map for different mission outcomes." intro="Explore existing request workflows and planned applications. Resource availability and mission authorisation require operations review."><div className="detail-grid">{solutions.map((item)=><Link className="detail-card" href={`/solutions/${item.slug}`} key={item.slug}><span className={`status status-${item.status.toLowerCase()}`}>{item.status==='AVAILABLE'?'Request workflow available':item.status}</span><h2>{item.title}</h2><p>{item.text}</p></Link>)}</div></PublicPage>}
